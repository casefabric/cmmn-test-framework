'use strict';

import CaseService from '../../../src/service/case/caseservice';
import TestCase from '../../../src/test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';

const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestUsersCaseAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
    }

    async run() {
        const allMyCases = await CaseService.getCases(user, { numberOfResults: 10000 });

        const myCompletedCases = await CaseService.getCases(user, { state: 'Completed', tenant, numberOfResults: 10000 });
        const myActiveCases = await CaseService.getCases(user, { state: 'Active', tenant, numberOfResults: 10000 });

        console.log("All my cases: ", allMyCases.length);
        console.log("My completed cases: ", myCompletedCases.length);
        console.log("My active cases: ", myActiveCases.length);
    }
}
