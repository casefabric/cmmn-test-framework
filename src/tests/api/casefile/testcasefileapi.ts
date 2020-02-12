'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseFileService from '../../../framework/service/case/casefileservice';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

const caseFileService = new CaseFileService();

export default class TestCaseFileAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, user, tenant);
    }

    async run() {
        const startCaseInput = {
            Greeting: {
                Message: 'Can you debug?',
                From: user.id
            }
        };
        const startCase = { tenant, definition, inputs: startCaseInput};

        // This should include a "DebugEnabled" event
        let caseInstance = await caseService.startCase(startCase, user);
        caseInstance = await caseService.getCase(caseInstance, user);

        let caseFile = await caseFileService.getCaseFile(caseInstance, user);

        console.log("CaseFile: ", JSON.stringify(caseFile, undefined, 2))

        await caseFileService.updateCaseFileItem(caseInstance, user, 'Greeting', {
            Message: 'new message',
            From: 'someone else'
        });

        caseFile = await caseFileService.getCaseFile(caseInstance, user);
        console.log("Updated CaseFile: ", JSON.stringify(caseFile, undefined, 2))

        const greetingMessage = await caseFileService.getCaseFileItem(caseInstance, user, 'Greeting/Message');
        console.log("CaseFileItem greeting: ", JSON.stringify(greetingMessage, undefined, 2))

        await caseFileService.updateCaseFileItem(caseInstance, user, 'Greeting', {
            Message: 'new message',
            From: 'new from'
        });

        // Apparently the CasesRoute does not allow to go this deep, it does not accept text/plain, but only json.
        // await caseFileService.updateCaseFileItem(caseInstance, user, 'Greeting/Message', 'abc new');

        caseFile = await caseFileService.getCaseFile(caseInstance, user);
        console.log("CaseFile: ", JSON.stringify(caseFile, undefined, 2))


    }
}
