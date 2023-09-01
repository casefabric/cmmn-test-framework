'use strict';

import State from '../../../../cmmn/state';
import Config from '../../../../config';
import CafienneService from '../../../../service/cafienneservice';
import CaseFileService from '../../../../service/case/casefileservice';
import CaseService from '../../../../service/case/caseservice';
import RepositoryService from '../../../../service/case/repositoryservice';
import { assertPlanItem } from '../../../../test/caseassertions/plan';
import TestCase from '../../../../test/testcase';
import WorldWideTestTenant from '../../../worldwidetesttenant';

const definition = 'invokecafienne.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestAuthenticationFlow extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {

        const startCase = { tenant, definition };
        // Starts the case with user
        const caseInstance = await CaseService.startCase(user, startCase);
        this.addIdentifier(caseInstance);

        const baseURL = (Config.CafienneService.url.endsWith('/') ? Config.CafienneService.url.substring(0, Config.CafienneService.url.length - 1) : Config.CafienneService.url).replace('0.0.0.0', 'localhost');
        const caseLastModified = CafienneService.getHeaders(user)["Case-Last-Modified"];

        const http = {
            baseURL,
            caseLastModified
        }

        await CaseFileService.createCaseFileItem(user, caseInstance, 'http', http);

        console.log(`\nCase ID: ${caseInstance.id}\n`);

        await assertPlanItem(user, caseInstance, 'Invoke Cafienne', 0, State.Completed);

        console.log(`\nCase ID: ${caseInstance.id}\n`);
    }
}
