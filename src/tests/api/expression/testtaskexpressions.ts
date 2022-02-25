'use strict';

import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import TaskService from '@cafienne/typescript-client/service/task/taskservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import assertCaseFileContent from '@cafienne/typescript-client/test/caseassertions/file';

const definition = 'expressions.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestTaskExpressions extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const startCase = { tenant, definition };
        const caseInstance = await CaseService.startCase(user, startCase);

        const taskName = 'Task map output properties';
        const taskOutput = {
            ChildName: 'John',
            ChildAge: 23
        }

        const tasks = await TaskService.getCaseTasks(user, caseInstance);
        const task = tasks.find(task => {
            if (task.taskName === taskName) console.log("Found task '" + taskName + "' in state " + task.taskState)
            return task.taskName === taskName && task.taskState !== 'Completed'
        });
        if (!task) {
            throw new Error('There is no Active instance of task ' + taskName);
        }
        console.log(`Invoking ${taskName} with ${JSON.stringify(taskOutput)}`)
        await TaskService.completeTask(user, task, { Out: taskOutput });

        await assertCaseFileContent(user, caseInstance, 'ChildItem', taskOutput);

        console.log('\n  Case ID:\t' + caseInstance.id);
    }
}
