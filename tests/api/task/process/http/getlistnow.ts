'use strict';

import Definitions from '../../../../../src/cmmn/definitions/definitions';
import State from '../../../../../src/cmmn/state';
import GetMock from '../../../../../src/mock/getmock';
import MockServer from '../../../../../src/mock/mockserver';
import CaseService from '../../../../../src/service/case/caseservice';
import { assertPlanItem } from '../../../../../src/test/caseassertions/plan';
import TestCase from '../../../../../src/test/testcase';
import WorldWideTestTenant from '../../../../setup/worldwidetesttenant';

const definition = Definitions.GetListNow;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const mockPort = 1887;
const mock = new MockServer(mockPort);
new GetMock(mock, '/getListWebService', call => {
    const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    call.json(keys.map(key => ({ id: key })));
});

export default class TestGetListNow extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();

        // Starting mock service
        mock.start();
        await definition.deploy(user, tenant);
    }

    async run() {
        const inputs = {
            port: mockPort
        }

        const startCase = { tenant, definition };

        // Starts the case with user
        let caseInstance = await CaseService.startCase(user, startCase);
        this.addIdentifier(caseInstance);

        assertPlanItem(user, caseInstance, 'GetListWebService', 0, State.Completed);
        // Get case details
        caseInstance = await CaseService.getCase(user, caseInstance);

        // In the end, stop the mock service, such that the test completes.
        mock.stop();
    }
}
