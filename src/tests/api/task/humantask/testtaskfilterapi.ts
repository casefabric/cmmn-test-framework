'use strict';

import CaseService from '../../../../framework/service/case/caseservice';
import TaskService from '../../../../framework/service/task/taskservice';
import TestCase from '../../../../framework/test/testcase';
import WorldWideTestTenant from '../../../worldwidetesttenant';
import RepositoryService from '../../../../framework/service/case/repositoryservice';
import Case from '../../../../framework/cmmn/case';
import TaskFilter from '../../../../framework/service/task/taskfilter';

const repositoryService = new RepositoryService();
const definition1 = 'helloworld.xml';
const definition2 = 'helloworld2.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestTaskFilterAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(user, definition1, tenant);
        await repositoryService.validateAndDeploy(user, definition2, tenant);
    }

    async run() {
        // Helloworld.xml has 2 tasks: "Receive Greeting and Send response" and "Read response"
        // Helloworld2.xml has 3 tasks: "SendResponse", "Task that is always started" and "Read response"
        // 
        // In this test case we create 2 instances of each definition and complete the first task in each instance.
        // 
        // - Filtering on caseName == 'helloworld' should return 4 tasks
        // - Filtering on caseName == 'helloworld2' should return 6 tasks
        // - Filtering on taskName == 'SendResponse' should return 2 tasks
        // - Filtering on taskName == 'Read response' should return 4 tasks
        // - Filtering on taskName == 'Read response' && caseName == 'helloworld' should return 2 tasks.
        //
        // Note, the 'Read response' task only becomes active after completing the first task, which will be done in a single method.
        
        const firstTask1 = 'Receive Greeting and Send response';
        const firstTask2 = 'SendResponse';
        const readResponseTask = 'Read response';

        const definition1Filter = { caseName: 'HelloWorld'};
        const definition2Filter = { caseName: 'helloworld2'};
        const sendResponseFilter = { taskName: firstTask1};
        const readResponseFilter = { taskName: readResponseTask};
        const casePlusTaskFilter = Object.assign({}, definition1Filter, readResponseFilter);

        const initialCase1TaskCount = await this.assertTaskCount(definition1Filter);
        const initialCase2TaskCount = await this.assertTaskCount(definition2Filter);
        const initialSendResponseCount = await this.assertTaskCount(sendResponseFilter);
        const initialReadResponseCount = await this.assertTaskCount(readResponseFilter);
        const casePlusTaskCount = await this.assertTaskCount(casePlusTaskFilter);

        await this.createCase(definition1, firstTask1);
        await this.createCase(definition1, firstTask1);
        await this.createCase(definition2, firstTask2);
        await this.createCase(definition2, firstTask2);

        await this.assertTaskCount(definition1Filter, initialCase1TaskCount + 4);
        await this.assertTaskCount(definition2Filter, initialCase2TaskCount + 6);
        await this.assertTaskCount(sendResponseFilter, initialSendResponseCount + 2);
        await this.assertTaskCount(readResponseFilter, initialReadResponseCount + 4);
        await this.assertTaskCount(casePlusTaskFilter, casePlusTaskCount + 2);
    }

    async assertTaskCount(filter: TaskFilter, expectedCount: number = -1) {  
        filter.tenant = tenant;      
        const filteredTasks = await taskService.getTasks(user, filter);
        console.log(`Found ${filteredTasks.length} for filter ${JSON.stringify(filter)}`);
        if (expectedCount >= 0 && filteredTasks.length !== expectedCount) {
            throw new Error(`Expected to find ${expectedCount} tasks but found ${filteredTasks.length} for filter ${JSON.stringify(filter)}`);
        }
        return filteredTasks.length;
    }

    async createCase(definition: string, firstTaskName: string) {
        const inputs = {
            Greeting: {
                Message: 'Hello there'
            }
        };
        
        const startCase1 = { tenant, definition, inputs, debug: true };
        const caseStarted = await caseService.startCase(user, startCase1) as Case;
        const caseInstance = await caseService.getCase(user, caseStarted);
        const tasks = await taskService.getCaseTasks(user, caseInstance);
        const firstTask = tasks.find(task => task.taskName === firstTaskName);
        if (! firstTask) {
            throw new Error(`Expected to find a task named '${firstTaskName}' but we found only tasks ${tasks.map(task => `'${task.taskName}'`).join(',')}`);
        }

        const taskOutput = {
            Response: {
                Message: `Responding in task ${firstTaskName}`
            }
        };

        await taskService.completeTask(user, firstTask, taskOutput);

        return caseInstance;
    }
}