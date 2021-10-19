'use strict';

import CaseService from '../../../../framework/service/case/caseservice';
import TaskService from '../../../../framework/service/task/taskservice';
import TestCase from '../../../../framework/test/testcase';
import WorldWideTestTenant from '../../../worldwidetesttenant';
import RepositoryService from '../../../../framework/service/case/repositoryservice';
import Comparison from '../../../../framework/test/comparison';
import User from '../../../../framework/user';
import Task from '../../../../framework/cmmn/task';
import Case from '../../../../framework/cmmn/case';

const definition = 'stagetest.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;

export default class TestStage extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(sender, definition, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: sender.id
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

        let caseInstance = await CaseService.startCase(sender, startCase);
        caseInstance = await CaseService.getCase(sender, caseInstance);
        // return;

        const taskName = 'SendResponse';
        const planItem = caseInstance.planitems.find(p => p.name === taskName);
        if (!planItem) {
            throw new Error('Cannot find plan item ' + taskName);
        }

        const tasks = await TaskService.getCaseTasks(sender, caseInstance);
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
    const nextTasks = await TaskService.getCaseTasks(sender, caseId);
    // nextTasks.forEach(t => delete t.taskModel);
    const nextTask = nextTasks.find(task => task.taskName === taskName && task.taskState === 'Unassigned');
    if (!nextTask) {
        const tasks = `Tasks:\n- ${nextTasks.map(task => task.summary()).join('\n- ')}`
        console.log(tasks)
        throw new Error(`Expecting a new task '${taskName}'' in unassigned state`);
    }
    await TaskService.claimTask(sender, nextTask);
    await TaskService.completeTask(sender, nextTask, taskOutput);
    await TaskService.getCaseTasks(sender, caseId).then(tasks => {
        const freshInformationOnNextTask = tasks.find(t => t.id === nextTask.id);
        console.log("NExt task is now: " + freshInformationOnNextTask?.summary());
        if (freshInformationOnNextTask?.taskState !== 'Completed') {
            console.log("That's quite weird!")
        }
    });

}

async function assertTask(task: Task, action: string, expectedState: string = '', expectedAssignee?: User, expectedOwner?: User) {
    await TaskService.getTask(sender, task).then(task => {
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