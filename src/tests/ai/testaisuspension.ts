'use strict';

import State from '../../cmmn/state';
import Transition from '../../cmmn/transition';
import AiService from '../../service/ai/aiservice';
import CasePlanService from '../../service/case/caseplanservice';
import CaseService from '../../service/case/caseservice';
import { assertPlanItem } from '../../test/caseassertions/plan';
import TestCase from '../../test/testcase';
import { admin } from '../../user';
import { assertQualifiedLead, configuration, definition, leadRequest, openAi, prepareAi, tenant, worldwideTenant } from './aitestsetup';

const owner = worldwideTenant.sender;

/**
 * The suspension switch (EU AI Act Art. 26(5), 14(4)(e)) through the REST API of the AI image:
 *  - a tenant owner suspends a role that the declarative agent declares: a new AI task faults before any LLM call;
 *  - a tenant owner may not suspend for all tenants, nor freeze changes;
 *  - after the lift, reactivating the task runs the agent;
 *  - a platform owner freezes the role (Art. 73(6)): a new version of the AI configuration that changes it is refused.
 */
export default class TestAiSuspension extends TestCase {
    isDefaultTest = false;
    isParallelTest = false;

    async onPrepareTest() {
        await prepareAi();
    }

    async run() {
        const mock = openAi();

        await AiService.suspend(owner, { scope: 'role', value: 'qualifier', reason: 'Wrong answers' }, 401, 'A tenant owner should not be able to suspend AI for all tenants');
        await AiService.suspend(owner, { scope: 'role', value: 'qualifier', tenant, reason: 'Wrong answers', freezeChanges: true }, 401, 'A tenant owner should not be able to freeze changes');

        const suspension = await AiService.suspend(owner, { scope: 'role', value: 'qualifier', tenant, reason: 'Wrong answers' });
        const caseInstance = await CaseService.startCase(owner, { tenant, definition, inputs: leadRequest }).then(id => CaseService.getCase(owner, id));
        this.addIdentifier(caseInstance);
        await assertPlanItem(owner, caseInstance, 'AiTask', 0, State.Failed);
        if (mock.prompts.length) {
            throw new Error(`A suspended call should not ask the LLM anything, but it got:\n${mock.prompts.join('\n---\n')}`);
        }

        await AiService.lift(owner, suspension.id, 'Answers checked');
        await CasePlanService.makePlanItemTransition(owner, caseInstance, 'AiTask', Transition.Reactivate);
        await assertPlanItem(owner, caseInstance, 'AiTask', 0, State.Completed);
        await assertQualifiedLead(owner, caseInstance);

        const freeze = await AiService.suspend(admin, { scope: 'role', value: 'qualifier', reason: 'Incident under investigation', onRunning: 'finish', freezeChanges: true });
        const changed = { ...configuration, roles: { ...configuration.roles, qualifier: { model: 'gpt-4.1' } } };
        await AiService.deployConfiguration(admin, changed, 400, 'A change of a frozen role should be refused');
        await AiService.lift(owner, freeze.id, 'Not the tenant owner', 401);
        await AiService.lift(admin, freeze.id, 'Incident reported');
        await AiService.deployConfiguration(admin, changed);
        await AiService.deployConfiguration(admin, configuration);
    }
}
