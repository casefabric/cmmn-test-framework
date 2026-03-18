'use strict';

import { assertPlanItem } from '../../../..';
import Definitions from '../../../../cmmn/definitions/definitions';
import State from '../../../../cmmn/state';
import CaseService from '../../../../service/case/caseservice';
import TestCase from '../../../../test/testcase';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';
import CasePlanService from '../../../../service/case/caseplanservice';
import Transition from '../../../../cmmn/transition';
import Case from '../../../../cmmn/case';

const definition = Definitions.SuspendResume;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestSuspendResume extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const startCase = { tenant, definition };

        const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);

        caseInstance.assertPlanItem('Stage', 0, State.Active);
        caseInstance.assertPlanItem('Milestone', 0, State.Available);
        caseInstance.assertPlanItem('HelloWorld', 0);
        caseInstance.assertPlanItem('After 5 seconds', 0, State.Available);        

        await this.verifySuspend(caseInstance);
        await this.verifyResume(caseInstance);
    }

    async verifySuspend(caseInstance: Case) {
        const subCase = caseInstance.assertPlanItem('HelloWorld', 0);
        const suspendStageEvent = caseInstance.assertPlanItem('Suspend Stage Event');
        // await CasePlanService.makePlanItemTransition(user, subCase.id, 'HelloWorld', Transition.Suspend);
        

        await CasePlanService.raiseEvent(user, caseInstance, suspendStageEvent);

        const suspendedCase = await CaseService.getCase(user, caseInstance);

        suspendedCase.toConsole();
        
        suspendedCase.assertPlanItem('Stage', 0, State.Suspended);
        suspendedCase.assertPlanItem('Milestone', 0, State.Suspended, Transition.ParentSuspend);
        suspendedCase.assertPlanItem('After 5 seconds', 0, State.Suspended);        
        suspendedCase.assertPlanItem('HelloWorld', 0, State.Suspended);

        const suspendedSubCase = await CaseService.getCase(user, subCase.id);
        suspendedSubCase.assertPlanItem('Read response', 0, State.Suspended, Transition.ParentSuspend);

        await assertPlanItem(user, suspendedCase, 'HelloWorld', 0, State.Suspended);

    }

    async verifyResume(caseInstance: Case) {
        const subCase = caseInstance.assertPlanItem('HelloWorld', 0);
        const resumeStageEvent = caseInstance.assertPlanItem('Resume Stage Event');
        // await CasePlanService.makePlanItemTransition(user, subCase.id, 'HelloWorld', Transition.Suspend);
        

        await CasePlanService.raiseEvent(user, caseInstance, resumeStageEvent);

        const resumedCase = await CaseService.getCase(user, caseInstance);

        resumedCase.toConsole();
        
        resumedCase.assertPlanItem('Stage', 0, State.Active);
        resumedCase.assertPlanItem('Milestone', 0, State.Available, Transition.ParentResume);
        resumedCase.assertPlanItem('After 5 seconds', 0, State.Available);        
        resumedCase.assertPlanItem('HelloWorld', 0, State.Active);

        await assertPlanItem(user, resumedCase, 'HelloWorld', 0, State.Active);
        const resumedSubCase = await CaseService.getCase(user, subCase.id);
        resumedSubCase.toConsole();
        resumedSubCase.assertPlanItem('Read response', 0, State.Available, Transition.ParentResume);


    }

}
