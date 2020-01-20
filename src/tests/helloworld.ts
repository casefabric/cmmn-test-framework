'use strict';

import User from '../framework/user'
import CaseService from '../framework/service/case/caseservice';
import TaskService from '../framework/service/task/taskservice';
import Tenant from '../framework/tenant/tenant';
import TenantUser from '../framework/tenant/tenantuser';
import TenantService from '../framework/service/tenant/tenantservice';
import TestCase from '../framework/test/testcase';

const tenantName = 'helloworld';
const platformAdmin = new User('admin');
const sendingUser = new User('sending-user');
const receivingUser = new User('receiving-user');

const tenantService = new TenantService();
const caseService = new CaseService();
const taskService = new TaskService();

export default class TestHelloworld extends TestCase {
    constructor() {
        super('Hello World');
    }

    async onPrepareTest() {
        console.log('Setting up tenant information for test case helloworld')
        const sendingTenantUser = new TenantUser(sendingUser.id, ['Sender'], 'sender', 'sender@senders.com');
        const receivingTenantUser = new TenantUser(receivingUser.id, ['Receiver'], 'receiver', 'receiver@receivers.com');
        const owners = [sendingTenantUser, receivingTenantUser];
        const tenant = new Tenant(tenantName, owners);
        await platformAdmin.login();
        await tenantService.createTenant(platformAdmin, tenant);
    }

    async run() {
        console.log('Running Helloworld testcase');
        const startCaseInput = {
            Greeting: {
                Message: 'Hello there',
                From: sendingUser.id
            }
        };
        const startCase = { tenant: tenantName, definition: 'helloworld.xml', inputs: startCaseInput};
        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };

        await sendingUser.login();
        await receivingUser.login();

        let caseInstance = await caseService.startCase(startCase, sendingUser);
        caseInstance = await caseService.getCase(caseInstance, sendingUser);

        // Simple test
        const availableTasks = await taskService.getTasks(sendingUser, { tenant: tenantName, taskState: 'Unassigned' });
        console.log('We have ' + availableTasks.length + ' unassigned tasks in tenant ' + tenantName);

        await taskService.getTasks(sendingUser, { tenant: tenantName, taskState: 'Unassigned' });

        // 
        const cases = await caseService.getCases(sendingUser, { tenant: tenantName, numberOfResults: 10000});
        console.log("We have "+cases.length+" cases ...");

        const taskName = 'Receive Greeting and Send response';
        const planItem = caseInstance.planitems.find(p => p.name === taskName);
        if (!planItem) {
            throw new Error('Cannot find task ' + taskName);
        }

        const tasks = await taskService.getCaseTasks(caseInstance, sendingUser);
        const receiveGreetingTask = tasks.find(task => task.taskName === taskName);
        if (!receiveGreetingTask) {
            throw new Error('Cannot find task ' + taskName);
        }

        if (!sameJSON(receiveGreetingTask.input, startCaseInput)) {
            throw new Error('Task input is not the same as given to the case');
        }

        await taskService.claimTask(receiveGreetingTask, sendingUser);
        caseInstance = await caseService.getCase(caseInstance, sendingUser);

        await taskService.revokeTask(receiveGreetingTask, sendingUser);

        await taskService.assignTask(receiveGreetingTask, sendingUser, receivingUser);

        await taskService.revokeTask(receiveGreetingTask, receivingUser);

        await taskService.claimTask(receiveGreetingTask, receivingUser);

        await taskService.delegateTask(receiveGreetingTask, receivingUser, sendingUser);

        await taskService.revokeTask(receiveGreetingTask, sendingUser);

        await taskService.getTask(receiveGreetingTask, sendingUser);

        // TODO: below 3 statements are not working currently, because of bug #24 in the cafienne-engine

        // await taskService.revokeTask(receiveGreetingTask, receivingUser);
        // await taskService.getTask(receiveGreetingTask, sendingUser).then(task => console.log("Task after second revoke: ", task));
        // await taskService.claimTask(receiveGreetingTask, receivingUser);

        await taskService.completeTask(receiveGreetingTask, receivingUser, taskOutput);
        caseInstance = await caseService.getCase(caseInstance, sendingUser);

        // Validate whether Receive Greeting is in Completed state. It can be done in 2 ways.
        const completedTask = await taskService.getTask(receiveGreetingTask, sendingUser);
        if (!completedTask.isCompleted()) {
            console.log('Task is expected to be completed, but it is in state ' + receiveGreetingTask.taskState);
        }

        // Check whether task is completed in an alternative way (then instead of checking the result)
        await taskService.getTask(receiveGreetingTask, sendingUser).then(task => {
            if (!task.isCompleted()) throw Error('Task is expected to be completed, but it is in state ' + task.taskState);
        });

        const nextTasks = await taskService.getCaseTasks(caseInstance, sendingUser);
        const responseTaskName = 'Read response';
        const readResponseTask = nextTasks.find(task => task.taskName === responseTaskName);
        if (!readResponseTask) {
            throw new Error('Cannot find task ' + responseTaskName);
        }
        if (readResponseTask.assignee !== sendingUser.id) {
            throw new Error('Expecting task to be assigned to sending user');
        }
        await taskService.completeTask(readResponseTask, sendingUser);
        caseInstance = await caseService.getCase(caseInstance, sendingUser);

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