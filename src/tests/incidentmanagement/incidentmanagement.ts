'use strict';

import CaseService from '../../framework/service/case/caseservice';
import TaskService from '../../framework/service/task/taskservice';
import TestCase from '../../framework/test/testcase';
import WorldWideTestTenant from '../worldwidetesttenant';
import Comparison from '../../framework/test/comparison';
import TaskValidationMock from '../api/task/task-validation-mock';
import RepositoryService from '../../framework/service/case/repositoryservice';
import User from '../../framework/user';
import Task from '../../framework/cmmn/task';
import { ServerSideProcessing } from '../../framework/test/time';
import Case from '../../framework/cmmn/case';
import TenantUser from '../../framework/tenant/tenantuser';
import IncidentContent from './incidentmanagementcontent';

const repositoryService = new RepositoryService();
const definition = 'IncidentManagementForTraining.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const raiser = worldwideTenant.sender;
const solver = worldwideTenant.receiver;

const mockPort = 17384;
const mock = new TaskValidationMock(mockPort);

export default class TestIncidentManagement extends TestCase {
    async onPrepareTest() {
        await mock.start();
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, raiser, tenant);
    }

    async run() {
        const inputs = IncidentContent.inputs;
        const firstTaskInput = IncidentContent.firstTaskInput;
        const startCase = { tenant, definition, inputs };
        const firstTaskName = 'Verify Details';

        await this.testValidStatus(startCase, firstTaskName, firstTaskInput);

        console.log(`\n
#############################################################################
Starting another case instance of incident management to test Invalid status.
#############################################################################
                    `);

        await this.testInvalidStatus(startCase, firstTaskName, firstTaskInput);
    }

    async testValidStatus(startCase: any, firstTaskName: string, firstTaskInput: any) {

        // Starts the case with raiser
        let caseInstance = await caseService.startCase(startCase, raiser);

        // Get case details
        caseInstance = await caseService.getCase(caseInstance, raiser);

        // Get case tasks
        const tasks = await taskService.getCaseTasks(caseInstance, raiser);

        // Get Verify Details task
        const verifyDetailsTask = tasks.find(task => task.taskName === firstTaskName);
        if (!verifyDetailsTask) {
            throw new Error('Cannot find task ' + firstTaskName);
        }
        await verifyTaskInputs(verifyDetailsTask, firstTaskInput);

        // Claim Verify Details task by raiser
        await taskService.claimTask(verifyDetailsTask, raiser);
        await assertTask(verifyDetailsTask, 'Claim', 'Assigned', raiser, raiser);

        const verifyDetailsInputs = IncidentContent.verifyDetailsInputs;

        // Complete Verify Details task by raiser
        await taskService.completeTask(verifyDetailsTask, raiser, verifyDetailsInputs);
        await assertTask(verifyDetailsTask, 'Complete', 'Completed', raiser);

        // Since process completion happens asynchronously in the Cafienne engine, we will still wait 
        //  a second before continuing the test script
        await ServerSideProcessing();

        // Verify completion of Assign Specialist plan item
        await assertPlanItemState(caseInstance, 'Assign Specialist', 0, raiser, 'Completed');

        // Verify completion of Assigned plan item
        await assertPlanItemState(caseInstance, 'Assigned', 0, raiser, 'Completed');

        // Verify completion of first Notify Customer plan item
        await assertPlanItemState(caseInstance, 'Notify Customer', 0, raiser, 'Completed');

        const secondTaskInput = IncidentContent.secondTaskInput;

        // Get case tasks
        const nextTasks = await taskService.getCaseTasks(caseInstance, raiser);

        // Get Work on Incident task
        const secondTaskName = 'Work on Incident';
        const workOnIncidentTask = nextTasks.find(task => task.taskName === secondTaskName);
        if (!workOnIncidentTask) {
            throw new Error('Cannot find task ' + secondTaskName);
        }
        await verifyTaskInputs(workOnIncidentTask, secondTaskInput);

        // Can't claim Work on Incident task by solver as he is assigned to it
        // await taskService.claimTask(workOnIncidentTask, solver);
        await assertTask(workOnIncidentTask, 'Claim', 'Assigned', solver, solver);

        const finalTaskOutput = IncidentContent.finalTaskOutput;

        // raiser may not complete a task assigned to solver
        await taskService.completeTask(workOnIncidentTask, raiser, finalTaskOutput, false);
        await assertTask(workOnIncidentTask, 'Claim', 'Assigned', solver);

        // Complete Work on Incident task by solver
        await taskService.completeTask(workOnIncidentTask, solver, finalTaskOutput);
        await assertTask(workOnIncidentTask, 'Complete', 'Completed', solver);

        // Verify completion of Complete plan item
        await assertPlanItemState(caseInstance, 'Complete', 0, raiser, 'Completed');

        // Verify completion of second Notify Customer plan item
        await assertPlanItemState(caseInstance, 'Notify Customer', 1, raiser, 'Completed');
    }

    async testInvalidStatus(startCase: any, firstTaskName: string, firstTaskInput: any) {

        // Starts the invalid case with raiser
        let caseInstance = await caseService.startCase(startCase, raiser);

        // Get case details
        caseInstance = await caseService.getCase(caseInstance, raiser);

        // Get case tasks
        const tasks = await taskService.getCaseTasks(caseInstance, raiser);

        // Get Verify Details task
        const verifyDetailsTask = tasks.find(task => task.taskName === firstTaskName);
        if (!verifyDetailsTask) {
            throw new Error('Cannot find task ' + firstTaskName);
        }
        await verifyTaskInputs(verifyDetailsTask, firstTaskInput);

        // Claim Verify Details task by raiser
        await taskService.claimTask(verifyDetailsTask, raiser);
        await assertTask(verifyDetailsTask, 'Claim', 'Assigned', raiser, raiser);

        const verifyDetailsInputs = IncidentContent.verifyDetailsInputsInvalidCase;

        // Complete Verify Details task by raiser
        await taskService.completeTask(verifyDetailsTask, raiser, verifyDetailsInputs);
        await assertTask(verifyDetailsTask, 'Complete', 'Completed', raiser);

        // Since process completion happens asynchronously in the Cafienne engine, we will still wait 
        //  a second before continuing the test script
        await ServerSideProcessing();

        // Verify completion of Invalid Status plan item
        await assertPlanItemState(caseInstance, 'Invalid Status', 0, raiser, 'Completed');

        // Verify completion of first Notify Customer plan item
        await assertPlanItemState(caseInstance, 'Notify Customer', 0, raiser, 'Completed');

        // Verify completion of Complete plan item
        await assertPlanItemState(caseInstance, 'Complete', 0, raiser, 'Available');
    }
}

async function assertTask(task: Task, action: string, expectedState: string = '', expectedAssignee?: User, expectedOwner?: User) {
    await taskService.getTask(task, raiser).then(task => {
        console.log(`Task after ${action}:\tstate = ${task.taskState},\tassignee = '${task.assignee}',\towner = '${task.owner}' `);
        if (task.taskState !== expectedState) {
            throw new Error(`Task ${task.taskName} is not in state '${expectedState}' but in state '${task.taskState}'`);
        }
        if (expectedAssignee && task.assignee !== expectedAssignee.id) {
            throw new Error(`Task ${task.taskName} is not assigned to '${expectedAssignee}' but to user '${task.assignee}'`);
        }
        if (expectedOwner && task.owner !== expectedOwner.id) {
            throw new Error(`Task ${task.taskName} is not owned by '${expectedOwner}' but by '${task.owner}'`);
        }
    });
}

async function verifyTaskInputs(task: Task, task_input: any) {
    if (!Comparison.sameJSON(task.input, task_input)) {
        throw new Error('Task input is not the same as given to the case');
    }
}

async function assertPlanItemState(caseInstance: Case, planItemName: string, index: number, user: TenantUser, state: string) {
    // Get case details
    const freshCase = await caseService.getCase(caseInstance, user);
    const planitem = freshCase.planitems.find(p => p.name === planItemName && p.index === index);
    if (planitem?.currentState !== state) {
        throw new Error('The plan item "' + planItemName + '" is expected to be completed, but it is ' + planitem?.currentState);
    }
}