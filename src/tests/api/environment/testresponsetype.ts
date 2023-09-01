'use strict';

import CaseTeam from '../../../cmmn/team/caseteam';
import { CaseOwner } from '../../../cmmn/team/caseteamuser';
import Config from '../../../config';
import CafienneService, { printHeaders } from '../../../service/cafienneservice';
import CaseService from '../../../service/case/caseservice';
import RepositoryService from '../../../service/case/repositoryservice';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';

const worldwideTenant = new WorldWideTestTenant('wwtt-2');
const definition = 'caseteam.xml';
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;
const requestorRole = "Requestor";

export default class TestResponseType extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
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
        if(actualType != expectedType) {
            throw new Error('Mismatch in response\'s content-type. Expected: ' + expectedType + '; Received: ' + actualType);
        }
    }
}