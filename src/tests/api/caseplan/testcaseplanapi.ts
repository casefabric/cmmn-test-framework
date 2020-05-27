'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CasePlanService from '../../../framework/service/case/caseplanservice';
import PlanItem from '../../../framework/cmmn/planitem';

const repositoryService = new RepositoryService();
const definition = 'eventlistener.xml';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

const casePlanService = new CasePlanService();

export default class TestCasePlanAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, user, tenant);
    }

    async run() {
        const startCase = { tenant, definition };

        const caseInstance = await caseService.startCase(startCase, user);
        await caseService.getCase(caseInstance, user);
        
        const planItems = await casePlanService.getPlanItems(caseInstance, user);
        // console.log("PLanItems: " + planItems)

        const eventItem = planItems.find((item: PlanItem) => item.name === 'PlainUserEvent')
        if (! eventItem) {
            throw new Error('Failed to find event listener plan item with name PlainUserEvent in list ' + JSON.stringify(planItems, undefined, 2));
        }

        const planItem = await casePlanService.getPlanItem(caseInstance, user, eventItem.id);
        // console.log("PLanItem: " + planItem)

        const history = await casePlanService.getPlanItemHistory(caseInstance, user, planItem.id);
        // console.log("History: " + history)
        if (history.length !== 2) {
            throw new Error(`Expected 2 history items for the UserEvent ${planItem.name} but found ${history.length}`);
        }

        await casePlanService.makePlanItemTransition(caseInstance, user, planItem.id, 'Occur');

        await casePlanService.getPlanItems(caseInstance, user).then(items => {
            if (! items.find((item: PlanItem) => item.name === 'T1')) {
                throw new Error(`Expected a plan item with name 'T1' but it was not found`)
            }
        });

        await caseService.getCase(caseInstance, user).then(caze => {
            console.log('Resulting case: ' + JSON.stringify(caze, undefined, 2));
        });

    }
}
