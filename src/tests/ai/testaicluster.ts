'use strict';

import State from '../../cmmn/state';
import Config from '../../config';
import AiService from '../../service/ai/aiservice';
import CaseService from '../../service/case/caseservice';
import { assertPlanItem } from '../../test/caseassertions/plan';
import TestCase from '../../test/testcase';
import { admin } from '../../user';
import { PollUntilSuccess } from '../../test/time';
import { company, configuration, definition, leadRequest, openAi, prepareAi, tenant, worldwideTenant } from './aitestsetup';

const owner = worldwideTenant.sender;

/**
 * The AI platform configuration and the suspension switch in a cluster of two AI nodes (phase 3 of
 * ai/docs/dynamic-agent-configuration.md in case-engine; Art. 26(5) asks to stop the use of the system, not of one node):
 *  - a configuration deployed through one node is in use on the other;
 *  - a suspension set through one node kills the AI call that runs on the other node, and faults its task.
 * Run with two nodes: npm run test -- -urls "http://0.0.0.0:20271,http://0.0.0.0:20272" aicluster
 */
export default class TestAiCluster extends TestCase {
    isDefaultTest = false;
    isParallelTest = false;

    get nodes(): Array<string> {
        return (Config.CaseEngine as any).urls || [];
    }

    async onPrepareTest() {
        if (this.nodes.length < 2) {
            throw new Error(`TestAiCluster needs two engine nodes (-urls), but has ${JSON.stringify(this.nodes)}`);
        }
        await prepareAi();
    }

    async run() {
        const [first, second] = this.nodes;

        // A version deployed through the first node is the version of the second
        const deployed = await AiService.deployConfiguration(admin, { ...configuration, description: `Deployed through ${first}` }, 200, 'Deploying through the first node failed', first);
        await PollUntilSuccess(async () => {
            const seen = await AiService.getConfiguration(admin, 200, second);
            if (seen.version !== deployed.version) {
                throw new Error(`Node ${second} uses version ${seen.version} of the AI configuration, not ${deployed.version}`);
            }
        });

        // The ids of the nodes, as the AI calls show them
        const nodeIds: Map<string, string> = new Map();
        for (const node of this.nodes) {
            nodeIds.set((await AiService.getHealth(admin, node)).node, node);
        }
        if (nodeIds.size < 2) {
            throw new Error(`Expected two AI nodes, but found ${JSON.stringify([...nodeIds.keys()])}`);
        }

        // Twice, so that it is likely that both nodes run a call; each time the suspension comes through the other node
        for (const round of [1, 2]) {
            const mock = openAi();
            const held = mock.hold('Find the company');
            const caseInstance = await CaseService.startCase(owner, { tenant, definition, inputs: leadRequest }).then(id => CaseService.getCase(owner, id));
            this.addIdentifier(caseInstance);
            const task = await assertPlanItem(owner, caseInstance, 'AiTask', 0, State.Active);
            await held.arrived;

            const call = await PollUntilSuccess(async () => {
                const found = (await AiService.getCalls(admin)).find(call => call.taskId === task.id && call.state === 'running');
                if (!found) throw new Error(`The AI call of task ${task.id} is not listed as running`);
                return found;
            });
            const runningOn = nodeIds.get(call.node);
            const other = this.nodes.find(node => node !== runningOn);
            if (!runningOn || !other) {
                throw new Error(`The AI call runs on ${call.node}, which is not one of ${JSON.stringify([...nodeIds.keys()])}`);
            }
            console.log(`Round ${round}: the AI call runs on ${runningOn}; suspending through ${other}`);

            const suspension = await AiService.suspend(owner, { scope: 'agent', value: 'LeadQualifier', tenant, reason: `Stopped through ${other}` }, 201, 'Suspending failed', other);
            await assertPlanItem(owner, caseInstance, 'AiTask', 0, State.Failed);
            held.release(company);
            await AiService.lift(owner, suspension.id, 'Round done', 200, runningOn);
        }
    }
}
