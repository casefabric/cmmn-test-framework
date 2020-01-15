"use strict";

import User from '../framework/user'
import CaseInstance from '../framework/cmmn/case'
import CaseService from '../framework/service/caseservice';
import TaskService from '../framework/service/taskservice';
import Tenant from '../framework/tenant/tenant';
import TenantUser from '../framework/tenant/tenantuser';
import TenantService from '../framework/service/tenantservice';

const tenantName = 'helloworld';
const platformAdmin = new User('admin');
const sendingUser = new User('sending-user');
const receivingUser = new User('receiving-user');

const tenantService = new TenantService();
const caseService = new CaseService();
const taskService = new TaskService();

export default class TestHelloworld {

    constructor() {
        console.log("Running Helloworld testcase");
        this.run();
    }

    async setupTenantInformation() {
        const sendingTenantUser = new TenantUser(sendingUser, ['Sender'], 'sender', 'sender@senders.com');
        const receivingTenantUser = new TenantUser(receivingUser, ['Receiver'], 'receiver', 'receiver@receivers.com');
        const owners = [sendingTenantUser, receivingTenantUser];
        const tenant = new Tenant(tenantName, owners);
        await platformAdmin.login();

        await tenantService.createTenant(platformAdmin, tenant);
    }

    async run() {
        await this.setupTenantInformation();

        const caseInput = {
            Greeting: {
                Message: 'Hello there',
                From: sendingUser.id
            }
        };
        const caseInstance = new CaseInstance('helloworld.xml', 'helloworld', caseInput)
        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };

        await sendingUser.login();
        await caseService.start(caseInstance, sendingUser);
        await caseService.getCase(caseInstance, sendingUser);

        const taskName = 'Receive Greeting and Send response';
        const receiveGreetingPlanItem = caseInstance.planItems.find(p => p.name === taskName);
        if (!receiveGreetingPlanItem) {
            throw new Error('Cannot find task "' + taskName + '"');
        }

        const tasks = await taskService.getCaseTasks(caseInstance, sendingUser);
        const receiveGreetingTask = tasks.find(task => task.taskName === taskName);
        if (!receiveGreetingTask) {
            throw new Error('Cannot find task "' + taskName + '"');
        }

        if (!sameJSON(receiveGreetingTask.input, caseInput)) {
            throw new Error('Task input is not the same as given to the case');
        }

        await taskService.claimTask(receiveGreetingTask, sendingUser);
        await caseService.getCase(caseInstance, sendingUser);
        await taskService.completeTask(receiveGreetingTask, sendingUser, taskOutput);
        await caseService.getCase(caseInstance, sendingUser);
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
            throw new Error('Cannot find task "' + responseTaskName + '"');
        }
        if (readResponseTask.assignee !== sendingUser.id) {
            throw new Error('Expecting task to be assigned to sending user');
        }
        await taskService.completeTask(readResponseTask, sendingUser);
        await caseService.getCase(caseInstance, sendingUser);

        const casePlan = caseInstance.planItems.find(p => p.type === 'CasePlan')
        if (casePlan?.currentState !== 'Completed') {
            throw new Error('Expecting case to be completed at the end');
        } else {
            console.log("Case completed!")
        }
    }
}

function sameJSON(obj1: any, obj2: any) {
    // TODO: make this a decent helper function in the framework side of the house
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}