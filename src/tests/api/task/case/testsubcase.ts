'use strict';

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

        // And now check parent case. It must be in failed state because issues in complex case
        await assertCasePlan(sender, caseInstance, State.Completed);

        // Still, receiver should not be part of the parent case team
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(receiver, []), false);
    }
}