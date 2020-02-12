'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';
const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestDebugMode extends TestCase {
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
        const startCaseInDebugMode = { tenant, definition, inputs: startCaseInput, debug: true};

        // This should include a "DebugEnabled" event
        let debugCase = await caseService.startCase(startCaseInDebugMode, user);
        debugCase = await caseService.getCase(debugCase, user);

        // This should result in "DebugDisabled" event
        await caseService.changeDebugMode(debugCase, user, false);
        debugCase = await caseService.getCase(debugCase, user);

        // This should result in one more "DebugEnabled" event
        await caseService.changeDebugMode(debugCase, user, true);
        debugCase = await caseService.getCase(debugCase, user);

        // TODO: we can also query the events to see if they are indeed present.
    }
}
