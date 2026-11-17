'use strict';

import Case from "../../../../cmmn/case";
import Definitions from "../../../../cmmn/definitions/definitions";
import PlanItem from "../../../../cmmn/planitem";
import State from "../../../../cmmn/state";
import CaseTeamUser, { CaseOwner } from "../../../../cmmn/team/caseteamuser";
import CaseFileService from "../../../../service/case/casefileservice";
import CaseService from "../../../../service/case/caseservice";
import TaskService from "../../../../service/task/taskservice";
import { assertCasePlan, assertPlanItem } from "../../../../test/caseassertions/plan";
import { findTask } from "../../../../test/caseassertions/task";
import { assertCaseTeamUser } from "../../../../test/caseassertions/team";
import TestCase from "../../../../test/testcase";
import WorldWideTestTenant from "../../../setup/worldwidetesttenant";
import ListDetailsMock from "../process/http/listdetailsmock";
import CasePlanService from "../../../../service/case/caseplanservice";

const definition = Definitions.SubCaseTest;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

const mockPort = 17382;
const mock = new ListDetailsMock(mockPort).start();

export default class TestSubCase extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(sender, tenant);
    }

    async run() {
        const inputs = {
            Greet: {
                Message: 'Hello there',
                From: sender.id
            }
        };
        const startCase = { tenant, definition };
        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };

        // Sender starts the parent case
        const caseInstance = await CaseService.startCase(sender, startCase).then(async ci => await CaseService.getCase(sender, ci));
        this.addIdentifier(caseInstance);

        // Fetch complex case and assert that it is in failed state
        const complexCaseTask = await assertPlanItem(sender, caseInstance, 'complexcase', -1, State.Failed);
        this.addIdentifier(complexCaseTask);
        const complexCase = await CaseService.getCase(sender, complexCaseTask!.id);
        const getlist_getdetails_Task = await assertPlanItem(sender, complexCase, 'getlist_getdetails', -1, State.Failed);
        const getListGetDetailsCase = await CaseService.getCase(sender, getlist_getdetails_Task!.id);

        // The blocking complex case is a child of the parent case
        this.assertCaseHierarchy(complexCase, caseInstance.id, caseInstance.id);

        // The non-blocking complex case task completes as soon as its case is started.
        // That case has no parent, but it does have the same root.
        const nonBlockingComplexCaseTask = await assertPlanItem(sender, caseInstance, 'non blocking complexcase', -1, State.Completed);
        this.addIdentifier(nonBlockingComplexCaseTask);
        const nonBlockingComplexCase = await assertCasePlan(sender, nonBlockingComplexCaseTask.id);
        this.assertCaseHierarchy(nonBlockingComplexCase, '', caseInstance.id);

        // Like the blocking one, the non-blocking complex case fails because its getlist_getdetails subcase fails.
        // But that failure must not reach the parent case: the task in the parent case remains completed.
        await assertCasePlan(sender, nonBlockingComplexCase, State.Failed);
        await assertPlanItem(sender, caseInstance, nonBlockingComplexCaseTask.name, nonBlockingComplexCaseTask.index, State.Completed);

        // A non-blocking task one level deeper: the complex case starts HelloWorld without blocking.
        // Also that case has no parent, and its root is still the top case.
        const nonBlockingHelloWorldTask = await assertPlanItem(sender, complexCase, 'Non Blocking HelloWorld', -1, State.Completed);
        this.addIdentifier(nonBlockingHelloWorldTask);
        const nonBlockingHelloWorldCase = await assertCasePlan(sender, nonBlockingHelloWorldTask.id, State.Active);
        this.assertCaseHierarchy(nonBlockingHelloWorldCase, '', caseInstance.id);

        // Update HTTPConfig case file item to have proper mock service port. This will make GetList task to succeed when the timer goes off.
        await CaseFileService.updateCaseFileItem(sender, getListGetDetailsCase, "HTTPConfig", { port: mockPort });

        // Sender creates Greet case file item
        await CaseFileService.createCaseFileItem(sender, caseInstance, 'Greet', inputs.Greet);       

        // Sender is the owner of the parent case and receiver doesn't exist in the parent case
        await assertCaseTeamUser(sender, caseInstance, new CaseOwner(sender, []));
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(receiver, []), false);


        // Retrieve subcase 
        const helloworldCaseTask = caseInstance.planitems.find(item => item.name === 'call helloworld') as PlanItem;
        this.addIdentifier(helloworldCaseTask.id);
        await assertPlanItem(sender, caseInstance, helloworldCaseTask.name, helloworldCaseTask.index, State.Active);

        // Get subcase is possible by sender
        const helloworldCase = await assertCasePlan(sender, helloworldCaseTask.id, State.Active);

        // Sender is the owner of the subcase and receiver doesn't exist in the subcase yet
        await assertCaseTeamUser(sender, helloworldCase, new CaseOwner(sender, []));
        await assertCaseTeamUser(sender, helloworldCase, new CaseTeamUser(receiver, []), false);

        // Get Receive Greeting task
        const receiveTaskName = 'Receive Greeting and Send response';
        const tasks = await TaskService.getCaseTasks(sender, helloworldCase);
        const receiveGreetingTask = findTask(tasks, receiveTaskName);

        // Complete Receive Greeting task by sender
        await TaskService.completeTask(sender, receiveGreetingTask, taskOutput);

        // Get Read Response task
        const responseTaskName = 'Read response';
        const nextTasks = await TaskService.getCaseTasks(sender, helloworldCase);
        const readResponseTask = findTask(nextTasks, responseTaskName);

        // Sender assigns the Read Response task to receiver
        await TaskService.assignTask(sender, readResponseTask, receiver);

        // Now, receiver is part of the subcase team and completes the Read Response task
        await assertCaseTeamUser(sender, helloworldCase, new CaseTeamUser(receiver, []));

        // Receiver completes the Read Response task
        await TaskService.completeTask(receiver, readResponseTask);

        // Both subcase and parent case plans should be completed
        await assertCasePlan(sender, helloworldCase, State.Completed);

        // Give the server some time to respond back from subcase to parent case
        await assertPlanItem(sender, caseInstance, helloworldCaseTask.name, helloworldCaseTask.index, State.Completed);

        await assertPlanItem(sender, getListGetDetailsCase, "Case exists 2 seconds", -1, State.Completed);

        await assertPlanItem(sender, getListGetDetailsCase, 'GetList', -1, State.Completed);

        // Now terminate the complex case and check if the main case reaches completion.
        await CasePlanService.raiseEvent(sender, complexCase, 'Terminate Case');

        // And now check parent case. It completes, because the complex case is terminated.
        await assertCasePlan(sender, caseInstance, State.Completed);

        // The non-blocking cases are not affected by the termination of the complex case and the completion of the parent case
        await assertCasePlan(sender, nonBlockingHelloWorldCase, State.Active);
        await assertCasePlan(sender, nonBlockingComplexCase, State.Failed);

        // Still, receiver should not be part of the parent case team
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(receiver, []), false);
    }

    /**
     * Asserts the parent and root of a case. An empty expected parent means the case must not have a parent.
     */
    assertCaseHierarchy(caseInstance: Case, expectedParentId: string, expectedRootId: string) {
        const parentId = caseInstance.parentCaseId || '';
        if (parentId !== expectedParentId) {
            throw new Error(`Case ${caseInstance.caseName} [${caseInstance.id}] should have parent '${expectedParentId}' but has '${parentId}'`);
        }
        if (caseInstance.rootCaseId !== expectedRootId) {
            throw new Error(`Case ${caseInstance.caseName} [${caseInstance.id}] should have root '${expectedRootId}' but has '${caseInstance.rootCaseId}'`);
        }
    }
}