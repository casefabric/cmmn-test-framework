'use strict';

import State from '@cafienne/typescript-client/cmmn/state';
import Transition from '@cafienne/typescript-client/cmmn/transition';
import Config from '@cafienne/typescript-client/config';
import CafienneService from '@cafienne/typescript-client/service/cafienneservice';
import CaseFileService from '@cafienne/typescript-client/service/case/casefileservice';
import CasePlanService from '@cafienne/typescript-client/service/case/caseplanservice';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import assertCaseFileContent from '@cafienne/typescript-client/test/caseassertions/file';
import { assertPlanItem } from '@cafienne/typescript-client/test/caseassertions/plan';
import TestCase from '@cafienne/typescript-client/test/testcase';
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
        let caseInstance = await CaseService.startCase(user, startCase);


        const baseURL = Config.CafienneService.url.endsWith('/') ? Config.CafienneService.url.substring(0, Config.CafienneService.url.length - 1) : Config.CafienneService.url;
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
