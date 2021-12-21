'use strict';

import CaseService from '../../framework/service/case/caseservice';
import TestCase from '../../framework/test/testcase';
import WorldWideTestTenant from '../worldwidetesttenant';
import RepositoryService from '../../framework/service/case/repositoryservice';
import { ServerSideProcessing } from '../../framework/test/time';
import { assertPlanItem } from '../../framework/test/caseassertions/plan'
import CasePlanService from '../../framework/service/case/caseplanservice';
import CaseFileService from '../../framework/service/case/casefileservice';
import Case from '../../framework/cmmn/case';
import MockServer from '../../framework/mock/mockserver';
import GetMock from '../../framework/mock/getmock';

const definition = 'getlist_getdetails.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const mockPort = 18087;
const mock = new MockServer(mockPort);
new GetMock(mock, '/getListWebService', call => {
    const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    call.json(keys.map(key => ({ id: key })));
});
new GetMock(mock, '/details/:detailsKey', call => {
    const detailsKey = call.req.params['detailsKey'];
    call.json({
        description: `details of '${detailsKey}'`,
        id: detailsKey
    });
})

export default class TestGetListGetDetails extends TestCase {
    async onPrepareTest() {
        // await mock.start();
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const inputs = {
            port: mockPort
        }

        const startCase = { tenant, definition };

        // Starts the case with user
        let caseInstance = await CaseService.startCase(user, startCase);

        await ServerSideProcessing();

        // Get case details
        caseInstance = await CaseService.getCase(user, caseInstance);

        // When the case starts, GetCasesList & GetFirstCase tasks will be in available state
        await assertPlanItem(user, caseInstance, 'GetList', 0, 'Available');
        await assertPlanItem(user, caseInstance, 'GetDetails', 0, 'Available');

        // Create the CaseFileItem Request only with port
        await CaseFileService.createCaseFileItem(user, caseInstance, "HTTPConfig", inputs);

        // Give the 'GetList.0' process task up to 5 seconds to fail and activate Stage 'Fail handling.0'
        await assertPlanItem(user, caseInstance, 'Fail handling', 0, 'Active');

        // MockService is not yet started. So, GetList goes to Failed state
        await assertPlanItem(user, caseInstance, 'GetList', 0, 'Failed');

        // GetDetails remains in Available state
        await assertPlanItem(user, caseInstance, 'GetDetails', 0, 'Available');

        // GetList Failed should be in completed state
        await assertPlanItem(user, caseInstance, 'GetList Failed', 0, 'Completed');

        // Trigger the 'Try Again' event
        CasePlanService.makePlanItemTransition(user, caseInstance, 'Try Again', 'Occur');

        // Give the 'GetList.1' process task up to 5 seconds to fail (because Mock is still not started) and activate Stage 'Fail handling.1'
        await assertPlanItem(user, caseInstance, 'Fail handling', 1, 'Active');

        // MockService is not yet started. So, GetList goes to Failed state
        await assertPlanItem(user, caseInstance, 'GetList', 1, 'Failed');

        // GetDetails remains in Available state
        await assertPlanItem(user, caseInstance, 'GetDetails', 0, 'Available');

        // Starting mock service
        mock.start();

        // Trigger the 'Try Again' event
        await CasePlanService.makePlanItemTransition(user, caseInstance, 'Try Again', 'Occur');

        // Give the 'GetList.1' process task up to 5 seconds to fail (because Mock is still not started) and activate Stage 'Fail handling.1'
        await assertPlanItem(user, caseInstance, 'GetList', 2, 'Completed');

        // GetDetails tasks of index upto 3 has to be completed
        for (let i = 0; i < 4; i++) {
            await assertPlanItem(user, caseInstance, 'GetDetails', i, 'Completed');
        }

        const exceptionCaseFile = await CaseFileService.getCaseFile(user, caseInstance);


        // Verify exception case file content with the handler
        const exceptionContentChecker = (index: number, msg:any) => {
            console.log("Checking exception content " + index +" to match " + msg)
            if (msg === null && exceptionCaseFile.Exception[index] !== null) {
                throw new Error(`The content for exception[${index}] in the case file is not as expected, found '${exceptionCaseFile.Exception[index]}' instead of null`);
            }
            if (msg !== null && exceptionCaseFile.Exception[index].indexOf(msg) < 0) {
                throw new Error(`The content for exception[${index}] in the case file is not as expected, found '${exceptionCaseFile.Exception[index]}' instead of '${msg}'`);
            }
        }
        exceptionContentChecker(0, 'Connection refused');
        exceptionContentChecker(1, 'Connection refused');
        exceptionContentChecker(2, null);

        // In the end, stop the mock service, such that the test completes.
        await mock.stop();
    }
}
