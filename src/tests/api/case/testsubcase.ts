'use strict';

import RepositoryService from "../../../framework/service/case/repositoryservice";
import CaseService from "../../../framework/service/case/caseservice";
import TaskService from "../../../framework/service/task/taskservice";
import WorldWideTestTenant from "../../worldwidetesttenant";
import TestCase from "../../../framework/test/testcase";
import { findTask, assertTask, assertCaseTeamMember, assertCasePlanState } from "../../../framework/test/assertions";
import Case from "../../../framework/cmmn/case";
import CaseFileService from "../../../framework/service/case/casefileservice";
import User from "../../../framework/user";
import CaseTeamMember, { CaseOwner } from "../../../framework/cmmn/caseteammember";
import PlanItem from "../../../framework/cmmn/planitem";

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
        await repositoryService.validateAndDeploy(definition, sender, tenant);
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
        const caseInstance = await caseService.startCase(startCase, sender) as Case;

        // Sender creates Greet case file item
        await caseFileService.createCaseFileItem(caseInstance, sender, 'Greet', inputs.Greet);

        // Retrieve subcase 
        const parentCaseInstance = await caseService.getCase(caseInstance, sender);
        const subCase = parentCaseInstance.planitems.find(item => item.name === 'call helloworld') as PlanItem;
        
        // Sender is the owner of the parent case and receiver doesn't exist in the parent case
        await assertCaseTeamMember(new CaseOwner(sender, []), caseInstance, sender);
        await assertCaseTeamMember(new CaseTeamMember(receiver, []), caseInstance, sender, false);

        // Get subcase is possible by sender
        const childCaseInstance = await caseService.getCase({id: subCase.id} as Case, sender);

        // Sender is the owner of the subcase and receiver doesn't exist in the subcase yet
        await assertCaseTeamMember(new CaseOwner(sender, []), childCaseInstance, sender);
        await assertCaseTeamMember(new CaseTeamMember(receiver, []), childCaseInstance, sender, false);

        // Get Receive Greeting task
        const receiveTaskName = 'Receive Greeting and Send response';
        const tasks = await taskService.getCaseTasks(childCaseInstance, sender);
        const receiveGreetingTask = findTask(tasks, receiveTaskName);

        // Complete Receive Greeting task by sender
        await taskService.completeTask(receiveGreetingTask, sender, taskOutput);

        // Get Read Response task
        const responseTaskName = 'Read response';
        const nextTasks = await taskService.getCaseTasks(childCaseInstance, sender);
        const readResponseTask = findTask(nextTasks, responseTaskName);

        // Sender assigns the Read Response task to receiver
        await taskService.assignTask(readResponseTask, sender, receiver);

        // Now, receiver is part of the subcase team and completes the Read Response task
        await assertCaseTeamMember(new CaseTeamMember(receiver, []), childCaseInstance, sender);

        // Receiver completes the Read Response task
        await taskService.completeTask(readResponseTask, receiver);

        // Both subcase and parent case plans should be completed
        await assertCasePlanState(childCaseInstance, sender, 'Completed');
        await assertCasePlanState(parentCaseInstance, sender, 'Completed');

        // Still, receiver should not be part of the parent case team
        await assertCaseTeamMember(new CaseTeamMember(receiver, []), parentCaseInstance, sender, false);
    }
}