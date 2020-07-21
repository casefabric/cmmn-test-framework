'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import TaskService from '../../../framework/service/task/taskservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import { ServerSideProcessing } from '../../../framework/test/time';
import TaskContent from './taskcontent';
import Comparison from '../../../framework/test/comparison';
import { assertPlanItemState } from '../../../framework/test/assertions'
import Case from '../../../framework/cmmn/case';
import MockServer from '../../../framework/mock/mockserver';
import GetMock from '../../../framework/mock/getmock';
import PostMock from '../../../framework/mock/postmock';

const repositoryService = new RepositoryService();
const definition = 'taskoutputvalidation.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const pete = worldwideTenant.sender;
const gimy = worldwideTenant.receiver;

const mockPort = 27382;
const mock = new MockServer(mockPort);
const pingMock = new GetMock(mock, '/ping', call => {
    // Return immediately a code 200
    call.json();
    const waitSome = Math.random() * 300;
    setTimeout(() => {
        call.setSyncMessage('Received ping msg - waited ' + waitSome +' before giving it to you :)');
    }, waitSome)
});

const validateMock = new PostMock(mock, '/validate', call => {
    // TODO: There must be something more handy to parse the post contents, but could not find it quickly enough...
    let body = ''
    call.req.on('data', data => body += data);
    call.req.on('end', () => {
        const post = JSON.parse(body);

        const taskContent = post['task-output'];

        const isInvalidDecision = Comparison.sameJSON(taskContent, TaskContent.TaskOutputInvalidDecision);
        const isKillSwitch = Comparison.sameJSON(taskContent, TaskContent.TaskOutputThatFailsValidation);
        const isValidDecision = Comparison.sameJSON(taskContent, TaskContent.TaskOutputDecisionApproved) || Comparison.sameJSON(post, TaskContent.TaskOutputDecisionCanceled);
        if (isKillSwitch) {
            call.fail(500, 'Something went really wrong in here');
        } else {
            const response = isInvalidDecision ? TaskContent.InvalidDecisionResponse : {};
            const json = JSON.stringify(response, undefined, 2);
            call.json(response);
        }
    });
});


export default class TestTaskValidationAPI extends TestCase {
    // private 
    async onPrepareTest() {
        console.log("Starting mock servive in test preparation");
        await mock.start();
        console.log("\n\n============Started mock server. Now creating tenant\n\n");
        await worldwideTenant.create();
        // Deploy the case model
        await repositoryService.validateAndDeploy(definition, pete, tenant);
    }

    async run() {
        const inputs = {
            TaskInput: {
                Assignee: 'me, myself and I',
                Content: {
                    Subject: 'Decide on this topic, please',
                    Decision: 'Yet to be decided'
                }
            },
            HTTPConfig: {
                port: mockPort
            }
        }

        const startCase = { tenant, definition, inputs };
        let caseInstance = await caseService.startCase(startCase, pete) as Case;
        caseInstance = await caseService.getCase(caseInstance, pete);

        await pingMock.untilCallInvoked(3000);

        // Since process completion happens asynchronously in the Cafienne engine, we will still wait 
        //  a second before continuing the test script
        await ServerSideProcessing();

        caseInstance = await caseService.getCase(caseInstance, pete);

        await assertPlanItemState(caseInstance, 'AssertMockServiceIsRunning', 0, pete, 'Completed')

        const taskId = caseInstance.planitems.find(p => p.name === 'HumanTask')?.id;
        if (!taskId) {
            throw new Error('Expecting a task with name "HumanTask", but the case does not seem to have one');
        }

        const tasks = await taskService.getCaseTasks(caseInstance, pete);
        const decisionTask = tasks.find(t => t.taskName === 'HumanTask')
        if (! decisionTask) {
            throw new Error('Expecting a task with name "HumanTask", but the case does not seem to have one');
        }

        // It should not be possible to validate task output if the task has not yet been claimed.
        // await taskService.validateTaskOutput(decisionTask, pete, TaskContent.TaskOutputDecisionCanceled, false);

        // Claim the task - should not fail
        await taskService.claimTask(decisionTask, pete);

        // Validating with proper output should not result in any issue
        await taskService.validateTaskOutput(decisionTask, pete, TaskContent.TaskOutputDecisionCanceled);

        // But gimy should not be able to do it
        await taskService.validateTaskOutput(decisionTask, gimy, TaskContent.TaskOutputDecisionCanceled, false);

        // Sending the "KILL-SWITCH" should result in an error
        await taskService.validateTaskOutput(decisionTask, pete, TaskContent.TaskOutputThatFailsValidation, false);

        // Sending an invalid task output should not result in an error, be it should return non-empty json matching InvalidDecisionResponse
        await taskService.validateTaskOutput(decisionTask, pete, TaskContent.TaskOutputInvalidDecision).then(validationResult => {
            // TODO: this should probably become some sort of an assertion
            if (! Comparison.sameJSON(validationResult, TaskContent.InvalidDecisionResponse)) {
                throw new Error('Task validation did not result in the right error. Received ' + JSON.stringify(validationResult));
            }    
        });

        // Sending valid task output should result in an empty json response.
        await taskService.validateTaskOutput(decisionTask, pete, TaskContent.TaskOutputDecisionCanceled).then(validationResult => {
            if (! Comparison.sameJSON(validationResult, {})) {
                throw new Error('Expecting empty json structure from task validation. Unexpectedly received ' + JSON.stringify(validationResult));
            }    
        });

        // Validating the same with proper task output should again not fail
        await taskService.validateTaskOutput(decisionTask, pete, TaskContent.TaskOutputDecisionApproved);

        // It should be possible to temporarily save invalid output
        await taskService.saveTaskOutput(decisionTask, pete, TaskContent.TaskOutputInvalidDecision);

        // It should NOT be possible to complete the task with invalid output
        await taskService.completeTask(decisionTask, pete, TaskContent.TaskOutputInvalidDecision, false);

        // It should be possible to complete the task with decision approved
        await taskService.completeTask(decisionTask, pete, TaskContent.TaskOutputDecisionApproved);

        // In the end, stop the mock service, such that the test completes.
        // await mock.stop();
    }
}
