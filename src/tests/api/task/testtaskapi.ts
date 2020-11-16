'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TaskService from '../../../framework/service/task/taskservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeam from '../../../framework/cmmn/caseteam';
import CaseTeamMember, { CaseOwner } from '../../../framework/cmmn/caseteammember';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import Case from '../../../framework/cmmn/case';
import User from '../../../framework/user';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';


const guid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
const tenantName = 'temp_task_tenant' + guid;


const caseService = new CaseService();
const taskService = new TaskService();
const caseTeamService = new CaseTeamService();
const worldwideTenant = new WorldWideTestTenant(tenantName);
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestTaskAPI extends TestCase {
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
        const caseTeam = new CaseTeam([new CaseOwner(sender)]);
        
        const startCase = { tenant, definition, inputs, caseTeam, debug: true };
        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };


        const sendersTaskCountBeforeStartCase = await this.getUnassignedTasks(sender);
        const receiversTaskCountBeforeStartCase = await this.getUnassignedTasks(receiver);

        const caseStarted = await caseService.startCase(sender, startCase) as Case;
        const caseInstance = await caseService.getCase(sender, caseStarted);

        await caseService.getCase(receiver, caseInstance, 404);

        await taskService.getCaseTasks(caseInstance, sender).then(tasks => {
            console.log('Sender has ' + tasks.length + ' case tasks')
        });

        await taskService.getCaseTasks(caseInstance, receiver, 404).then(response => {
            console.log('Receiver cannot access the tasks of our case')
        });

        await this.getUnassignedTasks(sender).then(newCount => {
            if (newCount == sendersTaskCountBeforeStartCase + 1) {
                // That is fine
                console.log('New count for sender is as expected');
            } else {
                throw new Error(`Expected to find ${sendersTaskCountBeforeStartCase + 1} tasks, but found ${newCount} instead for sender`);
            }
        });

        await this.getUnassignedTasks(receiver).then(newCount => {
            if (newCount == receiversTaskCountBeforeStartCase) {
                // That is fine
                console.log('New count for receiver is as expected');
            } else {
                throw new Error(`Expected to find ${receiversTaskCountBeforeStartCase} tasks, but found ${newCount} instead for receiver`);
            }
        });

        // Now add receiver to the case team, and show that now he also gets to see the unassigned task
        await caseTeamService.setMember(sender, caseInstance, new CaseTeamMember(receiver));

        await this.getReceiverUnassignedTasks(receiversTaskCountBeforeStartCase + 1);

        // Getting the case task now should also not fail any more
        await taskService.getCaseTasks(caseInstance, receiver).then(tasks => {
            console.log('Receiver has ' + tasks.length + ' case tasks')
        });
    }

    async getReceiverUnassignedTasks(expectedCount: number) {
        const newCount = await this.getUnassignedTasks(receiver);
        if (newCount == expectedCount) {
            // That is fine
            console.log('New count for receiver is as expected');
            return;
        }

        throw new Error(`Expected to find ${expectedCount} tasks for receiver, but tried twice and first found ${newCount} and then ${newCount} instead`);
    }

    async getUnassignedTasks(user: User) {
        // Simple test
        const taskList = await taskService.getTasks(user, { tenant, taskState: 'Unassigned' });
        console.log(`User ${user.id} has ${taskList.length} unassigned tasks in tenant ${tenant}`);
        return taskList.length;
    }

}