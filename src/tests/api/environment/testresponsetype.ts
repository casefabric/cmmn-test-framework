'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import { CaseOwner } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import Case from '../../../framework/cmmn/case';
import Config from '../../../config';
import CafienneResponse from '../../../framework/service/response';
import { ServerSideProcessing } from '../../../framework/test/time';

const repositoryService = new RepositoryService();
const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant('wwtt-2');
const definition = 'caseteam.xml';
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;
const requestorRole = "Requestor";

export default class TestResponseType extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, user, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([new CaseOwner(user, [requestorRole])]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        // starts the case instance
        const caseInstance = await caseService.startCase(startCase, user) as Case;

        await this.getCase(caseInstance.id);
    }

    async getCase(caseId: string) {
        // create headers
        let headers= new Headers({
            'Content-Type': 'application/json',
        });
        headers.set('Authorization', 'Bearer ' + user.token);

        // create request parameters
        const url = Config.CafienneService.url + 'cases/' + caseId;
        const method = 'GET';
        console.log('URL: '+url);

        // attaching case-last-modified to headers can eliminate this
        await ServerSideProcessing();

        // Fetch response
        const fetchResponse = await fetch(url, { method, headers })
        await fetchResponse.trailer;
        const response = new CafienneResponse(fetchResponse);
        console.log(`All headers: ${JSON.stringify(response.headers)}`)
        console.log(`Content Type: ${JSON.stringify(response.headers.get('content-type'))}`)

        // assert the content-type in response
        const expectedType = 'application/json';
        const actualType = response.headers.get('Content-Type');
        if(actualType != expectedType) {
            throw new Error('Mismatch in content types. Expected: ' + expectedType + '; Received: ' + actualType);
        }
    }
}