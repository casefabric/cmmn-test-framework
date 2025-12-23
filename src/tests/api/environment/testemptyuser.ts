'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import { AsyncEngineError } from '../../../infra/asyncerror';
import CaseService from '../../../service/case/caseservice';
import TestCase from '../../../test/testcase';
import User from '../../../user';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';

const definition = Definitions.CaseTeam;
const worldwideTenant = new WorldWideTestTenant('wwtt-2');
const tenant = worldwideTenant.name;
const user = new User(''); // Empty user

export default class TestEmptyUser extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await user.login();
        await definition.deploy(user, tenant);
    }

    async run() {
        const startCase = { tenant, definition };

        // starts the case instance with an empty user should give an exception saying that the user id is missing.
        try {
            await CaseService.startCase(user, startCase);
        } catch (error) {
            if (error instanceof AsyncEngineError) {
                const text = await error.response.text();
                console.log("Error details: " + text);
                return;
            }
        }
        // If we reach this point, we successfully created the case ... so, the test failed
        throw new Error('Starting a case with an empty user should give an exception');
    }
}
