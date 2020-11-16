'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CasePlanService from '../../../framework/service/case/caseplanservice';
import PlanItem from '../../../framework/cmmn/planitem';
import TenantService from '../../../framework/service/tenant/tenantservice';
import CaseTeamMember, { CaseOwner } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import Case from '../../../framework/cmmn/case';

const repositoryService = new RepositoryService();
const definition = 'eventlistener.xml';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;
const employee = worldwideTenant.employee;

const casePlanService = new CasePlanService();
const tenantService = new TenantService();

export default class TestEventAuthorization extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([new CaseOwner(user), new CaseTeamMember(employee, ["Employee"])]);

        const startCase = { tenant, definition, caseTeam };

        const caseInstance = await caseService.startCase(user, startCase) as Case;
        await caseService.getCase(user, caseInstance);
        
        const planItems = await casePlanService.getPlanItems(user, caseInstance);
        // console.log("PLanItems: " + planItems)

        const plainUserEvent = planItems.find((item: PlanItem) => item.name === 'PlainUserEvent');
        if (! plainUserEvent) {
            throw new Error('Did not find expected PlainUserEvent');
        }
        const employeeUserEvent = planItems.find((item: PlanItem) => item.name === 'EmployeeUserEvent');
        if (! employeeUserEvent) {
            throw new Error('Did not find expected EmployeeUserEvent');
        }
        
        const planItem = await casePlanService.getPlanItem(user, caseInstance, plainUserEvent.id);
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
            // console.log('Resulting case: ' + JSON.stringify(caze, undefined, 2));
        });

        // This should fail
        await casePlanService.makePlanItemTransition(user, caseInstance, employeeUserEvent.id, 'Occur', 401);

        // This should succeed
        await casePlanService.makePlanItemTransition(employee, caseInstance, employeeUserEvent.id, 'Occur');
    }
}
