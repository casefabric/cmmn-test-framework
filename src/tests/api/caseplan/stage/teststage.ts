'use strict';

import Case from '../../../../cmmn/case';
import Task from '../../../../cmmn/task';
import CaseService from '../../../../service/case/caseservice';
import RepositoryService from '../../../../service/case/repositoryservice';
import TaskService from '../../../../service/task/taskservice';
import Comparison from '../../../../test/comparison';
import TestCase from '../../../../test/testcase';
import User from '../../../../user';
import WorldWideTestTenant from '../../../worldwidetesttenant';

const definition = 'stagetest.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestStage extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: user.id
            }
        };
        const startCase = { tenant, definition, inputs, debug: true };
        const leftTaskOutput = {
            Response: {
                Message: 'Left',
            }
        };
        const rightTaskOutput = {
            Response: {
                Message: 'Right',
            }
        };

        const caseInstance = await CaseService.startCase(user, startCase).then(async id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);
        // return;

        const taskName = 'SendResponse';
        const planItem = caseInstance.planitems.find(p => p.name === taskName);
        if (!planItem) {
            throw new Error('Cannot find plan item ' + taskName);
        }

        const tasks = await TaskService.getCaseTasks(user, caseInstance);
        const sendResponseTask = tasks.find(task => task.taskName === taskName);
        if (!sendResponseTask) {
            throw new Error('Cannot find task ' + taskName);
        }

        if (!Comparison.sameJSON(sendResponseTask.input, inputs)) {
            throw new Error('Task input is not the same as given to the case');
        }

        await getTasksThenClaimAndCompleteNextTask(caseInstance, leftTaskOutput);
        await getTasksThenClaimAndCompleteNextTask(caseInstance, leftTaskOutput);
        await getTasksThenClaimAndCompleteNextTask(caseInstance, leftTaskOutput);
        await getTasksThenClaimAndCompleteNextTask(caseInstance, rightTaskOutput);

    }
}

async function getTasksThenClaimAndCompleteNextTask(caseId: Case | string, taskOutput: object) {
    const taskName = 'SendResponse';
    const nextTasks = await TaskService.getCaseTasks(user, caseId);
    // nextTasks.forEach(t => delete t.taskModel);
    const nextTask = nextTasks.find(task => task.taskName === taskName && task.taskState === 'Unassigned');
    if (!nextTask) {
        const tasks = `Tasks:\n- ${nextTasks.map(task => task.summary()).join('\n- ')}`
        console.log(tasks)
        throw new Error(`Expecting a new task '${taskName}'' in unassigned state`);
    }
    await TaskService.claimTask(user, nextTask);
    await TaskService.completeTask(user, nextTask, taskOutput);
    await TaskService.getCaseTasks(user, caseId).then(tasks => {
        const freshInformationOnNextTask = tasks.find(t => t.id === nextTask.id);
        console.log("NExt task is now: " + freshInformationOnNextTask?.summary());
        if (freshInformationOnNextTask?.taskState !== 'Completed') {
            console.log("That's quite weird!")
        }
    });

}

async function assertTask(task: Task, action: string, expectedState: string = '', expectedAssignee?: User, expectedOwner?: User) {
    await TaskService.getTask(user, task).then(task => {
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