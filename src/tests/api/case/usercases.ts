'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';

const caseService = new CaseService();
const tenant = new WorldWideTestTenant();
const user = tenant.sender;
const tenantName = tenant.name;

export default class TestUsersCaseAPI extends TestCase {
    constructor() {
        super('Test API /cases/user');
    }

    async onPrepareTest() {
        await tenant.create();
    }

    async run() {
        await user.login();

        const allMyCases = await caseService.getUserCases(user, { numberOfResults: 10000 });

        const myCompletedCases = await caseService.getUserCases(user, { state: 'Completed', tenant: tenantName, numberOfResults: 10000 });
        const myActiveCases = await caseService.getUserCases(user, { state: 'Active', tenant: tenantName, numberOfResults: 10000 });

        console.log("All my cases: ", allMyCases.length);
        console.log("My completed cases: ", myCompletedCases.length);
        console.log("My active cases: ", myActiveCases.length);
    }
}
