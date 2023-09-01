'use strict';

import CaseService from '../../../service/case/caseservice';
import DebugService from '../../../service/case/debugservice';
import RepositoryService from '../../../service/case/repositoryservice';
import PlatformService from '../../../service/platform/platformservice';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';

const definition = 'helloworld.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestVersion extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        // This tests the engine version against the one added to CaseDefinitionApplied.
        //  It also tests that upon recovery no new EngineVersionChanged event gets added.

        // First, retrieve engine version
        const engineVersion = await PlatformService.getVersion();

        // Create the case
        const caseInstance = await CaseService.startCase(user, { tenant, definition }).then(id => CaseService.getCase(user, id));

        // Retrieve the initial set of events.
        const firstEventBatch = (await DebugService.getParsedEvents(caseInstance.id, user)).filter((event: any) => event.type !== 'DebugEvent');

        // Compare engine version from engine versus the one that the case instance thinks it has. They MUST be the same ;)
        const caseDefinitionApplied = firstEventBatch.find((event: any) => event.type === 'CaseDefinitionApplied');
        const v1 = JSON.stringify(engineVersion, undefined, 2);
        const v2 = JSON.stringify(caseDefinitionApplied.content.engineVersion, undefined, 2);
        if (v1 !== v2) {
            throw new Error(`Unexpected mismatch between engine's version of version and case instance's version of it:\nEngine version: ${v1}\nCase Instance Version: ${v2} `);
        }

        // Retrieve discretionaries and see if there are any additional events. It is either 1 or 0, depending whether debug flag is on.
        await CaseService.getDiscretionaryItems(user, caseInstance);
        await CaseService.getCase(user, caseInstance); // Also get the case, in order to make it await processing of additional events through CaseLastModified header
        const secondEventBatch = (await DebugService.getParsedEvents(caseInstance.id, user)).filter((event: any) => event.type !== 'DebugEvent');

        // Force recovery, so that the engine version state is removed from the case instance and set again, and tested against the actual engine version.
        await DebugService.forceRecovery(user, caseInstance.id);

        // Now again get the discretionaries, that will recover the case instance. Then check that there are as many new events as previously, and also check
        //  there is no EngineVersionChanged event either.
        await CaseService.getDiscretionaryItems(user, caseInstance);
        await CaseService.getCase(user, caseInstance); // Also get the case, in order to make it await processing of additional events through CaseLastModified header
        const thirdEventBatch = (await DebugService.getParsedEvents(caseInstance.id, user)).filter((event: any) => event.type !== 'DebugEvent');

        console.log(`Event batch sizes: ${firstEventBatch.length}, ${secondEventBatch.length}, ${thirdEventBatch.length}`);

        if (thirdEventBatch.find((event: any) => event.type === 'EngineVersionChanged')) {
            throw new Error(`Not expecting an EngineVersionChanged event!`);
        }

        const firstIncrease = secondEventBatch.length - firstEventBatch.length;
        const secondIncrease = thirdEventBatch.length - secondEventBatch.length;

        if (firstIncrease != secondIncrease) {
            throw new Error(`Expected ${firstIncrease} additional events after recovery, but found ${secondIncrease}; event batches 1, 2 and 3 had sizes: ${firstEventBatch.length}, ${secondEventBatch.length}, ${thirdEventBatch.length}`);
        }
    }
}
