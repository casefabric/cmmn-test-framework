'use strict';

import State from '../../cmmn/state';
import AiService from '../../service/ai/aiservice';
import CaseService from '../../service/case/caseservice';
import { assertPlanItem } from '../../test/caseassertions/plan';
import TestCase from '../../test/testcase';
import { admin } from '../../user';
import { assertQualifiedLead, definition, leadRequest, openAi, prepareAi, tenant, worldwideTenant } from './aitestsetup';

const user = worldwideTenant.sender;

/**
 * A case with an AI task that runs a declarative agent (the <agent> of a .ai process): its three actions ask the
 * (fake) LLM in turn, with the roles of the AI platform configuration, and the goal value becomes the case file item,
 * with the AI-generated marker next to it (EU AI Act Art. 50(2)).
 */
export default class TestAiDeclarativeAgent extends TestCase {
    isDefaultTest = false;
    isParallelTest = false;

    async onPrepareTest() {
        await prepareAi();
    }

    async run() {
        const mock = openAi();
        const config = await AiService.getConfiguration(admin);
        if (!config.version || config.version < 1) {
            throw new Error(`Expected a deployed AI configuration, but got ${JSON.stringify(config)}`);
        }

        const caseInstance = await CaseService.startCase(user, { tenant, definition, inputs: leadRequest }).then(id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);

        await assertPlanItem(user, caseInstance, 'AiTask', 0, State.Completed);
        await assertQualifiedLead(user, caseInstance);

        // One request per action: findCompany, checkCredit, qualify
        ['Find the company', 'Estimate a credit score', 'Qualify'].forEach(fragment => {
            if (mock.promptsWith(fragment).length !== 1) {
                throw new Error(`Expected one prompt with '${fragment}', but the LLM got ${mock.prompts.length} prompts:\n${mock.prompts.join('\n---\n')}`);
            }
        });
    }
}
