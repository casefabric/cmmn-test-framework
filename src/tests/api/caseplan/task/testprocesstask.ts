'use strict';

import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../../worldwidetesttenant';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import CasePlanService from '@cafienne/typescript-client/service/case/caseplanservice';
import CaseFileService from '@cafienne/typescript-client/service/case/casefileservice';
import MockServer from '@cafienne/typescript-client/mock/mockserver';
import PostMock from '@cafienne/typescript-client/mock/postmock';
import { assertPlanItem } from '@cafienne/typescript-client/test/caseassertions/plan';
import assertCaseFileContent from '@cafienne/typescript-client/test/caseassertions/file';
import Transition from '@cafienne/typescript-client/cmmn/transition';
import State from '@cafienne/typescript-client/cmmn/state';

const definition = 'processtasktest.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const mockPort = 18083;
const mock = new MockServer(mockPort);
new PostMock(mock, '/get/code/:code', call => {
    const code = Number(call.req.params['code']);
    call.onContent((body: string) => {
        console.log(`Returning ${code} with ${body}`);
        call.res.status(code).write(body);
        call.res.end();
    })
    // call.fail(400, 'Bullls')
})

export default class TestProcessTask extends TestCase {
    async onPrepareTest() {
        await mock.start();
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const inputs = {
            HTTPConfig: {
                port: mockPort
            }
        }

        const startCase = { tenant, definition, inputs };

        // Starts the case with user
        const caseInstance = await CaseService.startCase(user, startCase).then(async id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);

        const okServiceInput = {
            code: 200,
            payload: {
                description: "Great to see this work"
            }
        }

        await CaseFileService.createCaseFileItem(user, caseInstance, 'ServiceInput', okServiceInput);
        await CasePlanService.makePlanItemTransition(user, caseInstance, 'Get OK', Transition.Occur);

        await assertPlanItem(user, caseInstance, 'Get Object Response', 0, State.Completed);

        await CaseFileService.getCaseFile(user, caseInstance).then(file => {
            console.log("Case File " + JSON.stringify(file, undefined, 2));
        })

        await assertCaseFileContent(user, caseInstance, 'ResponseMessage', 'OK');
        await assertCaseFileContent(user, caseInstance, 'SuccessObject', okServiceInput.payload);
        await assertCaseFileContent(user, caseInstance, 'ErrorOutcome', undefined);

        const failureServiceInput = {
            code: 500,
            payload: 'If you feed me with errors, I will return them'
        }
        await CaseFileService.updateCaseFileItem(user, caseInstance, 'ServiceInput', failureServiceInput);
        await CasePlanService.makePlanItemTransition(user, caseInstance, 'Get Error', Transition.Occur);

        await assertPlanItem(user, caseInstance, 'Get Error Response', 0, State.Failed);

        await CaseFileService.getCaseFile(user, caseInstance).then(file => {
            console.log("Case File " + JSON.stringify(file, undefined, 2));
        })

        await assertCaseFileContent(user, caseInstance, 'ResponseMessage', 'Internal Server Error');
        await assertCaseFileContent(user, caseInstance, 'SuccessObject', okServiceInput.payload);
        await assertCaseFileContent(user, caseInstance, 'ErrorOutcome', failureServiceInput.payload);
        await assertCaseFileContent(user, caseInstance, 'ErrorCode', failureServiceInput.code);

        console.log(`\nCase ID: ${caseInstance.id}\n`);

        // In the end, stop the mock service, such that the test completes.
        await mock.stop();
    }
}
