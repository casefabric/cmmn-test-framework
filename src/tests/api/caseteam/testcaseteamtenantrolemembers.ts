'use strict';

import Task from '@cafienne/typescript-client/cmmn/task';
import CaseTeam from '@cafienne/typescript-client/cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from '@cafienne/typescript-client/cmmn/team/caseteamuser';
import CaseTeamTenantRole from '@cafienne/typescript-client/cmmn/team/caseteamtenantrole';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import CaseTeamService from '@cafienne/typescript-client/service/case/caseteamservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import TaskService from '@cafienne/typescript-client/service/task/taskservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import User from '@cafienne/typescript-client/user';
import WorldWideTestTenant from '../../worldwidetesttenant';

const definition = 'caseteam.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;

const requestorRole = 'Requestor';
const approverRole = 'Approver';
const participantRole = 'CaseParticipant';

export default class TestCaseTeamTenantRoleMembers extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(sender, definition, tenant);
    }

    async run() {
        const caseOwnerSenderUser = new CaseOwner(sender);
        const caseOwnerReceiverUser = new CaseTeamUser(receiver, ["Approver"]);
        const caseSenderRole = new CaseTeamTenantRole('Sender', [requestorRole, approverRole]);
        const caseReceiverRole = new CaseTeamTenantRole('Receiver', [participantRole]);

        const caseTeam = new CaseTeam([caseOwnerSenderUser], [], [caseSenderRole, caseReceiverRole]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        const caseInstance = await CaseService.startCase(sender, startCase);

        // Getting the case must be allowed for both sender and receiver
        await CaseService.getCase(sender, caseInstance);
        const receiverCase = await CaseService.getCase(receiver, caseInstance);

        // Employee's role is not part of case team
        await CaseService.getCase(employee, caseInstance, 404);

        // Print the case team
        await CaseTeamService.getCaseTeam(sender, caseInstance).then(team => {
            if (caseTeam.users.length != team.users.length || caseTeam.tenantRoles.length != team.tenantRoles.length) {
                throw new Error('Unexpected different number of members');
            }
            // assertBindings(caseTeam.roleBindings, team.roleBindings);
            console.log('Team: ' + JSON.stringify(team, undefined, 2));
        });

        // Make sender a case owner, and remove the requestorRole, and add the participantRole
        caseSenderRole.isOwner = true;
        caseSenderRole.caseRoles = [approverRole, participantRole];
        await CaseTeamService.setTenantRole(sender, caseInstance, caseSenderRole);
        await CaseTeamService.getCaseTeam(sender, caseInstance).then(team => {
            if (!team.tenantRoles.find(role => role.tenantRole === caseSenderRole.tenantRole && role.isOwner)) {
                throw new Error('Expecting case sender role to have case ownership');
            }
        });
        // And revert ownership and role changes
        caseSenderRole.isOwner = false;
        caseSenderRole.caseRoles = [requestorRole, approverRole];
        await CaseTeamService.setCaseTeam(sender, caseInstance, caseTeam);
        await CaseTeamService.getCaseTeam(sender, caseInstance).then(team => {
            if (team.tenantRoles.find(role => role.tenantRole === caseSenderRole.tenantRole && role.isOwner)) {
                throw new Error('Expecting case sender role to no longer have case ownership');
            }
        });

        // Check to see if we can remove the tenant role (and then add it again)
        await CaseTeamService.removeTenantRole(sender, caseInstance, caseSenderRole);
        await CaseTeamService.getCaseTeam(sender, caseInstance).then(team => {
            if (team.tenantRoles.find(role => role.tenantRole === caseSenderRole.tenantRole)) {
                throw new Error('Expecting case sender role to no longer be part of the case team');
            }
        });
        await CaseTeamService.setTenantRole(sender, caseInstance, caseSenderRole);
        await CaseTeamService.getCaseTeam(sender, caseInstance).then(team => {
            if (! team.tenantRoles.find(role => role.tenantRole === caseSenderRole.tenantRole)) {
                throw new Error('Expecting case sender role to be part of the case team again');
            }
        });

        // Claim a task a receiver should work
        const tasks = await TaskService.getCaseTasks(receiver, receiverCase);
        const approveTask = tasks.find(task => task.taskName === 'Approve');
        if (!approveTask) {
            throw new Error('Cannot find Approve task');
        }
        const arbitraryTask = tasks.find(task => task.taskName === 'Arbitrary Task');
        if (!arbitraryTask) {
            throw new Error('Cannot find Arbitrary task');
        }

        // Claim task must not be possible for the employee with task not found error
        await this.claimTaskShouldFail(employee, approveTask, 'cannot be found', 404);
        // Claim task must not be possible for the receiver with task not found error
        await this.claimTaskShouldFail(receiver, approveTask, 'You do not have permission to perform this operation', 401);

        await CaseTeamService.setUser(sender, caseInstance, caseOwnerReceiverUser);
        // Now it should be possible
        // await TaskService.claimTask(receiver, approveTask);

        // Claim task must be possible for the receiver
        await TaskService.claimTask(sender, approveTask);

        // Remove role binding for receiver, and see if he can still access the case
    }

    async claimTaskShouldFail(user: User, task: Task, expectedMessage: string, expectedStatusCode: number) {
        // Claim task must be possible for the receiver
        const response = await TaskService.claimTask(user, task, expectedStatusCode);
        // const response = await CaseService.getDiscretionaryItems(employee, receiverCase, false);
        const failureText = await response.text();
        console.log("Response: " + response.status)
        console.log("Response: " + failureText);
        if (failureText.indexOf(expectedMessage) < 0) {
            throw new Error('Expected message to contain "' + expectedMessage + '" but received "' + failureText + '"');
        }
    }
}