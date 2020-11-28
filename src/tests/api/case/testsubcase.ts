'use strict';

import RepositoryService from "../../../framework/service/case/repositoryservice";
import CaseService from "../../../framework/service/case/caseservice";
import TaskService from "../../../framework/service/task/taskservice";
import WorldWideTestTenant from "../../worldwidetesttenant";
import TestCase from "../../../framework/test/testcase";
import { findTask, assertCaseTeamMember, assertCasePlanState, assertPlanItemState } from "../../../framework/test/assertions";
import Case from "../../../framework/cmmn/case";
import CaseFileService from "../../../framework/service/case/casefileservice";
import CaseTeamMember, { CaseOwner } from "../../../framework/cmmn/caseteammember";
import PlanItem from "../../../framework/cmmn/planitem";
import { ServerSideProcessing } from "../../../framework/test/time";

const repositoryService = new RepositoryService();
const caseService = new CaseService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const caseFileService = new CaseFileService();

const definition = 'subcasetest.xml';
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestSubCase extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(sender, definition, tenant);
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
        const caseInstance = await caseService.startCase(sender, startCase) as Case;

        // Sender creates Greet case file item
        await caseFileService.createCaseFileItem(sender, caseInstance, 'Greet', inputs.Greet);

        // Retrieve subcase 
        const parentCaseInstance = await caseService.getCase(sender, caseInstance);
        const subCase = parentCaseInstance.planitems.find(item => item.name === 'call helloworld') as PlanItem;
        
        // Sender is the owner of the parent case and receiver doesn't exist in the parent case
        await assertCaseTeamMember(sender, caseInstance, new CaseOwner(sender, []));
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember(receiver, []), false);

        await assertPlanItemState(sender, caseInstance, subCase.name, subCase.index, 'Active', 10, 2000);

        // Get subcase is possible by sender
        const childCaseInstance = await caseService.getCase(sender, subCase.id);

        // Sender is the owner of the subcase and receiver doesn't exist in the subcase yet
        await assertCaseTeamMember(sender, childCaseInstance, new CaseOwner(sender, []));
        await assertCaseTeamMember(sender, childCaseInstance, new CaseTeamMember(receiver, []), false);

        // Get Receive Greeting task
        const receiveTaskName = 'Receive Greeting and Send response';
        const tasks = await taskService.getCaseTasks(sender, childCaseInstance);
        const receiveGreetingTask = findTask(tasks, receiveTaskName);

        // Complete Receive Greeting task by sender
        await taskService.completeTask(sender, receiveGreetingTask, taskOutput);

        // Get Read Response task
        const responseTaskName = 'Read response';
        const nextTasks = await taskService.getCaseTasks(sender, childCaseInstance);
        const readResponseTask = findTask(nextTasks, responseTaskName);

        // Sender assigns the Read Response task to receiver
        await taskService.assignTask(sender, readResponseTask, receiver);

        // Now, receiver is part of the subcase team and completes the Read Response task
        await assertCaseTeamMember(sender, childCaseInstance, new CaseTeamMember(receiver, []));

        // Receiver completes the Read Response task
        await taskService.completeTask(receiver, readResponseTask);

        // Both subcase and parent case plans should be completed
        await assertCasePlanState(sender, childCaseInstance, 'Completed');

        // Give the server some time to respond back from subcase to parent case
        await assertPlanItemState(sender, caseInstance, subCase.name, subCase.index, 'Completed', 10, 2000);

        // And now check parent case.
        await assertCasePlanState(sender, parentCaseInstance, 'Completed');

        // Still, receiver should not be part of the parent case team
        await assertCaseTeamMember(sender, parentCaseInstance, new CaseTeamMember(receiver, []), false);
    }
}