'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TaskService from '../../../framework/service/task/taskservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import assertCaseFileContent from '../../../framework/test/caseassertions/file';
import { verifyTaskInput } from '../../../framework/test/caseassertions/task';
import CasePlanService from '../../../framework/service/case/caseplanservice';
import PlanItem from '../../../framework/cmmn/planitem';

const definition = 'repeat_with_mapping.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestRepeatWithMapping extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const startCase = { tenant, definition };
        const caseInstance = await CaseService.startCase(user, startCase);

        const firstTaskName = 'Create Children';
        const secondTaskName = 'Edit GrandChild';
        const firstGrandChild = {
            GrandChildName: 'Little John',
            GrandChildBirthDate: '2019-10-26'
        };
        const secondGrandChild = {
            GrandChildName: 'Little Pete',
            GrandChildBirthDate: '2016-10-26'
        };
        const taskOutput = [{
            ChildName: 'John',
            ChildAge: 23,
            GrandChild: firstGrandChild
        }, {
            ChildName: 'Pete',
            ChildAge: 26,
            GrandChild: secondGrandChild
        }];

        const task = (await TaskService.getCaseTasks(user, caseInstance)).find(task => {
            if (task.taskName === firstTaskName) console.log("Found task '" + firstTaskName + "' in state " + task.taskState)
            return task.taskName === firstTaskName && task.taskState !== 'Completed'
        });
        if (!task) {
            throw new Error('There is no Active instance of task ' + firstTaskName);
        }
        console.log(`Invoking ${firstTaskName} with ${JSON.stringify(taskOutput)}`)
        await TaskService.completeTask(user, task, { children: taskOutput });

        await assertCaseFileContent(user, caseInstance, 'Child', taskOutput);

        // Get the two second tasks, named 'Edit Grand Child'.
        const planItems = (await CasePlanService.getPlanItems(user, caseInstance)).filter(item => item.name === secondTaskName);
        if (planItems.length !== 2) {
            throw new Error(`Expecting 2 tasks with name ${secondTaskName}`);
        }

        // Validate both their input parameters
        const validateTask = async (item: PlanItem) => {
            const task = await TaskService.getTask(user, item.id);
            const expectedTaskInput = item.index === 0 ? firstGrandChild : secondGrandChild;
            verifyTaskInput(task, { GrandChild: expectedTaskInput});
        }
        await validateTask(planItems[0]);
        await validateTask(planItems[1]);

        console.log('\n\n\tCase ID:\t\t' + caseInstance.id);
    }
}
