'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CasePlanService from '../../../framework/service/case/caseplanservice';
import PlanItem from '../../../framework/cmmn/planitem';
import Case from '../../../framework/cmmn/case';
import CaseHistoryService from '../../../framework/service/case/casehistoryservice';
import TaskService from '../../../framework/service/task/taskservice';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

const casePlanService = new CasePlanService();
const caseHistoryService = new CaseHistoryService();
const taskService = new TaskService();

export default class TestCasePlanHistoryAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: user.id
            }
        };

        const startCase = { tenant, definition, inputs };
        const caseInstance = await caseService.startCase(user, startCase) as Case;
        const planItems = await (await caseService.getCase(user, caseInstance)).planitems;
 
        const planHistory = await caseHistoryService.getCasePlanHistory(user, caseInstance);
        if (planHistory.length !== planItems.length) {
            throw new Error(`Expected ${planItems.length} history items, but found ${planHistory.length}`);
        }

        const firstTaskName = 'Receive Greeting and Send response';
        const secondTaskName = 'Read response';

        const firstPlanItem = this.getPlanItem(planItems, firstTaskName);
        const secondPlanItem = this.getPlanItem(planItems, secondTaskName);

        await this.assertHistoryItems(caseInstance, firstPlanItem, 5);
        await this.assertHistoryItems(caseInstance, secondPlanItem, 4);
        
        const firstTask = (await taskService.getCaseTasks(user, caseInstance)).find(task => task.id === firstPlanItem.id);
        if (! firstTask) {
            throw new Error('Could not find task?!');
        }
        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };
        await taskService.completeTask(user, firstTask, taskOutput);

        await this.assertHistoryItems(caseInstance, firstPlanItem, 6);
        await this.assertHistoryItems(caseInstance, secondPlanItem, 5);

        // Length of case plan history should not have changed.
        await caseHistoryService.getCasePlanHistory(user, caseInstance).then(casePlanHistory => {
            if (casePlanHistory.length !== planItems.length) {
                throw new Error(`Expected ${planItems.length} history items, but found ${planHistory.length}`);
            }
        });
    }

    getPlanItem(planItems: Array<PlanItem>, name: string): PlanItem {
        const planItem = planItems.find(item => item.name === name);
        if (! planItem) {
            throw new Error(`Expected a plan item named '${name}' but it does not seem to exist`);
        }
        return planItem;
    }

    async assertHistoryItems(caseInstance: Case, planItem: PlanItem, expectedNumber: number) {
        const planItemHistory = await caseHistoryService.getPlanItemHistory(user, caseInstance, planItem.id).then(planItemHistory => {
            if (planItemHistory.length !== expectedNumber) {
                throw new Error(`Expected ${expectedNumber} history items for the HumanTask ${planItem.name} but found ${planItemHistory.length}`);
            }
            return planItemHistory;
        });
    }
}
