'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseFileService from '../../../framework/service/case/casefileservice';
import { assertCaseFileContent } from '../../../framework/test/assertions';

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
        const greeting1 = {
            Message: 'Can you debug?',
            From: user.id
        };
        const startCaseInput = { Greeting: greeting1 };
        const startCase = { tenant, definition, inputs: startCaseInput};

        // This should include a "DebugEnabled" event
        let caseInstance = await caseService.startCase(startCase, user);
        caseInstance = await caseService.getCase(caseInstance, user);

        await caseFileService.updateCaseFileItem(caseInstance, user, 'Greeting', greeting1);
        await assertCaseFileContent(caseInstance, user, 'Greeting', greeting1);

        const greeting2 = {
            Message: 'new message',
            From: 'someone else'
        };

        await caseFileService.updateCaseFileItem(caseInstance, user, 'Greeting', greeting2);
        await assertCaseFileContent(caseInstance, user, '/Greeting', greeting2);
        await assertCaseFileContent(caseInstance, user, '/Greeting/From', 'someone else');

        const greeting3 = {
            Message: 'new message',
            From: 'new from'
        };
        await caseFileService.updateCaseFileItem(caseInstance, user, 'Greeting', greeting3);

        await assertCaseFileContent(caseInstance, user, '/Greeting', greeting3);
        await assertCaseFileContent(caseInstance, user, 'Greeting//From', greeting3.From);


        // Apparently the CasesRoute does not allow to go this deep, since Message is a property, and not a case file item.
        // await caseFileService.updateCaseFileItem(caseInstance, user, 'Greeting/Message', 'abc new', false);
    }
}
