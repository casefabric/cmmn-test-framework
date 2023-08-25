'use strict';

import CaseTeam from '@cafienne/typescript-client/cmmn/team/caseteam';
import { CaseOwner } from '@cafienne/typescript-client/cmmn/team/caseteamuser';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import { readLocalFile } from '@cafienne/typescript-client/service/case/repositoryservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';

const definition = 'caseteam.xml';

const worldwideTenant = new WorldWideTestTenant('wwtt-4');
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestDefinitionInStartCase extends TestCase {
    isDefaultTest: boolean = false;

    async onPrepareTest() {
        await worldwideTenant.create();
        // await RepositoryService.validateAndDeploy(sender, definition, tenant);
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