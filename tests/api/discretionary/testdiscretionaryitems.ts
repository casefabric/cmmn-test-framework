'use strict';

import Definitions from '../../definitions/definitions';
import CaseService from '../../../src/service/case/caseservice';
import TaskService from '../../../src/service/task/taskservice';
import TestCase from '../../../src/test/testcase';
import WorldWideTestTenant from '../../../src/tests/setup/worldwidetesttenant';

const definition = Definitions.Planning;
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestDiscretionaryItems extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const startCase = { tenant, definition };

        const caseInstance = await CaseService.startCase(user, startCase).then(async id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);

        // console.log("Plan items first is: ", caseInstance.planitems)

        const tasks = await TaskService.getCaseTasks(user, caseInstance);
        const numTasksBeforePlanning = tasks.length;


        const discretionaries = await CaseService.getDiscretionaryItems(user, caseInstance);
        // console.log('Found discretionary items: ', discretionaries.map(item => {return {name: item.name, type: item.type}}));

        const numItems = discretionaries.discretionaryItems.length;

        if (numItems == 0) {
            console.log('Discretionary items not present?! Canceling further test case');
            return;
        }

        const newItem = discretionaries.discretionaryItems[0];
        const plannedItem = await CaseService.planDiscretionaryItem(user, caseInstance, newItem);
        console.log("Planned item: " + plannedItem)

        await CaseService.getCase(user, caseInstance).then(caseInstance => {
            // console.log("Plan items now is: ", caseInstance.planitems)
        });

        const newSetOfTasks = await TaskService.getCaseTasks(user, caseInstance);
        console.log("Old number of tasks: " + numTasksBeforePlanning + ", new number after planning: " + newSetOfTasks.length)
    }
}
