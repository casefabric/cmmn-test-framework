'use strict';

import Definitions from '../../../src/cmmn/definitions/definitions';
import CaseService from '../../../src/service/case/caseservice';
import TaskService from '../../../src/service/task/taskservice';
import assertCaseFileContent from '../../../src/test/caseassertions/file';
import TestCase from '../../../src/test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';

const definition = Definitions.Expressions;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestTaskExpressions extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const startCase = { tenant, definition };
        const caseInstance = await CaseService.startCase(user, startCase);
        this.addIdentifier(caseInstance);

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
