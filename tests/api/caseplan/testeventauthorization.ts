'use strict';

import Case from '../../../src/cmmn/case';
import Definitions from '../../../src/cmmn/definitions/definitions';
import State from '../../../src/cmmn/state';
import CaseTeam from '../../../src/cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../../src/cmmn/team/caseteamuser";
import CaseHistoryService from '../../../src/service/case/casehistoryservice';
import CasePlanService from '../../../src/service/case/caseplanservice';
import CaseService from '../../../src/service/case/caseservice';
import { assertPlanItem } from '../../../src/test/caseassertions/plan';
import TestCase from '../../../src/test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';


const definition = Definitions.EventListener;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const caseOwner = worldwideTenant.sender;
const caseEmployee = worldwideTenant.employee;
const caseMember = worldwideTenant.receiver;

export default class TestEventAuthorization extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(caseOwner, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([
            new CaseOwner(caseOwner),
            new CaseTeamUser(caseMember, []),
            new CaseTeamUser(caseEmployee, ["Employee"])]);

        const startCase = { tenant, definition, caseTeam };

        const caseInstance = await CaseService.startCase(caseOwner, startCase).then(id => CaseService.getCase(caseOwner, id));
        this.addIdentifier(caseInstance);

        await this.runPlainUserEventTests(caseInstance);

        await this.runEmployeeUserEventTests(caseInstance);

        await CaseService.getCase(caseOwner, caseInstance).then(caze => {
            // console.log('Resulting case: ' + JSON.stringify(caze, undefined, 2));
        });
    }

    async runPlainUserEventTests(caseInstance: Case) {
        const plainUserEvent = await assertPlanItem(caseOwner, caseInstance, 'PlainUserEvent', 0);

        if (!plainUserEvent) {
            throw new Error(`Did not find user event 'PlainUserEvent'`);
        }

        // Check UserEvent has 2 history items
        await this.checkUserEventHistory(caseInstance, plainUserEvent.id, 2);

        // Any case member can raise this event
        await CasePlanService.raiseEvent(caseMember, caseInstance, plainUserEvent.id);

        // Check UserEvent has 2 history items
        await this.checkUserEventHistory(caseInstance, plainUserEvent.id, 3);

        // Check that raising PlainUserEvent has resulted in the new task 'T1'
        await assertPlanItem(caseOwner, caseInstance, 'T1', 0);
    }

    async runEmployeeUserEventTests(caseInstance: Case) {
        await assertPlanItem(caseOwner, caseInstance, 'Repeater', 0, State.Active);
        const employeeUserEvent = await assertPlanItem(caseOwner, caseInstance, 'EmployeeUserEvent', 0);
        if (!employeeUserEvent) {
            throw new Error(`Did not find user event 'EmployeeUserEvent'`);
        }

        // Raising the EmployeeUserEVent by caseMember should fail because caseMember does not have role 'Employee'
        await CasePlanService.raiseEvent(caseMember, caseInstance, employeeUserEvent.id, 401, `Raising the EmployeeUserEVent by caseMember should fail because caseMember does not have role 'Employee'`);

        // Raising the EmployeeUserEVent by caseEmployee should succeed because caseEmployee has role 'Employee'
        await CasePlanService.raiseEvent(caseEmployee, caseInstance, employeeUserEvent.id, 200, `Raising the EmployeeUserEVent by caseEmployee should succeed because caseEmployee has role 'Employee'`);

        // Check that raising EmployeeUserEVent has resulted in achieving the milestone 'M1'
        await assertPlanItem(caseOwner, caseInstance, 'M1', 0);

        // Next event round should have become active
        await assertPlanItem(caseOwner, caseInstance, 'Repeater', 1, State.Active);

        const nextEmployeeEvent = await assertPlanItem(caseOwner, caseInstance, 'EmployeeUserEvent', 0, State.Available);

        // Raising the EmployeeUserEVent by caseOwner should succeed because of case ownership
        await CasePlanService.raiseEvent(caseOwner, caseInstance, nextEmployeeEvent.id, 200, `Raising the EmployeeUserEVent by caseOwner should succeed because of case ownership`);
    }

    async checkUserEventHistory(caseInstance: Case, id: string, expectedNumberOfHistoryItems: number) {
        // Fetch the plan item, and then the history.
        const planItem = await CasePlanService.getPlanItem(caseOwner, caseInstance, id);
        const history = await CaseHistoryService.getPlanItemHistory(caseOwner, caseInstance, planItem.id);
        // console.log("History: " + history)
        if (history.length !== expectedNumberOfHistoryItems) {
            throw new Error(`Expected ${expectedNumberOfHistoryItems} history items for the UserEvent ${planItem.name} but found ${history.length}`);
        }
    }

}
