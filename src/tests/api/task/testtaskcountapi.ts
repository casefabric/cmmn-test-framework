'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TaskService, { TaskCount } from '../../../framework/service/task/taskservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import Case from '../../../framework/cmmn/case';
import User from '../../../framework/user';
import Task from '../../../framework/cmmn/task';
import CasePlanService from '../../../framework/service/case/caseplanservice';

const repositoryService = new RepositoryService();
const definition = 'helloworld2.xml';

const caseService = new CaseService();
const casePlanService = new CasePlanService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestTaskCountAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: user.id
            }
        };

        const startCase = { tenant, definition, inputs };

        const taskCountBefore = await taskService.countTasks(user, {tenant}) as TaskCount;
        console.log(`Task Count before starting new cases and claiming a task: ${JSON.stringify(taskCountBefore, undefined, 2)}`);

        // Start 3 cases and claim 1 task. Should lead to 5 unclaimed tasks (3 times "Task that is always started", and 2 times "SendResponse") and 1 claimed "SendResponse" task
        await caseService.startCase(user, startCase);
        await caseService.startCase(user, startCase);
        const caseStarted = await caseService.startCase(user, startCase) as Case;
        const caseInstance = await caseService.getCase(user, caseStarted);

        const tasks = await taskService.getCaseTasks(user, caseInstance);
        const sendResponseTask = tasks.find(task => task.taskName === 'SendResponse') as Task;

        await taskService.claimTask(user, sendResponseTask);

        await this.validateTaskCountChange(taskCountBefore.claimed + 1, taskCountBefore.unclaimed + 5, `Task Count after creating 3 cases and claiming 1 task`);
    }

    async validateTaskCountChange(expectedNumberOfClaimedTasks: number, expectedNumberOfUnclaimedTasks: number, msg: string) {
        const taskCountAfter = await taskService.countTasks(user, {tenant}) as TaskCount;
        console.log(`${msg}: ${JSON.stringify(taskCountAfter, undefined, 2)}`);

        if (taskCountAfter.claimed !== expectedNumberOfClaimedTasks) {
            throw new Error(`Wrong number of claimed tasks, expected ${expectedNumberOfClaimedTasks} found ${taskCountAfter.claimed}`);
        }
        if (taskCountAfter.unclaimed !== expectedNumberOfUnclaimedTasks) {
            throw new Error(`Wrong number of unclaimed tasks, expected ${expectedNumberOfUnclaimedTasks} found ${taskCountAfter.unclaimed}`);
        }

        return taskCountAfter;
    }
}
