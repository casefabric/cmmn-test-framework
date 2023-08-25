'use strict';

import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import TaskService from '@cafienne/typescript-client/service/task/taskservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import CaseTeam from '@cafienne/typescript-client/cmmn/team/caseteam';
import { CaseOwner } from '@cafienne/typescript-client/cmmn/team/caseteamuser';
import { findTask } from '@cafienne/typescript-client/test/caseassertions/task';

const definition = 'helloworld.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestTaskCompletion extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
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
        const caseInstance = await CaseService.startCase(user, startCase);
        this.addIdentifier(caseInstance);

        const taskName = 'Receive Greeting and Send response';
        const tasks = await TaskService.getCaseTasks(user, caseInstance);
        const receiveGreetingTask = findTask(tasks, taskName);

        const invalidTaskOutput = {
            Response: {
                Message: 'Toedeledoki',
                SomeBoolean: 'This is not a boolean'
            }
        };

        await TaskService.completeTask(user, receiveGreetingTask, invalidTaskOutput, 400, 'It should not be possible to complete a task with an invalid typed case file item property');

        const validTaskOutput = {
            Response: {
                Message: 'Toedeledoki',
                SomeBoolean: true,
                NotExistingProperty: 'In task completion, non-existing properties are accepted'
            }
        };

        await TaskService.completeTask(user, receiveGreetingTask, validTaskOutput);
    }
}