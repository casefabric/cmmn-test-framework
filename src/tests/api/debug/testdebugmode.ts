'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';

const caseService = new CaseService();
const tenant = new WorldWideTestTenant();
const sendingUser = tenant.sender;
const tenantName = tenant.name;

export default class TestDebugMode extends TestCase {
    constructor() {
        super('Test Debug API');
    }

    async onPrepareTest() {
        await tenant.create();
    }

    async run() {
        const startCaseInput = {
            Greeting: {
                Message: 'Can you debug?',
                From: sendingUser.id
            }
        };
        const startCaseInDebugMode = { tenant: tenantName, definition: 'helloworld.xml', inputs: startCaseInput, debug: true};

        await sendingUser.login();

        // This should include a "DebugEnabled" event
        let debugCase = await caseService.startCase(startCaseInDebugMode, sendingUser);
        debugCase = await caseService.getCase(debugCase, sendingUser);

        // This should result in "DebugDisabled" event
        await caseService.changeDebugMode(debugCase, sendingUser, false);
        debugCase = await caseService.getCase(debugCase, sendingUser);

        // This should result in one more "DebugEnabled" event
        await caseService.changeDebugMode(debugCase, sendingUser, true);
        debugCase = await caseService.getCase(debugCase, sendingUser);

        // TODO: we can also query the events to see if they are indeed present.
    }
}
