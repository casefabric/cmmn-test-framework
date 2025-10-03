'use strict';

import Definitions from '../../cmmn/definitions/definitions';
import State from '../../cmmn/state';
import Task, { taskPrinter } from '../../cmmn/task';
import TaskState from '../../cmmn/taskstate';
import CaseTeam from '../../cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../cmmn/team/caseteamuser";
import CaseService from '../../service/case/caseservice';
import TaskService from '../../service/task/taskservice';
import { assertCasePlan } from '../../test/caseassertions/plan';
import { assertTask, findTask, verifyTaskInput } from '../../test/caseassertions/task';
import TestCase from '../../test/testcase';
import WorldWideTestTenant from '../setup/worldwidetesttenant';

const definition = Definitions.HelloWorld;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const employee = worldwideTenant.employee;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestHelloworld extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(sender, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: sender.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(employee), new CaseTeamUser(sender), new CaseTeamUser(receiver)]);
        
        const startCase = { tenant, definition, inputs, caseTeam, debug: true };

        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };

        const caseInstance = await CaseService.startCase(sender, startCase);
        this.addIdentifier(caseInstance);
        await TaskService.getCaseTasks(sender, caseInstance).then(taskPrinter);

        const cases = await CaseService.getCases(sender, { tenant: tenant, numberOfResults: 10000 });
        console.log("We have " + cases.length + " cases ...");

        const taskName = 'Receive Greeting and Send response';
        const freshCaseInstance = await CaseService.getCase(sender, caseInstance);
        const planItem = freshCaseInstance.planitems.find(p => p.name === taskName);
        if (!planItem) {
            throw new Error('Cannot find plan item ' + taskName);
        }

        const tasks = await TaskService.getCaseTasks(sender, caseInstance);
        const receiveGreetingTask = findTask(tasks, taskName);
        verifyTaskInput(receiveGreetingTask, inputs)

        await TaskService.claimTask(receiver, receiveGreetingTask);
        await assertTask(sender, receiveGreetingTask, 'Claim', TaskState.Assigned, receiver);

        await TaskService.completeTask(receiver, receiveGreetingTask, taskOutput);
        await assertTask(sender, receiveGreetingTask, 'Complete', TaskState.Completed, receiver);

        const responseTaskName = 'Read response';
        const nextTasks = await TaskService.getCaseTasks(sender, caseInstance).then(taskPrinter);
        const readResponseTask = findTask(nextTasks, responseTaskName);
        if (readResponseTask.assignee !== sender.id) {
            throw new Error('Expecting task to be assigned to sending user, but found ' + readResponseTask.assignee + ' instead');
        }
        await TaskService.completeTask(sender, readResponseTask);
        await assertTask(sender, readResponseTask, 'Complete', TaskState.Completed, sender, sender, sender);

        await assertCasePlan(sender, caseInstance, State.Completed);

        console.log(`\nCase ID: ${freshCaseInstance.id}\n`);
    }
}
