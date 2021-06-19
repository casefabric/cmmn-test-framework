'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import { readLocalFile } from '../../../framework/service/case/repositoryservice';
import { CaseOwner } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import Case from '../../../framework/cmmn/case';

const definition = 'caseteam.xml';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant('wwtt-4');
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestDefinitionInStartCase extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        // await repositoryService.validateAndDeploy(sender, definition, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([
            new CaseOwner(receiver)
        ]);
        const definitionContents = readLocalFile(definition);
        const startCase = { tenant, definition: definitionContents, debug: true, caseTeam };

        // Starting a by sender case would not result in failure
        const caseInstance = await caseService.startCase(sender, startCase);

        // Receiver can perform get case
        await caseService.getCase(receiver, caseInstance)
    }
}