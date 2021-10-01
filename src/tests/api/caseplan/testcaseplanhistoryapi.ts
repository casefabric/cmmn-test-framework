'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import PlanItem from '../../../framework/cmmn/planitem';
import Case from '../../../framework/cmmn/case';
import CaseHistoryService from '../../../framework/service/case/casehistoryservice';
import TaskService from '../../../framework/service/task/taskservice';

const definition = 'helloworld.xml';

const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestCasePlanHistoryAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {

        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: user.id
            }
        };

        const startCase = { tenant, definition, inputs };
        const caseInstance = await CaseService.startCase(user, startCase);
        const planItems = await (await CaseService.getCase(user, caseInstance)).planitems;

        const planHistory = await CaseHistoryService.getCasePlanHistory(user, caseInstance);
        if (planHistory.length !== planItems.length) {
            throw new Error(`Expected ${planItems.length} history items, but found ${planHistory.length}`);
        }

        const firstTaskName = 'Receive Greeting and Send response';
        const secondTaskName = 'Read response';

        const firstPlanItem = this.getPlanItem(planItems, firstTaskName);
        const secondPlanItem = this.getPlanItem(planItems, secondTaskName);

        await this.assertHistoryItems(caseInstance, firstPlanItem, 5);
        await this.assertHistoryItems(caseInstance, secondPlanItem, 4);

        const firstTask = (await TaskService.getCaseTasks(user, caseInstance)).find(task => task.id === firstPlanItem.id);
        if (!firstTask) {
            throw new Error('Could not find task?!');
        }
        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };
        await TaskService.completeTask(user, firstTask, taskOutput);

        await this.assertHistoryItems(caseInstance, firstPlanItem, 6);
        await this.assertHistoryItems(caseInstance, secondPlanItem, 5);

        // Length of case plan history should not have changed.
        await CaseHistoryService.getCasePlanHistory(user, caseInstance).then(casePlanHistory => {
            if (casePlanHistory.length !== planItems.length) {
                throw new Error(`Expected ${planItems.length} history items, but found ${planHistory.length}`);
            }
        });
    }

    getPlanItem(planItems: Array<PlanItem>, name: string): PlanItem {
        const planItem = planItems.find(item => item.name === name);
        if (!planItem) {
            throw new Error(`Expected a plan item named '${name}' but it does not seem to exist`);
        }
        return planItem;
    }

    async assertHistoryItems(caseId: Case | string, planItem: PlanItem, expectedNumber: number) {
        const planItemHistory = await CaseHistoryService.getPlanItemHistory(user, caseId, planItem.id).then(planItemHistory => {
            if (planItemHistory.length !== expectedNumber) {
                throw new Error(`Expected ${expectedNumber} history items for the HumanTask ${planItem.name} but found ${planItemHistory.length}`);
            }
            return planItemHistory;
        });
    }
}
