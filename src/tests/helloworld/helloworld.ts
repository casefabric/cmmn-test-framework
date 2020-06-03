'use strict';

import CaseService from '../../framework/service/case/caseservice';
import TaskService from '../../framework/service/task/taskservice';
import TestCase from '../../framework/test/testcase';
import WorldWideTestTenant from '../worldwidetesttenant';
import RepositoryService from '../../framework/service/case/repositoryservice';
import { assertTask, verifyTaskInput } from '../../framework/test/assertions';
import User from '../../framework/user';
import CaseTeam from '../../framework/cmmn/caseteam';
import CaseTeamMember from '../../framework/cmmn/caseteammember';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestHelloworld extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, sender, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: sender.id
            }
        };
        const caseTeam = new CaseTeam([new CaseTeamMember(sender, 'user', true), new CaseTeamMember(receiver)]);
        
        const startCase = { tenant, definition, inputs, caseTeam, debug: true };
        // const startCase = { tenant, definition, inputs, caseInstanceId: 'Ueè' };
        // const startCase = { tenant, definition, inputs, caseInstanceId: tenant };
        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };

        let caseInstance = await caseService.startCase(startCase, sender);
        caseInstance = await caseService.getCase(caseInstance, sender);

        // console.log("CI: "+ caseInstance)
        // return;

        // Simple test
        // const availableTasks = await taskService.getTasks(sender, { tenant: tenant, taskState: 'Unassigned' });
        // console.log('We have ' + availableTasks.length + ' unassigned tasks in tenant ' + tenant);

        // await taskService.getTasks(sender, { tenant: tenant, taskState: 'Unassigned' });

        // 
        const cases = await caseService.getCases(sender, { tenant: tenant, numberOfResults: 10000 });
        console.log("We have " + cases.length + " cases ...");

        const taskName = 'Receive Greeting and Send response';
        const planItem = caseInstance.planitems.find(p => p.name === taskName);
        if (!planItem) {
            throw new Error('Cannot find plan item ' + taskName);
        }

        const tasks = await taskService.getCaseTasks(caseInstance, sender);
        const receiveGreetingTask = tasks.find(task => task.taskName === taskName);
        if (!receiveGreetingTask) {
            throw new Error('Cannot find task ' + taskName);
        }

        await verifyTaskInput(receiveGreetingTask, inputs)

        await taskService.claimTask(receiveGreetingTask, sender);
        await assertTask(receiveGreetingTask, sender, 'Claim', 'Assigned', sender, sender);

        caseInstance = await caseService.getCase(caseInstance, sender);

        await taskService.revokeTask(receiveGreetingTask, sender);
        await assertTask(receiveGreetingTask, sender, 'Revoke', 'Unassigned', User.NONE);

        await taskService.assignTask(receiveGreetingTask, sender, receiver);
        await assertTask(receiveGreetingTask, sender, 'Assign', 'Assigned', receiver, receiver);

        await taskService.revokeTask(receiveGreetingTask, receiver);
        await assertTask(receiveGreetingTask, sender, 'Revoke', 'Unassigned', User.NONE);

        await taskService.claimTask(receiveGreetingTask, receiver);
        await assertTask(receiveGreetingTask, sender, 'Claim', 'Assigned', receiver, receiver);

        await taskService.delegateTask(receiveGreetingTask, receiver, sender);
        await assertTask(receiveGreetingTask, sender, 'Delegate', 'Delegated', sender, receiver);

        await taskService.revokeTask(receiveGreetingTask, sender);
        await assertTask(receiveGreetingTask, sender, 'Revoke', 'Assigned', receiver);

        await taskService.revokeTask(receiveGreetingTask, receiver);
        await assertTask(receiveGreetingTask, sender, 'Revoke', 'Unassigned', User.NONE);

        await taskService.claimTask(receiveGreetingTask, receiver);
        await assertTask(receiveGreetingTask, sender, 'Claim', 'Assigned', receiver);

        // User 'sender' may not complete a task assigned to 'receiver' 
        await taskService.completeTask(receiveGreetingTask, sender, taskOutput, false);
        await assertTask(receiveGreetingTask, sender, 'Claim', 'Assigned', receiver);

        await taskService.completeTask(receiveGreetingTask, receiver, taskOutput);
        await assertTask(receiveGreetingTask, sender, 'Complete', 'Completed', receiver);

        caseInstance = await caseService.getCase(caseInstance, sender);

        const nextTasks = await taskService.getCaseTasks(caseInstance, sender);
        const responseTaskName = 'Read response';
        const readResponseTask = nextTasks.find(task => task.taskName === responseTaskName);
        if (!readResponseTask) {
            throw new Error('Cannot find task ' + responseTaskName);
        }
        if (readResponseTask.assignee !== sender.id) {
            throw new Error('Expecting task to be assigned to sending user');
        }
        await taskService.completeTask(readResponseTask, sender);
        caseInstance = await caseService.getCase(caseInstance, sender);

        const casePlan = caseInstance.planitems.find(p => p.type === 'CasePlan')
        if (casePlan?.currentState !== 'Completed') {
            throw new Error('Expecting case to be completed at the end, but it is in state ' + casePlan?.currentState);
        } else {
            console.log('Case completed! \n ' + caseInstance.id);
        }
    }
}