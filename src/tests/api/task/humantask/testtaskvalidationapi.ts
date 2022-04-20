'use strict';

import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import TaskService from '@cafienne/typescript-client/service/task/taskservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../../worldwidetesttenant';
import { ServerSideProcessing } from '@cafienne/typescript-client/test/time';
import TaskContent from './taskcontent';
import Comparison from '@cafienne/typescript-client/test/comparison';
import { assertPlanItem } from '@cafienne/typescript-client/test/caseassertions/plan'
import MockServer from '@cafienne/typescript-client/mock/mockserver';
import GetMock from '@cafienne/typescript-client/mock/getmock';
import PostMock from '@cafienne/typescript-client/mock/postmock';
import State from '@cafienne/typescript-client/cmmn/state';

const definition = 'taskoutputvalidation.xml';

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

new PostMock(mock, '/validate', call => {
    call.onJSONContent((post:any) => {
        const taskContent = post['task-output'];
        const isInvalidDecision = Comparison.sameJSON(taskContent, TaskContent.TaskOutputInvalidDecision);
        const isKillSwitch = Comparison.sameJSON(taskContent, TaskContent.TaskOutputThatFailsValidation);
        const isValidDecision = Comparison.sameJSON(taskContent, TaskContent.TaskOutputDecisionApproved) || Comparison.sameJSON(post, TaskContent.TaskOutputDecisionCanceled);
        if (isKillSwitch) {
            call.fail(500, 'Something went really wrong in here');
        } else {
            const response = isInvalidDecision ? TaskContent.InvalidDecisionResponse : {};
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
        await RepositoryService.validateAndDeploy(pete, definition, tenant);
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
        let caseInstance = await CaseService.startCase(pete, startCase);
        caseInstance = await CaseService.getCase(pete, caseInstance);

        await pingMock.untilCallInvoked(3000);

        // Since process completion happens asynchronously in the Cafienne engine, we will still wait 
        //  a second before continuing the test script
        await ServerSideProcessing();

        caseInstance = await CaseService.getCase(pete, caseInstance);

        await assertPlanItem(pete, caseInstance, 'AssertMockServiceIsRunning', 0, State.Completed);

        const taskId = caseInstance.planitems.find(p => p.name === 'HumanTask')?.id;
        if (!taskId) {
            throw new Error('Expecting a task with name "HumanTask", but the case does not seem to have one');
        }

        const tasks = await TaskService.getCaseTasks(pete, caseInstance);
        const decisionTask = tasks.find(t => t.taskName === 'HumanTask')
        if (! decisionTask) {
            throw new Error('Expecting a task with name "HumanTask", but the case does not seem to have one');
        }

        const taskWithDefaultValidation = tasks.find(t => t.taskName == 'HumanTaskWithDefaultValidation')
        if (! taskWithDefaultValidation) {
            throw new Error('Expecting a task with name "HumanTaskWithDefaultValidation", but the case does not seem to have one');
        }

        // It should not be possible to validate task output if the task has not yet been claimed.
        // await TaskService.validateTaskOutput(pete, decisionTask, TaskContent.TaskOutputDecisionCanceled, 400);

        // Claim the task - should not fail
        await TaskService.claimTask(pete, decisionTask);

        // Validating with proper output should not result in any issue
        await TaskService.validateTaskOutput(pete, decisionTask, TaskContent.TaskOutputDecisionCanceled);

        // But gimy should not be able to do it
        await TaskService.validateTaskOutput(gimy, decisionTask, TaskContent.TaskOutputDecisionCanceled, 404);

        // Sending the "KILL-SWITCH" should result in an error
        await TaskService.validateTaskOutput(pete, decisionTask, TaskContent.TaskOutputThatFailsValidation, 400);

        // Sending an invalid task output should not result in an error, be it should return non-empty json matching InvalidDecisionResponse
        await TaskService.validateTaskOutput(pete, decisionTask, TaskContent.TaskOutputInvalidDecision).then(validationResult => {
            // TODO: this should probably become some sort of an assertion
            if (! Comparison.sameJSON(validationResult, TaskContent.InvalidDecisionResponse)) {
                throw new Error('Task validation did not result in the right error. Received ' + JSON.stringify(validationResult));
            }    
        });

        // Sending valid task output should result in an empty json response.
        await TaskService.validateTaskOutput(pete, decisionTask, TaskContent.TaskOutputDecisionCanceled).then(validationResult => {
            if (! Comparison.sameJSON(validationResult, {})) {
                throw new Error('Expecting empty json structure from task validation. Unexpectedly received ' + JSON.stringify(validationResult));
            }    
        });

        // Validating the same with proper task output should again not fail
        await TaskService.validateTaskOutput(pete, decisionTask, TaskContent.TaskOutputDecisionApproved);

        // It should be possible to temporarily save invalid output
        await TaskService.saveTaskOutput(pete, decisionTask, TaskContent.TaskOutputInvalidDecision);

        // It should NOT be possible to complete the task with invalid output
        await TaskService.completeTask(pete, decisionTask, TaskContent.TaskOutputInvalidDecision, 400);

        // It should be possible to complete the task with decision approved
        await TaskService.completeTask(pete, decisionTask, TaskContent.TaskOutputDecisionApproved);

        // Default output validation should fail on booleans that are passed as string
        await TaskService.validateTaskOutput(pete, taskWithDefaultValidation, TaskContent.TaskOutputInvalidBooleanProperty, 400);

        // Default output validation should fail on integers that are passed as string
        await TaskService.validateTaskOutput(pete, taskWithDefaultValidation, TaskContent.TaskOutputInvalidIntegerProperty, 400);

        // Default output validation should fail on invalid time formats
        await TaskService.validateTaskOutput(pete, taskWithDefaultValidation, TaskContent.TaskOutputInvalidTimeProperty, 400);

        // It should be possible to complete the task with decision approved
        await TaskService.validateTaskOutput(pete, taskWithDefaultValidation, TaskContent.TaskOutputValidProperties);

        // In the end, stop the mock service, such that the test completes.
        // await mock.stop();
    }
}
