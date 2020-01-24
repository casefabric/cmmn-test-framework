'use strict';

import CaseService from '../../framework/service/case/caseservice';
import TaskService from '../../framework/service/task/taskservice';
import TestCase from '../../framework/test/testcase';
import WorldWideTestTenant from '../worldwidetesttenant';

const caseService = new CaseService();
const taskService = new TaskService();
const tenant = new WorldWideTestTenant();
const tenantName = tenant.name;
const sender = tenant.sender;
const receiver = tenant.receiver;

export default class TestHelloworld extends TestCase {
    constructor() {
        super('Hello World');
    }

    async onPrepareTest() {
        console.log('Setting up tenant information for test case helloworld')
        await tenant.create();
    }

    async run() {
        const startCaseInput = {
            Greeting: {
                Message: 'Hello there',
                From: sender.id
            }
        };
        const startCase = { tenant: tenantName, definition: 'helloworld.xml', inputs: startCaseInput};
        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };

        await sender.login();
        await receiver.login();

        let caseInstance = await caseService.startCase(startCase, sender);
        caseInstance = await caseService.getCase(caseInstance, sender);

        // Simple test
        const availableTasks = await taskService.getTasks(sender, { tenant: tenantName, taskState: 'Unassigned' });
        console.log('We have ' + availableTasks.length + ' unassigned tasks in tenant ' + tenantName);

        await taskService.getTasks(sender, { tenant: tenantName, taskState: 'Unassigned' });

        // 
        const cases = await caseService.getCases(sender, { tenant: tenantName, numberOfResults: 10000});
        console.log("We have "+cases.length+" cases ...");

        const taskName = 'Receive Greeting and Send response';
        const planItem = caseInstance.planitems.find(p => p.name === taskName);
        if (!planItem) {
            throw new Error('Cannot find task ' + taskName);
        }

        const tasks = await taskService.getCaseTasks(caseInstance, sender);
        const receiveGreetingTask = tasks.find(task => task.taskName === taskName);
        if (!receiveGreetingTask) {
            throw new Error('Cannot find task ' + taskName);
        }

        if (!sameJSON(receiveGreetingTask.input, startCaseInput)) {
            throw new Error('Task input is not the same as given to the case');
        }

        await taskService.claimTask(receiveGreetingTask, sender);
        caseInstance = await caseService.getCase(caseInstance, sender);

        await taskService.revokeTask(receiveGreetingTask, sender);

        await caseService.changeDebugMode(caseInstance, sender, true);
        await caseService.changeDebugMode(caseInstance, sender, false);

        await taskService.assignTask(receiveGreetingTask, sender, receiver);

        await taskService.revokeTask(receiveGreetingTask, receiver);

        await taskService.claimTask(receiveGreetingTask, receiver);

        await taskService.delegateTask(receiveGreetingTask, receiver, sender);

        await taskService.revokeTask(receiveGreetingTask, sender);

        await taskService.getTask(receiveGreetingTask, sender);

        // TODO: below 3 statements are not working currently, because of bug #24 in the cafienne-engine

        // await taskService.revokeTask(receiveGreetingTask, receivingUser);
        // await taskService.getTask(receiveGreetingTask, sendingUser).then(task => console.log("Task after second revoke: ", task));
        // await taskService.claimTask(receiveGreetingTask, receivingUser);

        await taskService.completeTask(receiveGreetingTask, receiver, taskOutput);
        caseInstance = await caseService.getCase(caseInstance, sender);

        // Validate whether Receive Greeting is in Completed state. It can be done in 2 ways.
        const completedTask = await taskService.getTask(receiveGreetingTask, sender);
        if (!completedTask.isCompleted()) {
            console.log('Task is expected to be completed, but it is in state ' + receiveGreetingTask.taskState);
        }

        // Check whether task is completed in an alternative way (then instead of checking the result)
        await taskService.getTask(receiveGreetingTask, sender).then(task => {
            if (!task.isCompleted()) throw Error('Task is expected to be completed, but it is in state ' + task.taskState);
        });

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

function sameJSON(obj1: any, obj2: any) {
    // TODO: make this a decent helper function in the framework side of the house
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}