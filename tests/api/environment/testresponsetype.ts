'use strict';

import Definitions from '../../definitions/definitions';
import CaseTeam from '../../../src/cmmn/team/caseteam';
import { CaseOwner } from '../../../src/cmmn/team/caseteamuser';
import Config from '../../../src/config';
import CafienneService, { printHeaders } from '../../../src/service/cafienneservice';
import CaseService from '../../../src/service/case/caseservice';
import TestCase from '../../../src/test/testcase';
import WorldWideTestTenant from '../../../src/tests/setup/worldwidetesttenant';

const definition = Definitions.CaseTeam;
const worldwideTenant = new WorldWideTestTenant('wwtt-2');
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;
const requestorRole = "Requestor";

export default class TestResponseType extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([new CaseOwner(user, [requestorRole])]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        // starts the case instance
        const caseInstance = await CaseService.startCase(user, startCase);

        await this.tryFetchCase(caseInstance.id);
    }

    async tryFetchCase(caseId: string) {
        // create headers
        const headers = CafienneService.getHeaders(user);

        // create request parameters
        const url = Config.CafienneService.url + 'cases/' + caseId;
        const method = 'GET';
        console.log('\nURL: ' + url);
        printHeaders('\nRequest headers:', headers);

        // Fetch response
        const response = await fetch(url, { method, headers });
        printHeaders('\nResponse headers:', response.headers);
        await response.text().then(
            body => console.log('\nResponse Body: \n' + body)
        );

        // assert the content-type in response
        const expectedType = 'application/json';
        const actualType = response.headers.get('Content-Type');
        if (actualType != expectedType) {
            throw new Error('Mismatch in response\'s content-type. Expected: ' + expectedType + '; Received: ' + actualType);
        }
    }
}