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
        await repositoryService.validateAndDeploy(definition, sender, tenant);
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

        const caseInstance = await caseService.startCase(startCase, sender) as Case;

        const cases = await caseService.getCases(sender, { tenant: tenant, numberOfResults: 10000 });
        console.log("We have " + cases.length + " cases ...");

        const taskName = 'Receive Greeting and Send response';
        const freshCaseInstance = await caseService.getCase(caseInstance, sender);
        const planItem = freshCaseInstance.planitems.find(p => p.name === taskName);
        if (!planItem) {
            throw new Error('Cannot find plan item ' + taskName);
        }

        const tasks = await taskService.getCaseTasks(caseInstance, sender);
        const receiveGreetingTask = findTask(tasks, taskName);
        await verifyTaskInput(receiveGreetingTask, inputs)

        await taskService.claimTask(receiveGreetingTask, receiver);
        await assertTask(receiveGreetingTask, sender, 'Claim', 'Assigned', receiver);

        await taskService.completeTask(receiveGreetingTask, receiver, taskOutput);
        await assertTask(receiveGreetingTask, sender, 'Complete', 'Completed', receiver);

        const responseTaskName = 'Read response';
        const nextTasks = await taskService.getCaseTasks(caseInstance, sender);
        const readResponseTask = findTask(nextTasks, responseTaskName);
        if (readResponseTask.assignee !== sender.id) {
            throw new Error('Expecting task to be assigned to sending user');
        }
        await taskService.completeTask(readResponseTask, sender);
        await assertTask(readResponseTask, sender, 'Complete', 'Completed', sender);

        await assertCasePlanState(caseInstance, sender, 'Completed');
    }
}