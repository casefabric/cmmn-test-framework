'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TaskService from '../../../framework/service/task/taskservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import Case from '../../../framework/cmmn/case';
import { assertCaseFileContent } from '../../../framework/test/assertions';

const repositoryService = new RepositoryService();
const definition = 'expressions.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestTaskExpressions extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const startCase = { tenant, definition };
        const caseInstance = await caseService.startCase(user, startCase) as Case;

        const taskName = 'Task map output properties';
        const taskOutput = {
            ChildName: 'John',
            ChildAge: 23
        }

        const tasks = await taskService.getCaseTasks(user, caseInstance);
        const task = tasks.find(task => {
            if (task.taskName === taskName) console.log("Found task '" + taskName + "' in state " + task.taskState)
            return task.taskName === taskName && task.taskState !== 'Completed'
        });
        if (!task) {
            throw new Error('There is no Active instance of task ' + taskName);
        }
        console.log(`Invoking ${taskName} with ${JSON.stringify(taskOutput)}`)
        await taskService.completeTask(user, task, { Out: taskOutput });

        await assertCaseFileContent(user, caseInstance, 'ChildItem', taskOutput);

        console.log('\n\n\t\tCase ID:\t\t' + caseInstance.id);
    }
}
