'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService, { readLocalXMLDocument } from '../../../framework/service/case/repositoryservice';
import { CaseOwner } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import Case from '../../../framework/cmmn/case';
import { assertCaseTeam } from '../../../framework/test/assertions';
import Comparison from '../../../framework/test/comparison';

const repositoryService = new RepositoryService();
const definition = 'caseteam.xml';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant('wwtt-4');
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestValidStartCase extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(sender, definition, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([
            new CaseOwner(receiver)
        ]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        // Starting a by sender case would not result in failure
        const caseInstance = await caseService.startCase(sender, startCase) as Case;

        // Receiver can perform get case
        await caseService.getCase(receiver, caseInstance);

        // Sender cannot perform get case
        await caseService.getCase(sender, caseInstance, 404)

        await assertCaseTeam(receiver, caseInstance, caseTeam);

        const serverDefinition = await caseService.getDefinition(receiver, caseInstance);

        const definitionContents = readLocalXMLDocument(definition);

        if (! Comparison.sameXML(definitionContents, serverDefinition)) {
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