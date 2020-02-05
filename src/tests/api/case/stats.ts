'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';

const caseService = new CaseService();
const tenant = new WorldWideTestTenant();

export default class TestStatsAPI extends TestCase {
    constructor() {
        super('Test statistics API');
    }

    async onPrepareTest() {
        await tenant.create();
    }

    async run() {
        const allStats = await caseService.getCaseStatistics(tenant.sender);

        const hwStats = await caseService.getCaseStatistics(tenant.sender, { definition: 'HelloWorld', tenant: tenant.name});
        
        console.log("All stats: ", allStats);
        console.log("HW stats within tenant: ", hwStats);
    }
}
