'use strict';

import CaseService from '../../framework/service/case/caseservice';
import TaskService from '../../framework/service/task/taskservice';
import TestCase from '../../framework/test/testcase';
import WorldWideTestTenant from '../worldwidetesttenant';
import RepositoryService from '../../framework/service/case/repositoryservice';
import Comparison from '../../framework/test/comparison';
import { SomeTime } from '../../framework/test/time';
import Config from '../../config';
import User from '../../framework/user';
import Task from '../../framework/cmmn/task';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestHelloworld extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, sender, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: sender.id
            }
        };
        const startCase = { tenant, definition, inputs };
        // const startCase = { tenant, definition, inputs, caseInstanceId: 'Ueè' };
        // const startCase = { tenant, definition, inputs, caseInstanceId: tenant };
        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };

        let caseInstance = await caseService.startCase(startCase, sender);
        caseInstance = await caseService.getCase(caseInstance, sender);

        // console.log("CI: "+ caseInstance)
        // return;

        // Simple test
        const availableTasks = await taskService.getTasks(sender, { tenant: tenant, taskState: 'Unassigned' });
        console.log('We have ' + availableTasks.length + ' unassigned tasks in tenant ' + tenant);

        await taskService.getTasks(sender, { tenant: tenant, taskState: 'Unassigned' });

        // 
        const cases = await caseService.getCases(sender, { tenant: tenant, numberOfResults: 10000 });
        console.log("We have " + cases.length + " cases ...");

        const taskName = 'Receive Greeting and Send response';
        const planItem = caseInstance.planitems.find(p => p.name === taskName);
        if (!planItem) {
            throw new Error('Cannot find plan item ' + taskName);
        }

        const tasks = await taskService.getCaseTasks(caseInstance, sender);
        const receiveGreetingTask = tasks.find(task => task.taskName === taskName);
        if (!receiveGreetingTask) {
            throw new Error('Cannot find task ' + taskName);
        }

        if (!Comparison.sameJSON(receiveGreetingTask.input, inputs)) {
            throw new Error('Task input is not the same as given to the case');
        }

        await taskService.claimTask(receiveGreetingTask, sender);
        await assertTask(receiveGreetingTask, 'Claim', 'Assigned', sender, sender);

        caseInstance = await caseService.getCase(caseInstance, sender);

        await taskService.revokeTask(receiveGreetingTask, sender);
        await assertTask(receiveGreetingTask, 'Revoke', 'Unassigned', User.NONE);

        await taskService.assignTask(receiveGreetingTask, sender, receiver);
        await assertTask(receiveGreetingTask, 'Assign', 'Assigned', receiver, receiver);

        await taskService.revokeTask(receiveGreetingTask, receiver);
        await assertTask(receiveGreetingTask, 'Revoke', 'Unassigned', User.NONE);

        await taskService.claimTask(receiveGreetingTask, receiver);
        await assertTask(receiveGreetingTask, 'Claim', 'Assigned', receiver, receiver);

        await taskService.delegateTask(receiveGreetingTask, receiver, sender);
        await assertTask(receiveGreetingTask, 'Delegate', 'Delegated', sender, receiver);

        await taskService.revokeTask(receiveGreetingTask, sender);
        await assertTask(receiveGreetingTask, 'Revoke', 'Assigned', receiver);

        await taskService.revokeTask(receiveGreetingTask, receiver);
        await assertTask(receiveGreetingTask, 'Revoke', 'Unassigned', User.NONE);

        await taskService.claimTask(receiveGreetingTask, receiver);
        await assertTask(receiveGreetingTask, 'Claim', 'Assigned', receiver);

        // User 'sender' may not complete a task assigned to 'receiver' 
        await taskService.completeTask(receiveGreetingTask, sender, taskOutput, false);
        await assertTask(receiveGreetingTask, 'Claim', 'Assigned', receiver);

        await taskService.completeTask(receiveGreetingTask, receiver, taskOutput);
        await assertTask(receiveGreetingTask, 'Complete', 'Completed', receiver);

        caseInstance = await caseService.getCase(caseInstance, sender);

        const nextTasks = await taskService.getCaseTasks(caseInstance, sender);
        const responseTaskName = 'Read response';
        const readResponseTask = nextTasks.find(task => task.taskName === responseTaskName);
        if (!readResponseTask) {
            throw new Error('Cannot find task ' + responseTaskName);
        }
        if (readResponseTask.assignee !== sender.id) {
            throw new Error('Expecting task to be assigned to sending user');
        }
        await taskService.completeTask(readResponseTask, sender);
        caseInstance = await caseService.getCase(caseInstance, sender);

        const casePlan = caseInstance.planitems.find(p => p.type === 'CasePlan')
        if (casePlan?.currentState !== 'Completed') {
            throw new Error('Expecting case to be completed at the end, but it is in state ' + casePlan?.currentState);
        } else {
            console.log('Case completed!')
        }
    }
}

async function assertTask(task: Task, action: string, expectedState: string = '', expectedAssignee?: User, expectedOwner?: User) {
    await taskService.getTask(task, sender).then(task => {
        console.log(`Task after ${action}:\tstate = ${task.taskState},\tassignee = '${task.assignee}',\towner = '${task.owner}' `);
        if (task.taskState !== expectedState) {
            throw new Error(`Task ${task.taskName} is not in state '${expectedState}' but in state '${task.taskState}'`);
        }
        if (expectedAssignee && task.assignee !== expectedAssignee.id) {
            throw new Error(`Task ${task.taskName} is not assigned to '${expectedAssignee}' but to user '${task.assignee}'`);
        }
        if (expectedOwner && task.owner !== expectedOwner.id) {
            throw new Error(`Task ${task.taskName} is not owned by '${expectedAssignee}' but by '${task.assignee}'`);
        }
    });
}