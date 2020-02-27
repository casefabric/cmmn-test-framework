'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CasePlanService from '../../../framework/service/case/caseplanservice';
import PlanItem from '../../../framework/cmmn/planitem';
import User from '../../../framework/user';
import TenantUser from '../../../framework/tenant/tenantuser';
import TenantService from '../../../framework/service/tenant/tenantservice';
import { ServerSideProcessing } from '../../../framework/test/time';

const repositoryService = new RepositoryService();
const definition = 'eventlistener.xml';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

const employee = new User('employee');

const casePlanService = new CasePlanService();
const tenantService = new TenantService();

export default class TestEventAuthorization extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await ServerSideProcessing();
        await ServerSideProcessing();

        try {
            await tenantService.addTenantUser(user, worldwideTenant.tenant, new TenantUser(employee.id, ['Employee']));
        } catch (e) {
            if (! e.message.indexOf('already exists')) {
                console.log(e);
                throw e;
            }
        }
        await ServerSideProcessing();
        await ServerSideProcessing();

        await employee.login();

        await repositoryService.validateAndDeploy(definition, user, tenant);
    }

    async run() {
        const startCase = { tenant, definition };

        const caseInstance = await caseService.startCase(startCase, user);
        await caseService.getCase(caseInstance, user);
        
        const planItems = await casePlanService.getPlanItems(caseInstance, user);
        // console.log("PLanItems: " + planItems)

        const plainUserEvent: PlanItem = planItems.find((item: PlanItem) => item.name === 'PlainUserEvent');
        const employeeUserEvent: PlanItem = planItems.find((item: PlanItem) => item.name === 'EmployeeUserEvent');

        const planItem = await casePlanService.getPlanItem(caseInstance, user, plainUserEvent.id);
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

        // This should fail
        await casePlanService.makePlanItemTransition(caseInstance, user, employeeUserEvent.id, 'Occur', false);

        // This should succeed
        await casePlanService.makePlanItemTransition(caseInstance, employee, employeeUserEvent.id, 'Occur');
    }
}
