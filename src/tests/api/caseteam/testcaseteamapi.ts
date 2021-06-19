'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import CaseFileService from '../../../framework/service/case/casefileservice';
import CaseTeamMember, { CaseOwner, TenantRoleMember } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import TenantService from '../../../framework/service/tenant/tenantservice';
import Case from '../../../framework/cmmn/case';
import { assertCaseTeam, assertCaseTeamMember } from '../../../framework/test/assertions';
import User from '../../../framework/user';

const repositoryService = new RepositoryService();
const definition = 'caseteam.xml';

const caseService = new CaseService();
const caseTeamService = new CaseTeamService();
const caseFileService = new CaseFileService();
const worldwideTenant = new WorldWideTestTenant('wwtt-2');
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;

const requestorRole = 'Requestor';
const approverRole = 'Approver';
const paRole = 'PersonalAssistant';
const notExistingRole = 'ThisRoleIsNotInTheCaseDefinition';
const emptyRole = '';

export default class TestCaseTeamAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(sender, definition, tenant);
        await new TenantService().addTenantUserRole(sender, worldwideTenant.tenant, sender.id, 'Receiver');
    }

    async run() {
        await this.generalAPITest();
        await this.ownershipTest();
    }

    async generalAPITest() {
        const caseTeam = new CaseTeam([
            new CaseOwner(sender, [requestorRole]),
            new CaseOwner(receiver, [approverRole, paRole]),
            new TenantRoleMember(requestorRole, ['ADMIN', 'Not-Exisitng-TenantRole-Still-Allowed-In-Team'])
        ]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        // It should not be possible to start a case with invalid role names
        await caseService.startCase(sender, startCase, 400);

        caseTeam.members[2].caseRoles = []; // Change roles of requestor to be empty instead of having wrong roles
        const caseInstance = await caseService.startCase(sender, startCase);


        // Try to set a team with invalid users
        const t2 = new CaseTeam([new CaseTeamMember('Piet', [requestorRole]), new CaseTeamMember('Joop'), new CaseTeamMember(receiver)]);
        // This call fails, because the new case team does not have existing users
        await caseTeamService.setCaseTeam(sender, caseInstance, t2, 404);
        // This call fails, because the new member is not an existing user
        await caseTeamService.setMember(sender, caseInstance, new CaseTeamMember('PietjePrecies'), 404);

        // Getting the case must be allowed for both sender and receiver
        await caseService.getCase(sender, caseInstance);
        await caseService.getCase(receiver, caseInstance);
        // Getting the case is not allow for the employee, as he is not part of the case team
        await caseService.getCase(employee, caseInstance, 404);

        // After removing receiver, he should not longer have access.
        await caseTeamService.removeMember(sender, caseInstance, receiver);

        // Receiver is no longer part of the team
        await assertCaseTeamMember(sender, caseInstance, new CaseOwner(receiver, [approverRole, paRole]), false);

        // Getting the case is no longer allowed for receiver
        // Getting the case is still allowed for sender
        await caseService.getCase(receiver, caseInstance, 404);
        await caseService.getCase(sender, caseInstance);

        // Removing someone that is not part of the team should fail
        await caseTeamService.removeMember(sender, caseInstance, employee, 400);

        // Fetch case team. Should not be allowed for receiver, but should work for sender.
        await caseTeamService.getCaseTeam(receiver, caseInstance, 404);
        await caseTeamService.getCaseTeam(sender, caseInstance);

        // Getting the case file is allowed for sender, as he is part of the team
        await caseFileService.getCaseFile(sender, caseInstance);
        // Getting the case file is not allowed for receiver, as he is no longer part of the team
        await caseFileService.getCaseFile(receiver, caseInstance, 404);

        // Add employee to the team, and show that he now has access to the case
        await caseTeamService.setMember(sender, caseInstance, new CaseTeamMember(employee));
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember(employee));

        // Now employee should be able to get the case
        await caseService.getCase(employee, caseInstance);

        // Replace entire case team; removes sender and employee and then adds receiver and employee
        const newTeam = new CaseTeam([new CaseTeamMember(receiver, [requestorRole]), new CaseTeamMember(employee)]);
        // This call fails, because the new case team does not have any owners defined
        await caseTeamService.setCaseTeam(sender, caseInstance, newTeam, 400);
        // Make receiver the owner, and then it should work
        newTeam.members[0].isOwner = true;
        // This call fails, because employee is not an owner
        await caseTeamService.setCaseTeam(employee, caseInstance, newTeam, 401);
        await caseTeamService.setCaseTeam(sender, caseInstance, newTeam);

        // Verify whether receiver is owner or not
        await assertCaseTeamMember(receiver, caseInstance, new CaseOwner(receiver, [requestorRole]));
        // Verify employee's presence in the case team
        await assertCaseTeamMember(receiver, caseInstance, new CaseTeamMember(employee));
        // Sender is not part of the team
        await assertCaseTeamMember(receiver, caseInstance, new CaseOwner(sender, [requestorRole]), false);

        // So now sender no longer has access, but the others do.
        await caseService.getCase(sender, caseInstance, 404);
        await caseService.getCase(receiver, caseInstance);
        await caseService.getCase(employee, caseInstance);

        // Compare the case team with both what the GET case API thinks it is and what the GET case team API thinks it is
        await assertCaseTeam(employee, caseInstance, newTeam);

        // Add a role that is not defined in the case model should not be possible
        await caseTeamService.setMember(receiver, caseInstance, new CaseOwner(receiver, [notExistingRole]), 400);

        // Add an empty role should not be possible through setting a member
        await caseTeamService.setMember(receiver, caseInstance, new CaseTeamMember(employee, [emptyRole]), 400);
        // But not when assigning a non existing role
        await caseTeamService.setMember(receiver, caseInstance, new CaseTeamMember(employee, ['a/b/c']), 400);

        // Now add approver role to the employee and see if that works
        await caseTeamService.setMember(receiver, caseInstance, new CaseTeamMember(employee, [approverRole]));
        // Now add approver role to the receiver and see if that works
        await caseTeamService.setMember(receiver, caseInstance, new CaseOwner(receiver, [approverRole]));

        // Verify employee's, and receiver's membership in the team
        await assertCaseTeamMember(receiver, caseInstance, new CaseOwner(receiver, [requestorRole, approverRole]));
        await assertCaseTeamMember(receiver, caseInstance, new CaseTeamMember(employee, [approverRole]));

        // Remove requestorRole from receiver
        await caseTeamService.removeMemberRoles(receiver, caseInstance, new CaseOwner(receiver), requestorRole);
        await assertCaseTeamMember(receiver, caseInstance, new CaseOwner(receiver, [approverRole]));

        // Now add PA role to the receiver and see if that works
        await caseTeamService.setMember(receiver, caseInstance, new CaseOwner(receiver, [paRole]));
        await assertCaseTeamMember(receiver, caseInstance, new CaseOwner(receiver, [approverRole, paRole]));

    }

    async ownershipTest() {
        const caseTeam1 = new CaseTeam([new CaseOwner(receiver), new CaseOwner(sender)]);

        console.log('\nA test for removing a user\'s ownership by another owner\n')
        await this.testOwnership(caseTeam1, sender, receiver)

        console.log('\nA test for removing self ownership when there are more than one owners\n')
        await this.testOwnership(caseTeam1, receiver, receiver)

        const caseTeam2 = new CaseTeam([new CaseOwner(receiver)]);
        console.log('\nA test for removing self ownership when there is one owner\n')
        await this.testOwnership(caseTeam2, receiver, receiver, false)
    }

    async testOwnership(caseTeam: CaseTeam, ownerWhoRemoves: User, ownerToRemove: User, removingOwnershipShouldSucceed: boolean = true) {
        // Starting a by ownerWhoRemoves should not result in failure
        const startCase = { tenant, definition, debug: true, caseTeam };
        const caseInstance = await caseService.startCase(ownerWhoRemoves, startCase);

        // ownerToRemove can perform get case and get team
        await caseService.getCase(ownerToRemove, caseInstance);
        await assertCaseTeam(ownerToRemove, caseInstance, caseTeam);

        // It should be possible to remove a user's ownership by another owner
        const expectedRemovalStatusCode = removingOwnershipShouldSucceed ? 200 : 400;
        await caseTeamService.setMember(ownerWhoRemoves, caseInstance, new CaseTeamMember(ownerToRemove, [], 'user', false), expectedRemovalStatusCode);

        // Verify ownerToRemove's ownership in the case team
        await caseTeamService.getCaseTeam(ownerWhoRemoves, caseInstance).then(team => {
            const expectedOwnership = ! removingOwnershipShouldSucceed;
            if (team.find(ownerToRemove)?.isOwner !== expectedOwnership) {
                throw new Error(`Not expecting user ${ownerToRemove.id} to still have ownership === ${expectedOwnership}`);
            }
        })

        // Irrespective of ownerToRemove's ownership, he is part of the team
        await caseService.getCase(ownerToRemove, caseInstance);

        // ownerToRemove cannot perform ownership tasks
        const expectedStatusCodeForCaseTeamActions = removingOwnershipShouldSucceed ? 401 : 200;
        await caseTeamService.setMember(ownerToRemove, caseInstance, new CaseOwner(employee), expectedStatusCodeForCaseTeamActions);
        await caseTeamService.setMember(ownerToRemove, caseInstance, new CaseTeamMember(employee, [], 'user', false), expectedStatusCodeForCaseTeamActions);
    }
}