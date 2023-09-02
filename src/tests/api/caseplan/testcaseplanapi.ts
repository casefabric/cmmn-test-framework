'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import PlanItem from '../../../cmmn/planitem';
import Transition from '../../../cmmn/transition';
import CaseHistoryService from '../../../service/case/casehistoryservice';
import CasePlanService from '../../../service/case/caseplanservice';
import CaseService from '../../../service/case/caseservice';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';

const definition = Definitions.EventListener;

const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestCasePlanAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const startCase = { tenant, definition };

        const caseInstance = await CaseService.startCase(user, startCase).then(async id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);
        
        const planItems = await CasePlanService.getPlanItems(user, caseInstance);

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

        const planItem = await CasePlanService.getPlanItem(user, caseInstance, eventItem.id);
        // console.log("PLanItem: " + planItem)

        await CaseHistoryService.getPlanItemHistory(user, caseInstance, planItem.id).then(history => {
            // console.log("History: " + history)
            if (history.length !== 2) {
                throw new Error(`Expected 2 history items for the UserEvent ${planItem.name} but found ${history.length}`);
            }
        });

        await CasePlanService.makePlanItemTransition(user, caseInstance, planItem.id, Transition.Occur);

        await CaseHistoryService.getPlanItemHistory(user, caseInstance, planItem.id).then(history => {
            // console.log("History: " + history)
            if (history.length !== 3) {
                throw new Error(`Expected 3 history items for the UserEvent ${planItem.name} but found ${history.length}`);
            }
        });

        await CasePlanService.getPlanItems(user, caseInstance).then(items => {
            if (! items.find((item: PlanItem) => item.name === 'T1')) {
                throw new Error(`Expected a plan item with name 'T1' but it was not found`)
            }
        });

        await CaseService.getCase(user, caseInstance).then(caze => {
            console.log('Resulting case: ' + JSON.stringify(caze, undefined, 2));
        });
    }
}
