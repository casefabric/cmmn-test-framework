'use strict';

import Definitions from '../../definitions/definitions';
import CaseTeam from '../../../src/cmmn/team/caseteam';
import { CaseOwner } from '../../../src/cmmn/team/caseteamuser';
import CaseService from '../../../src/service/case/caseservice';
import { readLocalFile } from '../../../src/service/case/repositoryservice';
import TestCase from '../../../src/test/testcase';
import WorldWideTestTenant from '../../../src/tests/setup/worldwidetesttenant';

const definition = Definitions.CaseTeam;
const worldwideTenant = new WorldWideTestTenant('wwtt-4');
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestDefinitionInStartCase extends TestCase {
    isDefaultTest: boolean = false;

    async onPrepareTest() {
        await worldwideTenant.create();
        // This test case is not supposed to deploy the definition, as that goes in the StartCase command.
        // await definition.deploy(sender, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([
            new CaseOwner(receiver)
        ]);
        const definitionContents = readLocalFile(definition);
        const startCase = { tenant, definition: definitionContents, debug: true, caseTeam };

        // Starting a by sender case would not result in failure
        const caseInstance = await CaseService.startCase(sender, startCase);
        this.addIdentifier(caseInstance);

        // Receiver can perform get case
        await CaseService.getCase(receiver, caseInstance)
    }
}