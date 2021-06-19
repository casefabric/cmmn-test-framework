'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TaskService from '../../../framework/service/task/taskservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeam from '../../../framework/cmmn/caseteam';
import { CaseOwner } from '../../../framework/cmmn/caseteammember';
import Case from '../../../framework/cmmn/case';
import { findTask } from '../../../framework/test/assertions';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestTaskCompletion extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: user.id,
                To: user.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(user)]);
        
        const startCase = { tenant, definition, inputs, caseTeam, debug: true };
        const caseInstance = await caseService.startCase(user, startCase);

        const taskName = 'Receive Greeting and Send response';
        const tasks = await taskService.getCaseTasks(user, caseInstance);
        const receiveGreetingTask = findTask(tasks, taskName);

        const invalidTaskOutput = {
            Response: {
                Message: 'Toedeledoki',
                SomeBoolean: 'This is not a boolean'
            }
        };

        await taskService.completeTask(user, receiveGreetingTask, invalidTaskOutput, 400);

        const validTaskOutput = {
            Response: {
                Message: 'Toedeledoki',
                SomeBoolean: true,
                NotExistingProperty: 'In task completion, non-existing properties are accepted'
            }
        };

        await taskService.completeTask(user, receiveGreetingTask, validTaskOutput);
    }
}