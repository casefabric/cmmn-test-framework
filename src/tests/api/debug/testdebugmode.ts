'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const sendingUser = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestDebugMode extends TestCase {
    constructor() {
        super('Test Debug API');
    }

    async onPrepareTest() {
        await worldwideTenant.create();
    }

    async run() {
        const startCaseInput = {
            Greeting: {
                Message: 'Can you debug?',
                From: sendingUser.id
            }
        };
        const startCaseInDebugMode = { tenant, definition: 'helloworld.xml', inputs: startCaseInput, debug: true};

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
