'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import CaseTeamMember, { CaseOwner, TenantRoleMember } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import TaskService from '../../../framework/service/task/taskservice';
import Task from '../../../framework/cmmn/task';
import User from '../../../framework/user';
import Case from '../../../framework/cmmn/case';

const definition = 'caseteam.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;

const requestorRole = 'Requestor';
const approverRole = 'Approver';
const participantRole = 'CaseParticipant';

export default class TestCaseTeamTenantRoleBinding extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(sender, definition, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([
            new CaseOwner(sender)
            , new TenantRoleMember('Sender', [requestorRole, approverRole])
            , new TenantRoleMember('Receiver', [participantRole])
        ]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        const caseInstance = await CaseService.startCase(sender, startCase);

        // Getting the case must be allowed for both sender and receiver
        await CaseService.getCase(sender, caseInstance);
        const receiverCase = await CaseService.getCase(receiver, caseInstance);

        // Employee's role is not part of case team
        await CaseService.getCase(employee, caseInstance, 404);

        // Print the case team
        await CaseTeamService.getCaseTeam(sender, caseInstance).then(team => {
            if (caseTeam.members.length != team.members.length) {
                throw new Error('Unexpected different number of members');
            }
            // assertBindings(caseTeam.roleBindings, team.roleBindings);
            console.log('Team: ' + JSON.stringify(team, undefined, 2));
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

        // TenantService.addTenantUserRole(sender, worldwideTenant.tenant, receiver.id, "Sender");
        // await CaseTeamService.addMemberRole(caseInstance, sender, "Receiver", "Approver");

        await CaseTeamService.setMember(sender, caseInstance, new CaseTeamMember(receiver, ["Approver"]))
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