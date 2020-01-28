'use strict';

import CaseService from '../../framework/service/case/caseservice';
import TaskService from '../../framework/service/task/taskservice';
import TestCase from '../../framework/test/testcase';
import WorldWideTestTenant from '../worldwidetesttenant';
import RepositoryService from '../../framework/service/case/repositoryservice';
import Util from '../../framework/test/util';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestHelloworld extends TestCase {
    constructor() {
        super('Hello World');
    }

    async onPrepareTest() {
        console.log('Setting up tenant information for test case helloworld')
        await worldwideTenant.create();
        await sender.login();
        await receiver.login();

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
        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };

        let caseInstance = await caseService.startCase(startCase, sender);
        caseInstance = await caseService.getCase(caseInstance, sender);

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
            throw new Error('Cannot find task ' + taskName);
        }

        const tasks = await taskService.getCaseTasks(caseInstance, sender);
        const receiveGreetingTask = tasks.find(task => task.taskName === taskName);
        if (!receiveGreetingTask) {
            throw new Error('Cannot find task ' + taskName);
        }

        if (!Util.sameJSON(receiveGreetingTask.input, inputs)) {
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
