'use strict';

import CaseService from '../../framework/service/case/caseservice';
import TaskService from '../../framework/service/task/taskservice';
import TestCase from '../../framework/test/testcase';
import WorldWideTestTenant from '../worldwidetesttenant';
import RepositoryService from '../../framework/service/case/repositoryservice';
import { assertTask, verifyTaskInput, assertCasePlanState, findTask } from '../../framework/test/assertions';
import CaseTeam from '../../framework/cmmn/caseteam';
import CaseTeamMember, { CaseOwner } from '../../framework/cmmn/caseteammember';
import Case from '../../framework/cmmn/case';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const employee = worldwideTenant.employee;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestHelloworld extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(sender, definition, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: sender.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(employee), new CaseTeamMember(sender), new CaseTeamMember(receiver)]);
        
        const startCase = { tenant, definition, inputs, caseTeam, debug: true };

        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };

        const caseInstance = await caseService.startCase(sender, startCase);

        const cases = await caseService.getCases(sender, { tenant: tenant, numberOfResults: 10000 });
        console.log("We have " + cases.length + " cases ...");

        const taskName = 'Receive Greeting and Send response';
        const freshCaseInstance = await caseService.getCase(sender, caseInstance);
        const planItem = freshCaseInstance.planitems.find(p => p.name === taskName);
        if (!planItem) {
            throw new Error('Cannot find plan item ' + taskName);
        }

        const tasks = await taskService.getCaseTasks(sender, caseInstance);
        const receiveGreetingTask = findTask(tasks, taskName);
        await verifyTaskInput(receiveGreetingTask, inputs)

        await taskService.claimTask(receiver, receiveGreetingTask);
        await assertTask(sender, receiveGreetingTask, 'Claim', 'Assigned', receiver);

        await taskService.completeTask(receiver, receiveGreetingTask, taskOutput);
        await assertTask(sender, receiveGreetingTask, 'Complete', 'Completed', receiver);

        const responseTaskName = 'Read response';
        const nextTasks = await taskService.getCaseTasks(sender, caseInstance);
        const readResponseTask = findTask(nextTasks, responseTaskName);
        if (readResponseTask.assignee !== sender.id) {
            throw new Error('Expecting task to be assigned to sending user');
        }
        await taskService.completeTask(sender, readResponseTask);
        await assertTask(sender, readResponseTask, 'Complete', 'Completed', sender, sender, sender);

        await assertCasePlanState(sender, caseInstance, 'Completed');
    }
}