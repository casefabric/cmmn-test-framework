'use strict';

import Definitions from '../../../../../src/cmmn/definitions/definitions';
import State from '../../../../../src/cmmn/state';
import Transition from '../../../../../src/cmmn/transition';
import CaseFileService from '../../../../../src/service/case/casefileservice';
import CasePlanService from '../../../../../src/service/case/caseplanservice';
import CaseService from '../../../../../src/service/case/caseservice';
import { assertPlanItem } from '../../../../../src/test/caseassertions/plan';
import TestCase from '../../../../../src/test/testcase';
import WorldWideTestTenant from '../../../../setup/worldwidetesttenant';
import ListDetailsMock from './listdetailsmock';

const definition = Definitions.GetListGetDetails;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const mockPort = 18087;
const mock = new ListDetailsMock(mockPort);

export default class TestGetListGetDetails extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
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

        // Get case details
        caseInstance = await CaseService.getCase(user, caseInstance);

        // When the case starts, GetCasesList & GetFirstCase tasks will be in available state
        await assertPlanItem(user, caseInstance, 'GetList', 0, State.Available);
        await assertPlanItem(user, caseInstance, 'GetDetails', 0, State.Available);

        // Create the CaseFileItem Request only with port
        await CaseFileService.createCaseFileItem(user, caseInstance, "HTTPConfig", inputs);

        // Give the 'GetList.0' process task up to 5 seconds to fail and activate Stage 'Fail handling.0'
        await assertPlanItem(user, caseInstance, 'Fail handling', 0, State.Active);

        // MockService is not yet started. So, GetList goes to Failed state
        await assertPlanItem(user, caseInstance, 'GetList', 0, State.Failed);

        // GetDetails remains in Available state
        await assertPlanItem(user, caseInstance, 'GetDetails', 0, State.Available);

        // GetList Failed should be in completed state
        await assertPlanItem(user, caseInstance, 'GetList Failed', 0, State.Completed);

        // Trigger the 'Try Again' event
        await CasePlanService.makePlanItemTransition(user, caseInstance, 'Try Again', Transition.Occur);

        // Give the 'GetList.1' process task up to 5 seconds to fail (because Mock is still not started) and activate Stage 'Fail handling.1'
        await assertPlanItem(user, caseInstance, 'Fail handling', 1, State.Active);

        // MockService is not yet started. So, GetList goes to Failed state
        await assertPlanItem(user, caseInstance, 'GetList', 1, State.Failed);

        // GetDetails remains in Available state
        await assertPlanItem(user, caseInstance, 'GetDetails', 0, State.Available);

        // Starting mock service
        mock.start();

        // Trigger the 'Try Again' event
        await CasePlanService.makePlanItemTransition(user, caseInstance, 'Try Again', Transition.Occur);

        // Give the 'GetList.1' process task up to 5 seconds to fail (because Mock is still not started) and activate Stage 'Fail handling.1'
        await assertPlanItem(user, caseInstance, 'GetList', 2, State.Completed);

        // GetDetails tasks of index upto 3 has to be completed
        for (let i = 0; i < 4; i++) {
            await assertPlanItem(user, caseInstance, 'GetDetails', i, State.Completed);
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
        mock.stop();
    }
}
