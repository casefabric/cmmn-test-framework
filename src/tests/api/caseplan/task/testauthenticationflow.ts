'use strict';

import Definitions from '../../../../cmmn/definitions/definitions';
import State from '../../../../cmmn/state';
import Config from '../../../../config';
import CaseFileService from '../../../../service/case/casefileservice';
import CaseService from '../../../../service/case/caseservice';
import CaseEngineService from '../../../../service/caseengineservice';
import { assertPlanItem } from '../../../../test/caseassertions/plan';
import TestCase from '../../../../test/testcase';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';

const definition = Definitions.InvokeCaseEngine;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestAuthenticationFlow extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {

        const startCase = { tenant, definition };
        // Starts the case with user
        const caseInstance = await CaseService.startCase(user, startCase);
        this.addIdentifier(caseInstance);

        const baseURL = (Config.CaseEngine.url.endsWith('/') ? Config.CaseEngine.url.substring(0, Config.CaseEngine.url.length - 1) : Config.CaseEngine.url).replace('0.0.0.0', 'localhost');
        const caseLastModified = CaseEngineService.getHeaders(user)["Case-Last-Modified"];

        const http = {
            baseURL,
            caseLastModified
        }

        await CaseFileService.createCaseFileItem(user, caseInstance, 'http', http);

        console.log(`\nCase ID: ${caseInstance.id}\n`);

        await assertPlanItem(user, caseInstance, 'Invoke Case Engine', 0, State.Completed);

        console.log(`\nCase ID: ${caseInstance.id}\n`);
    }
}
