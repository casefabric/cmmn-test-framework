'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TaskService from '../../../framework/service/task/taskservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';

const caseService = new CaseService();
const taskService = new TaskService();
const tenant = new WorldWideTestTenant();
const user = tenant.sender;
const tenantName = tenant.name;

export default class TestDiscretionaryItems extends TestCase {
    constructor() {
        super('Test Discretionary Items API');
    }

    async onPrepareTest() {
        await tenant.create();
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
