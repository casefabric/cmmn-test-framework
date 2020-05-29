'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import CaseFileService from '../../../framework/service/case/casefileservice';
import CaseTeamMember from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import Comparison from '../../../framework/test/comparison';
import RoleBinding from '../../../framework/cmmn/rolebinding';
import TenantService from '../../../framework/service/tenant/tenantservice';
import { AssertionError } from 'assert';
import TaskService from '../../../framework/service/task/taskservice';
import Task from '../../../framework/cmmn/task';

const repositoryService = new RepositoryService();
const definition = 'caseteam.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const caseTeamService = new CaseTeamService();
const caseFileService = new CaseFileService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;

const requestorRole = 'Requestor';
const approverRole = 'Approver';
const paRole = 'PersonalAssistant';
const participantRole = 'CaseParticipant';

export default class TestRoleBinding extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, sender, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([], [
            new RoleBinding(requestorRole, sender.roles)
            , new RoleBinding(approverRole, sender.roles)
            , new RoleBinding(participantRole, receiver.roles)
        ]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        const caseInstance = await caseService.startCase(startCase, sender);

        // Getting the case must be allowed for both sender and receiver
        await caseService.getCase(caseInstance, sender);
        const receiverCase = await caseService.getCase(caseInstance, receiver);

        // Employee's role is not part of case team
        await caseService.getCase(caseInstance, employee, false);

        // Print the case team
        await caseTeamService.getCaseTeam(caseInstance, sender).then(team => {
            if (caseTeam.roleBindings.length != team.roleBindings.length) {
                throw new Error('Unexpected different number of role bindings');
            }
            // assertBindings(caseTeam.roleBindings, team.roleBindings);
            console.log('Team: ' + JSON.stringify(team, undefined, 2));
        });

        // Claim a task a receiver should work
        const tasks = await taskService.getCaseTasks(receiverCase, receiver);
        const approveTask = tasks.find(task => task.taskName === 'Approve');
        if (! approveTask) {
            throw new Error('Cannot find Approve task');
        }
        const arbitraryTask = tasks.find(task => task.taskName === 'Arbitrary Task');
        if (! arbitraryTask) {
            throw new Error('Cannot find Arbitrary task');
        }

        // Claim task must be possible for the receiver
        const response = await taskService.claimTask(approveTask, employee, false);
        // const response = await caseService.getDiscretionaryItems(receiverCase, employee, false);
        const failureText = await response.text();
        {
            const expectedMessage = "User receiving-user is not part of the case team";
            console.log("Response: " + response.status)
            console.log("Response: " + failureText);
            if (response.status === 401) {
                if (response.statusText == "Unauthorizied") {
                    console.log("Unexpected")
                }
            }
        };
        // Claim task must be possible for the receiver
        await taskService.claimTask(approveTask, receiver, false);

        // Claim task must be possible for the receiver
        await taskService.claimTask(approveTask, sender);

        // Remove role binding for receiver, and see if he can still access the case


    }
}