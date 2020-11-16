'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CasePlanService from '../../../framework/service/case/caseplanservice';
import PlanItem from '../../../framework/cmmn/planitem';
import Case from '../../../framework/cmmn/case';

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

        const caseInstance = await caseService.startCase(user, startCase) as Case;
        await caseService.getCase(user, caseInstance);
        
        const planItems = await casePlanService.getPlanItems(user, caseInstance);

        // Print all plan items - id, type and name.
        console.log(planItems.length +" plan items:\n" + planItems.map(p => `${p.id} - ${p.type} - ${p.name}`).join("\n"))
        // Check that no duplicate plan items are returned. 
        const findDuplicates = planItems.filter((planItem, index) => planItems.findIndex(p => p.id === planItem.id) != index)
        if (findDuplicates.length > 0) {
            throw new Error(`Did not expect to find any duplicate plan items, but found ${findDuplicates.length} duplicate plan items`)
        }

        const eventItem = planItems.find((item: PlanItem) => item.name === 'PlainUserEvent')
        if (! eventItem) {
            throw new Error('Failed to find event listener plan item with name PlainUserEvent in list ' + JSON.stringify(planItems, undefined, 2));
        }

        const planItem = await casePlanService.getPlanItem(user, caseInstance, eventItem.id);
        // console.log("PLanItem: " + planItem)

        const history = await casePlanService.getPlanItemHistory(user, caseInstance, planItem.id);
        // console.log("History: " + history)
        if (history.length !== 2) {
            throw new Error(`Expected 2 history items for the UserEvent ${planItem.name} but found ${history.length}`);
        }

        await casePlanService.makePlanItemTransition(user, caseInstance, planItem.id, 'Occur');

        await casePlanService.getPlanItems(user, caseInstance).then(items => {
            if (! items.find((item: PlanItem) => item.name === 'T1')) {
                throw new Error(`Expected a plan item with name 'T1' but it was not found`)
            }
        });

        await caseService.getCase(user, caseInstance).then(caze => {
            console.log('Resulting case: ' + JSON.stringify(caze, undefined, 2));
        });
    }
}
