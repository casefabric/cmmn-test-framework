'use strict';

import User from '../../../framework/user'
import CaseService from '../../../framework/service/case/caseservice';
import TaskService from '../../../framework/service/task/taskservice';
import Tenant from '../../../framework/tenant/tenant';
import TenantUser from '../../../framework/tenant/tenantuser';
import TenantService from '../../../framework/service/tenant/tenantservice';
import TestCase from '../../../framework/test/testcase';

const tenantName = 'helloworld';
const platformAdmin = new User('admin');
const user = new User('sending-user');

const tenantService = new TenantService();
const caseService = new CaseService();
const taskService = new TaskService();

export default class TestDiscretionaryItems extends TestCase {
    constructor() {
        super('Test Discretionary Items API');
    }

    async onPrepareTest() {
        const sendingTenantUser = new TenantUser(user.id, ['Sender'], 'sender', 'sender@senders.com');
        const owners = [sendingTenantUser];
        const tenant = new Tenant(tenantName, owners);
        await platformAdmin.login();
        await tenantService.createTenant(platformAdmin, tenant);
    }

    async run() {
        const startCase = { tenant: tenantName, definition: 'planning.xml'};

        await user.login();

        let caseInstance = await caseService.startCase(startCase, user);
        caseInstance = await caseService.getCase(caseInstance, user);

        // console.log("Plan items first is: ", caseInstance.planitems)

        const tasks = await taskService.getCaseTasks(caseInstance, user);
        const numTasksBeforePlanning = tasks.length;


        const discretionaries = await caseService.getDiscretionaryItems(caseInstance, user);
        // console.log('Found discretionary items: ', discretionaries.map(item => {return {name: item.name, type: item.type}}));

        const numItems = discretionaries.length;

        if (numItems == 0) {
            console.log('Discretionary items not present?! Canceling further test case');
            return;
        }

        const newItem = discretionaries[0];
        const plannedItem = await caseService.planDiscretionaryItem(caseInstance, user, newItem);
        console.log("Planned item: "+plannedItem)

        caseInstance = await caseService.getCase(caseInstance, user);
        // console.log("Plan items now is: ", caseInstance.planitems)

        const newSetOfTasks = await taskService.getCaseTasks(caseInstance, user);
        console.log("Old number of tasks: "+numTasksBeforePlanning+", new number after planning: "+newSetOfTasks.length)
    }
}
