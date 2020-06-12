'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import CaseFileService from '../../../framework/service/case/casefileservice';
import CaseTeamMember, { CaseOwner, TenantRoleMember } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import Comparison from '../../../framework/test/comparison';
import RoleBinding from '../../../framework/cmmn/rolebinding';
import TenantService from '../../../framework/service/tenant/tenantservice';
import { AssertionError } from 'assert';
import TaskService from '../../../framework/service/task/taskservice';
import Task from '../../../framework/cmmn/task';
import User from '../../../framework/user';
import { ServerSideProcessing } from '../../../framework/test/time';
import Case from '../../../framework/cmmn/case';

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
        const caseTeam = new CaseTeam([
            new CaseOwner(sender)
            , new TenantRoleMember('Sender', [requestorRole, approverRole])
            , new TenantRoleMember('Receiver', [participantRole])
        ]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        const caseInstance = await caseService.startCase(startCase, sender) as Case;

        // Getting the case must be allowed for both sender and receiver
        await caseService.getCase(caseInstance, sender);
        const receiverCase = await caseService.getCase(caseInstance, receiver);

        // Employee's role is not part of case team
        await caseService.getCase(caseInstance, employee, false);

        // Print the case team
        await caseTeamService.getCaseTeam(caseInstance, sender).then(team => {
            if (caseTeam.members.length != team.members.length) {
                throw new Error('Unexpected different number of members');
            }
            // assertBindings(caseTeam.roleBindings, team.roleBindings);
            console.log('Team: ' + JSON.stringify(team, undefined, 2));
        });

        // Claim a task a receiver should work
        const tasks = await taskService.getCaseTasks(receiverCase, receiver);
        const approveTask = tasks.find(task => task.taskName === 'Approve');
        if (!approveTask) {
            throw new Error('Cannot find Approve task');
        }
        const arbitraryTask = tasks.find(task => task.taskName === 'Arbitrary Task');
        if (!arbitraryTask) {
            throw new Error('Cannot find Arbitrary task');
        }

        // Claim task must not be possible for the employee with task not found error
        await this.claimTask(approveTask, employee, 'cannot be found');
        // Claim task must not be possible for the receiver with task not found error
        await this.claimTask(approveTask, receiver, 'You do not have permission to perform this operation');

        // await new TenantService().addTenantUserRole(sender, worldwideTenant.tenant, receiver.id, "Sender");
        // await caseTeamService.addMemberRole(caseInstance, sender, "Receiver", "Approver");
        // await ServerSideProcessing();

        await caseTeamService.setMember(caseInstance, sender, new CaseTeamMember(receiver, ["Approver"]))
        // Now it should be possible
        // await taskService.claimTask(approveTask, receiver);

        // Claim task must be possible for the receiver
        await taskService.claimTask(approveTask, sender);

        // Remove role binding for receiver, and see if he can still access the case


    }

    async claimTask(task: Task, user: User, expectedMessage: string) {
        // Claim task must be possible for the receiver
        const response = await taskService.claimTask(task, user, false);
        // const response = await caseService.getDiscretionaryItems(receiverCase, employee, false);
        const failureText = await response.text();
        console.log("Response: " + response.status)
        console.log("Response: " + failureText);
        if (response.status === 401) {
            if (response.statusText == "Unauthorizied") {
                console.log("Unexpected")
            }
        }
        if (failureText.indexOf(expectedMessage) < 0) {
            throw new Error('Expected message to contain "' + expectedMessage + '" but received "' + failureText + '"');
        }
    }
}