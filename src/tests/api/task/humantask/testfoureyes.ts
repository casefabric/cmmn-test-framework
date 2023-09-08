'use strict';

import Definitions from '../../../../cmmn/definitions/definitions';
import CaseTeam from '../../../../cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../../../cmmn/team/caseteamuser";
import CaseService from '../../../../service/case/caseservice';
import TaskService from '../../../../service/task/taskservice';
import TestCase from '../../../../test/testcase';
import WorldWideTestTenant from '../../../worldwidetesttenant';

const definition = Definitions.FourEyes;

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;

export default class TestFourEyes extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(sender, tenant);
    }

    async run() {
        const inputs = {};
        const caseTeam = new CaseTeam([new CaseOwner(sender), new CaseTeamUser(receiver), new CaseTeamUser(employee)]);
        
        const startCase = { tenant, definition, inputs, caseTeam, debug: true };
        const caseInstance = await CaseService.startCase(sender, startCase).then(id => CaseService.getCase(sender, id));
        this.addIdentifier(caseInstance);

        const tasks = caseInstance.planitems.filter(item => item.type === 'HumanTask');
        const taskFinder = (name: string) => {
            const task = tasks.find(item => item.name === name);
            if (! task) {
                throw new Error(`Could not find task with name ${name}`);
            }
            return task;
        }

        const task1 = taskFinder('Task1'); // Task1 has rendez-vous with Task2
        const task2 = taskFinder('Task2');
        const task3 = taskFinder('Task3'); // Task1 has 4-eyes with Task3 - and because of rendez-vous also with Task2
        const task4 = taskFinder('Task4'); // Task3, Tas4 and Task5 have four eyes across, hence must be done by 3 different users
        const task5 = taskFinder('Task5');

        console.log("Found the 5 tasks");

        await TaskService.claimTask(sender, task1);
        // Task1 has rendez-vous with Task2, so it should not be possible for others to claim it
        await TaskService.assignTask(sender, task2, receiver, 401);
        await TaskService.assignTask(sender, task2, employee, 401);
        // But of course sender can
        await TaskService.assignTask(sender, task2, sender);
        // Also, Task1 has 4-eyes with Task3, so sender should not be able to claim Task3
        await TaskService.claimTask(sender, task3, 401);

        // And, if sender revokes task1, the others cannot claim it because sender claimed task2
        await TaskService.revokeTask(sender, task1);
        await TaskService.claimTask(receiver, task1, 401);

        // Also, since Task1 has 4-eyes with Task3 and Task1 has rendez-vous with Task2, sender should not be able to claim Task3, even though Task1 is unassigned
        await TaskService.claimTask(sender, task3, 401);

        // So, let's revoke Task2 and try again.
        await TaskService.revokeTask(sender, task2);
        await TaskService.claimTask(sender, task3);

        // Because we claimed Task3, we cannot assign Task4 and Task5 to ourselves
        await TaskService.assignTask(sender, task4, sender, 401);
        await TaskService.assignTask(sender, task5, sender, 401);

        // But, we can assign one to receiver
        await TaskService.assignTask(sender, task4, receiver);
        // But not both. Task5 must be assigned to someone else ...
        await TaskService.assignTask(sender, task5, receiver, 401);
        // ... and that someone else is employee
        await TaskService.completeTask(sender, task5, undefined, 401);
        await TaskService.assignTask(sender, task5, employee);

        console.log(`\nCase ID: ${caseInstance.id}\n`);
    }
}