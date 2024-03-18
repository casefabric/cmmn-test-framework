'use strict';

import Definitions from '../../../../cmmn/definitions/definitions';
import CaseService from '../../../../service/case/caseservice';
import TaskFilter from '../../../../service/task/taskfilter';
import TaskService from '../../../../service/task/taskservice';
import TestCase from '../../../../test/testcase';
import Util from '../../../../test/util';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';

const definition1 = Definitions.HelloWorld;
const definition2 = Definitions.HelloWorld2;
const worldwideTenant = new WorldWideTestTenant(Util.generateId('nog_een_tenant'));
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestTaskFilterAPI2 extends TestCase {
    public isParallelTest: boolean = false;

    async onPrepareTest() {
        await worldwideTenant.create();
        await definition1.deploy(user, tenant);
        await definition2.deploy(user, tenant);
    }

    caseIds: string[] = [];

    async run() {
        // Helloworld.xml has 2 tasks: "Receive Greeting and Send response" and "Read response"
        // Helloworld2.xml has 3 tasks: "SendResponse", "Task that is always started" and "Read response"
        // 
        // In this test case we create 2 instances of each definition and complete the first task in each instance.
        // 
        // - Filtering on taskState == 'Assigned;Unassigned' should return 4 tasks
        // - Filtering on taskState == 'Completed' should return 6 tasks
        // - Filtering on taskName == 'SendResponse' should return 2 tasks
        // - Filtering on taskName == 'Read response' should return 6 tasks
        // - Filtering on taskName == 'Read response' && taskState == 'Assigned;Unassigned' should return 6 tasks.
        //
        // Note, the 'Read response' task only becomes active after completing the first task, which will be done in a single method.

        const firstTask1 = 'Receive Greeting and Send response';
        const firstTask2 = 'SendResponse';
        const readResponseTask = 'Read response';

        const activeTasksFilter = { taskState: 'Assigned;Unassigned' };
        const completedTasksFilter = { taskState: 'Completed' };
        const sendResponseFilter = { taskName: firstTask1 };
        const readResponseFilter = { taskName: readResponseTask };
        const activeReadResponseTaskFilter = Object.assign({}, activeTasksFilter, readResponseFilter);

        const initialActiveTaskCount = await this.assertTaskCount(activeTasksFilter);
        const initialCompletedTaskCount = await this.assertTaskCount(completedTasksFilter);
        const initialSendResponseCount = await this.assertTaskCount(sendResponseFilter);
        const initialReadResponseCount = await this.assertTaskCount(readResponseFilter);
        const initialActiveReadResponseCount = await this.assertTaskCount(activeReadResponseTaskFilter);

        await this.assertTaskCount(activeTasksFilter);

        await this.createCase(definition1, firstTask1);
        await this.createCase(definition1, firstTask1);
        await this.createCase(definition2, firstTask2);
        await this.createCase(definition2, firstTask2);

        await this.assertTaskCount(activeTasksFilter, initialActiveTaskCount + 6);
        await this.assertTaskCount(sendResponseFilter, initialSendResponseCount + 2);
        // No changes in completed tasks (yet)
        await this.assertTaskCount(completedTasksFilter, initialCompletedTaskCount);
        await this.assertTaskCount(readResponseFilter, initialReadResponseCount);
        await this.assertTaskCount(activeReadResponseTaskFilter, initialActiveReadResponseCount);

        await this.claimTask(this.caseIds[0], firstTask1);
        await this.claimTask(this.caseIds[2], firstTask2);

        await this.assertTaskCount(activeTasksFilter, initialActiveTaskCount + 6);
        await this.assertTaskCount(sendResponseFilter, initialSendResponseCount + 2);
        await this.assertTaskCount(completedTasksFilter, initialCompletedTaskCount);
        await this.assertTaskCount(readResponseFilter, initialReadResponseCount);
        await this.assertTaskCount(activeReadResponseTaskFilter, initialActiveReadResponseCount);

        await this.completeTask(this.caseIds[0], firstTask1);
        await this.completeTask(this.caseIds[2], firstTask2);

        await this.assertTaskCount(activeTasksFilter, initialActiveTaskCount + 6);
        await this.assertTaskCount(sendResponseFilter, initialSendResponseCount + 2);
        await this.assertTaskCount(completedTasksFilter, initialCompletedTaskCount + 2);
        await this.assertTaskCount(readResponseFilter, initialReadResponseCount + 2);
        await this.assertTaskCount(activeReadResponseTaskFilter, initialActiveReadResponseCount + 2);
    }

    async assertTaskCount(filter: TaskFilter, expectedCount: number = -1) {
        // filter.tenant = tenant;
        filter.numberOfResults = 10_000;
        const filteredTasks = await TaskService.getTasks(user, filter);
        console.log(`Found ${filteredTasks.length} for filter ${JSON.stringify(filter)}`);
        filteredTasks.forEach((task, index) => console.log(`${index}:\t${task.caseInstanceId} - ${task.taskName} - ${task.taskState}`))
        if (expectedCount >= 0 && filteredTasks.length !== expectedCount) {
            throw new Error(`Expected to find ${expectedCount} tasks but found ${filteredTasks.length} for filter ${JSON.stringify(filter)}`);
        }
        return filteredTasks.length;
    }

    async createCase(definition: Definitions, firstTaskName: string, claimTask: boolean = false) {
        const inputs = {
            Greeting: {
                Message: 'Hello there'
            }
        };

        const startCase1 = { tenant, definition, inputs, debug: true };
        const caseInstance = await CaseService.startCase(user, startCase1).then(async id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);
        this.caseIds.push(caseInstance.id);
        console.log(`Case ${caseInstance.id} has plan items:\n- ${caseInstance.planitems.map(item => item.name).join(`\n- `)}`)
        if (claimTask) {
            const taskId = caseInstance.planitems.find(item => item.name === firstTaskName)?.id;
            if (!taskId) {
                throw new Error(`Could not find task ${firstTaskName} inside case ${caseInstance.id}??? Found following plan items \n- ${caseInstance.planitems.map(item => item.name).join(`\n- `)}`)
            }
            await TaskService.claimTask(user, taskId);
        }

        return caseInstance;
    }

    async claimTask(caseInstance: string, firstTaskName: string) {
        const tasks = await TaskService.getCaseTasks(user, caseInstance);
        const firstTask = tasks.find(task => task.taskName === firstTaskName);
        if (!firstTask) {
            throw new Error(`Expected to find a task named '${firstTaskName}' but we found only tasks ${tasks.map(task => `'${task.taskName}'`).join(',')}`);
        }

        const taskOutput = {
            Response: {
                Message: `Responding in task ${firstTaskName}`
            }
        };

        await TaskService.claimTask(user, firstTask);

    }

    async completeTask(caseInstance: string, firstTaskName: string) {
        const tasks = await TaskService.getCaseTasks(user, caseInstance);
        const firstTask = tasks.find(task => task.taskName === firstTaskName);
        if (!firstTask) {
            throw new Error(`Expected to find a task named '${firstTaskName}' but we found only tasks ${tasks.map(task => `'${task.taskName}'`).join(',')}`);
        }

        const taskOutput = {
            Response: {
                Message: `Responding in task ${firstTaskName}`
            }
        };

        await TaskService.completeTask(user, firstTask, taskOutput);

    }
}