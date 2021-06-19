'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import DebugService from '../../../framework/service/case/debugservice';
import Case from '../../../framework/cmmn/case';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';
const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestDebugMode extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(user, definition, tenant);
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
        let caseInstance = await caseService.startCase(user, startCaseInDebugMode);
        caseInstance = await caseService.getCase(user, caseInstance);

        // This should result in "DebugDisabled" event
        await caseService.changeDebugMode(user, caseInstance, false);
        caseInstance = await caseService.getCase(user, caseInstance);

        // This should result in one more "DebugEnabled" event
        await caseService.changeDebugMode(user, caseInstance, true);
        caseInstance = await caseService.getCase(user, caseInstance);

        // TODO: we can also query the events to see if they are indeed present.
        const debugService = new DebugService();
        await debugService.getEvents(caseInstance.id).then(response => {
            if (response.status === 401 || response.status === 200) {
                // This is the right status messages
            } else {
                throw new Error('Debug Event API did not give proper response code, but gave ' + response.status + ' ' + response.statusText);
            }
        });
    }
}
