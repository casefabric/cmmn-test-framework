'use strict';

import Definitions from '../../../../cmmn/definitions/definitions';
import CaseTeam from '../../../../cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../../../cmmn/team/caseteamuser";
import CaseService from '../../../../service/case/caseservice';
import CaseTeamService from '../../../../service/case/caseteamservice';
import TaskService from '../../../../service/task/taskservice';
import TestCase from '../../../../test/testcase';
import Util from '../../../../util/util';
import User from '../../../../user';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';
import { taskPrinter } from '../../../../cmmn/task';

const definition = Definitions.HelloWorld;
const tenant = Util.generateId('temp_task_tenant');
const worldwideTenant = new WorldWideTestTenant(tenant);
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestTaskAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(sender, tenant);
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
            console.log('Sender has ' + tasks.length + ' case tasks');
            taskPrinter(tasks);
            tasks.forEach(task => {
                if (task.caseName !== caseInstance.caseName) {
                    throw new Error(`Task ${task}' does not have a proper case name. Expected "${caseInstance.caseName}", but found "${task.caseName}" instead`);
                }
            });
        });

        await TaskService.getCaseTasks(receiver, caseInstance, false, 404).then(response => {
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