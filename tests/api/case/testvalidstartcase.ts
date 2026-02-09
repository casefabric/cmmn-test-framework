'use strict';

import Definitions from '../../../src/cmmn/definitions/definitions';
import CaseTeam from '../../../src/cmmn/team/caseteam';
import { CaseOwner } from '../../../src/cmmn/team/caseteamuser';
import CaseService from '../../../src/service/case/caseservice';
import { readLocalXMLDocument } from '../../../src/service/case/repositoryservice';
import { assertCaseTeam } from '../../../src/test/caseassertions/team';
import Comparison from '../../../src/test/comparison';
import TestCase from '../../../src/test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';

const definition = Definitions.CaseTeam;
const worldwideTenant = new WorldWideTestTenant('wwtt-4');
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestValidStartCase extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(sender, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([
            new CaseOwner(receiver)
        ]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        // Starting a by sender case would not result in failure
        const caseInstance = await CaseService.startCase(sender, startCase);
        this.addIdentifier(caseInstance);

        // Receiver can perform get case
        await CaseService.getCase(receiver, caseInstance);

        // Sender should not be able to get case
        await CaseService.getCase(sender, caseInstance, 404, 'Sender should not be able to get case');

        await assertCaseTeam(receiver, caseInstance, caseTeam);

        const serverDefinition = await CaseService.getDefinition(receiver, caseInstance);

        const definitionContents = readLocalXMLDocument(definition);

        if (!Comparison.sameXML(definitionContents, serverDefinition)) {
            throw new Error('Expecting to find exactly the same definition as we sent to the engine, but it differs ...');
        }
        // const dcString = definitionContents.toString();
        // const sdString = serverDefinition.toString();

        // const client = parseXMLDocument(definitionContents)

        // console.log("DC, SD lengths: " + dcString.length + ", " + sdString.length)
        // console.log("XML: " + serverDefinition)
        // console.log("\n\nOURS: " + client)

    }
}