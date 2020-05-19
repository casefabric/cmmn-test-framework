'use strict';

import CaseService from '../../framework/service/case/caseservice';
import TaskService from '../../framework/service/task/taskservice';
import TestCase from '../../framework/test/testcase';
import WorldWideTestTenant from '../worldwidetesttenant';
import TaskValidationMock from '../api/task/task-validation-mock';
import RepositoryService from '../../framework/service/case/repositoryservice';
import { ServerSideProcessing } from '../../framework/test/time';
import { assertPlanItemState, assertTask, verifyTaskInput } from '../../framework/test/assertions'
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
        // In the end, stop the mock service, such that the test completes.
        await mock.stop();

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
        await verifyTaskInput(verifyDetailsTask, firstTaskInput);

        // Claim Verify Details task by raiser
        await taskService.claimTask(verifyDetailsTask, raiser);
        await assertTask(verifyDetailsTask, raiser, 'Claim', 'Assigned', raiser, raiser);

        const verifyDetailsInputs = IncidentContent.verifyDetailsInputs;

        // Complete Verify Details task by raiser
        await taskService.completeTask(verifyDetailsTask, raiser, verifyDetailsInputs);
        await assertTask(verifyDetailsTask, raiser, 'Complete', 'Completed', raiser);

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
        await verifyTaskInput(workOnIncidentTask, secondTaskInput);

        // Can't claim Work on Incident task by solver as he is assigned to it
        // await taskService.claimTask(workOnIncidentTask, solver);
        await assertTask(workOnIncidentTask, raiser, 'Claim', 'Assigned', solver, solver);

        const finalTaskOutput = IncidentContent.finalTaskOutput;

        // raiser may not complete a task assigned to solver
        await taskService.completeTask(workOnIncidentTask, raiser, finalTaskOutput, false);
        await assertTask(workOnIncidentTask, raiser, 'Claim', 'Assigned', solver);

        // Complete Work on Incident task by solver
        await taskService.completeTask(workOnIncidentTask, solver, finalTaskOutput);
        await assertTask(workOnIncidentTask, raiser, 'Complete', 'Completed', solver);

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
        await verifyTaskInput(verifyDetailsTask, firstTaskInput);

        // Claim Verify Details task by raiser
        await taskService.claimTask(verifyDetailsTask, raiser);
        await assertTask(verifyDetailsTask, raiser, 'Claim', 'Assigned', raiser, raiser);

        const verifyDetailsInputs = IncidentContent.verifyDetailsInputsInvalidCase;

        // Complete Verify Details task by raiser
        await taskService.completeTask(verifyDetailsTask, raiser, verifyDetailsInputs);
        await assertTask(verifyDetailsTask, raiser, 'Complete', 'Completed', raiser);

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

