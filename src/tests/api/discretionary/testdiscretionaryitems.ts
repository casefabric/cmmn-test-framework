'use strict';

import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import TaskService from '@cafienne/typescript-client/service/task/taskservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import Case from '@cafienne/typescript-client/cmmn/case';


const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;
const definition = 'planning.xml';

export default class TestDiscretionaryItems extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const startCase = { tenant, definition };

        let caseInstance = await CaseService.startCase(user, startCase);
        caseInstance = await CaseService.getCase(user, caseInstance);

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

        caseInstance = await CaseService.getCase(user, caseInstance);
        // console.log("Plan items now is: ", caseInstance.planitems)

        const newSetOfTasks = await TaskService.getCaseTasks(user, caseInstance);
        console.log("Old number of tasks: " + numTasksBeforePlanning + ", new number after planning: " + newSetOfTasks.length)
    }
}
