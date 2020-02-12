'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TaskService from '../../../framework/service/task/taskservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';

const caseService = new CaseService();
const taskService = new TaskService();
const repositoryService = new RepositoryService();

const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;
const definition = 'planning.xml';

export default class TestDiscretionaryItems extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, user, tenant);
    }

    async run() {
        const startCase = { tenant, definition };

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
        console.log("Planned item: " + plannedItem)

        caseInstance = await caseService.getCase(caseInstance, user);
        // console.log("Plan items now is: ", caseInstance.planitems)

        const newSetOfTasks = await taskService.getCaseTasks(caseInstance, user);
        console.log("Old number of tasks: " + numTasksBeforePlanning + ", new number after planning: " + newSetOfTasks.length)
    }
}
