'use strict';

import CaseService from '../../framework/service/case/caseservice';
import TaskService from '../../framework/service/task/taskservice';
import TestCase from '../../framework/test/testcase';
import WorldWideTestTenant from '../worldwidetesttenant';
import TaskValidationMock from '../api/task/task-validation-mock';
import RepositoryService from '../../framework/service/case/repositoryservice';
import { ServerSideProcessing, SomeTime } from '../../framework/test/time';
import { assertPlanItemState, assertTask, verifyTaskInput, assertCaseFileContent } from '../../framework/test/assertions'
import CaseTeam from '../../framework/cmmn/caseteam';
import CaseTeamMember from '../../framework/cmmn/caseteammember';
import CasePlanService from '../../framework/service/case/caseplanservice';
import PlanItem from '../../framework/cmmn/planitem';
import CaseFileService from '../../framework/service/case/casefileservice';

const repositoryService = new RepositoryService();
const definition = 'getlist_getdetails.xml';

const caseService = new CaseService();
const casePlanService = new CasePlanService();
const caseFileService = new CaseFileService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const mockPort = 18087;
const mock = new TaskValidationMock(mockPort);

export default class TestGetListGetDetails extends TestCase {
    async onPrepareTest() {
        // await mock.start();
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, user, tenant);
    }

    async run() {
        const inputs  = {
            port: mockPort
        }

        const startCase = { tenant, definition };

        // Starts the case with user
        let caseInstance = await caseService.startCase(startCase, user, true);

        await ServerSideProcessing();

        // Get case details
        caseInstance = await caseService.getCase(caseInstance, user);

        // When the case starts, GetCasesList & GetFirstCase tasks will be in available state
        await assertPlanItemState(caseInstance, 'GetList', 0, user, 'Available');
        await assertPlanItemState(caseInstance, 'GetDetails', 0, user, 'Available');
        
        // Create the CaseFileItem Request only with port
        const casefile = await caseFileService.createCaseFileItem(caseInstance, user, "HTTPConfig", inputs)
        await ServerSideProcessing();

        // MockService is not yet started. So, GetList goes to Failed state
        await assertPlanItemState(caseInstance, 'GetList', 0, user, 'Failed');

        // GetDetails remains in Available state
        await assertPlanItemState(caseInstance, 'GetDetails', 0, user, 'Available');

        // GetList Failed should be in completed state
        await assertPlanItemState(caseInstance, 'GetList Failed', 0, user, 'Completed');

        // Let the timer complete
        await SomeTime(2000, 'Waiting for 2 seconds')

        // Let the process task complete
        await ServerSideProcessing();

        // MockService is not yet started. So, GetList goes to Failed state
        await assertPlanItemState(caseInstance, 'GetList', 1, user, 'Failed');

        // GetDetails remains in Available state
        await assertPlanItemState(caseInstance, 'GetDetails', 0, user, 'Available');

        // Starting mock service
        mock.start()

        await assertPlanItemState(caseInstance, 'GetList Failed', 0, user, 'Completed');

        // Let the timer complete
        await SomeTime(2000, 'Waiting for 2 seconds')

        // Now, GetList should be completed
        await assertPlanItemState(caseInstance, 'GetList', 2, user, 'Completed');

        // Wait until we have the 4 GetDetails tasks getting completed
        await ServerSideProcessing();

        // GetDetails tasks of index upto 3 has to be completed
        for(let i=0; i<4; i++) {
            await assertPlanItemState(caseInstance, 'GetDetails', i, user, 'Completed');
        }

        const exceptionCaseFile = await caseFileService.getCaseFile(caseInstance, user)

        // Verifying exception case file content
        for(let i=0; i<2; i++) {
            if(exceptionCaseFile.file.Exception[i] != 'Connection refused: connect') {
                throw new Error('The content in exception case file is not as expected')
            }
        }
        if(exceptionCaseFile.file.Exception[3] != null) {
            throw new Error('The content in exception case file is not as expected')
        }

        // In the end, stop the mock service, such that the test completes.
        await mock.stop();
    }    
}