"use strict";

import User from '../framework/user'
import CaseInstance from '../framework/cmmn/case'
import CaseService from '../framework/service/caseservice';
import TaskService from '../framework/service/taskservice';
import Task from '../framework/cmmn/task';
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
        console.log("Created tenant ;)")
    }

    async run() {
        await this.setupTenantInformation();

        const caseInput = {
            Greeting: {
                Message: 'Hellow there',
                To: sendingUser.id
            }
        };
        const caseInstance = new CaseInstance('helloworld.xml', 'helloworld', caseInput)
        const taskOutput = {
            "Response": {
                "Message": "Toedeledoki"
            }
        };

        await sendingUser.login();
        console.log("User logged in");

        await caseService.start(caseInstance, sendingUser);
        console.log("Started case. Now getting case instance")

        await caseService.getCase(caseInstance, sendingUser);
        console.log("Got the case");

        const taskName = 'Receive Greeting and Send response';
        const receiveGreetingTask = caseInstance.planItems.find(p => p.name === taskName);
        if (! receiveGreetingTask) {
            throw new Error('Cannot find task "'+taskName+'"');
        }
        const task = new Task(receiveGreetingTask);
        await taskService.claim(task, sendingUser);
        console.log("Claimed task");

        await caseService.getCase(caseInstance, sendingUser);
        console.log("Refreshed case information. Task should be claimed. But check yourself please...")

        await taskService.complete(task, sendingUser, taskOutput);
        console.log("So, so;", caseInstance);

        await caseService.getCase(caseInstance, sendingUser);
        console.log("Refreshed case information. Task should be claimed. But check yourself please...")
    }
}

