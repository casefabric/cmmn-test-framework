'use strict';

import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import TaskService from '@cafienne/typescript-client/service/task/taskservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../../worldwidetesttenant';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import CaseTeam from '@cafienne/typescript-client/cmmn/team/caseteam';
import { CaseOwner } from '@cafienne/typescript-client/cmmn/team/caseteamuser';
import CaseTeamUser from "@cafienne/typescript-client/cmmn/team/caseteamuser";
import CaseTeamService from '@cafienne/typescript-client/service/case/caseteamservice';
import Case from '@cafienne/typescript-client/cmmn/case';
import User from '@cafienne/typescript-client/user';

const definition = 'helloworld.xml';

const guid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
const tenantName = 'temp_task_tenant' + guid;

const worldwideTenant = new WorldWideTestTenant(tenantName);
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestTaskAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(sender, definition, tenant);
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

        const caseInstance = await CaseService.startCase(sender, startCase).then(async id => CaseService.getCase(sender, id));
        this.addIdentifier(caseInstance);

        await CaseService.getCase(receiver, caseInstance, 404);

        await TaskService.getCaseTasks(sender, caseInstance).then(tasks => {
            console.log('Sender has ' + tasks.length + ' case tasks')
        });

        await TaskService.getCaseTasks(receiver, caseInstance, 404).then(response => {
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
        await CaseTeamService.setUser(sender, caseInstance, new CaseTeamUser(receiver));

        await this.getReceiverUnassignedTasks(receiversTaskCountBeforeStartCase + 1);

        // Getting the case task now should also not fail any more
        await TaskService.getCaseTasks(receiver, caseInstance).then(tasks => {
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
        const taskList = await TaskService.getTasks(user, { tenant, taskState: 'Unassigned' });
        console.log(`User ${user} has ${taskList.length} unassigned tasks in tenant ${tenant}`);
        return taskList.length;
    }

}