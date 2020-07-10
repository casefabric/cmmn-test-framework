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
        await repositoryService.validateAndDeploy(definition, sender, tenant);
        await new TenantService().addTenantUserRole(sender, worldwideTenant.tenant, sender.id, 'Receiver');
    }

    async run() {
        const caseTeam = new CaseTeam([
            new CaseOwner(sender, [requestorRole]),
            new CaseOwner(receiver, [approverRole, paRole]),
            new TenantRoleMember(requestorRole, ['ADMIN', 'Not-Exisitng-TenantRole-Still-Allowed-In-Team'])
        ]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        // It should not be possible to start a case with invalid role names
        await caseService.startCase(startCase, sender, false);

        caseTeam.members[2].caseRoles = []; // Change roles of requestor to be empty instead of having wrong roles
        const caseInstance = await caseService.startCase(startCase, sender) as Case;


        // Try to set a team with invalid users
        const t2 = new CaseTeam([new CaseTeamMember('Piet', [requestorRole]), new CaseTeamMember('Joop'), new CaseTeamMember(receiver)]);
        // This call fails, because the new case team does not have existing users
        await caseTeamService.setCaseTeam(caseInstance, sender, t2, false);
        // This call fails, because the new member is not an existing user
        await caseTeamService.setMember(caseInstance, sender, new CaseTeamMember('PietjePrecies'), false);

        // Getting the case must be allowed for both sender and receiver
        await caseService.getCase(caseInstance, sender);
        await caseService.getCase(caseInstance, receiver);
        // Getting the case is not allow for the employee, as he is not part of the case team
        await caseService.getCase(caseInstance, employee, false);

        // After removing receiver, he should not longer have access.
        await caseTeamService.removeMember(caseInstance, sender, receiver);

        // Receiver is no longer part of the team
        await assertCaseTeamMember(new CaseOwner(receiver, [approverRole, paRole]), caseInstance, sender, false);

        // Getting the case is no longer allowed for receiver
        // Getting the case is still allowed for sender
        await caseService.getCase(caseInstance, receiver, false);
        await caseService.getCase(caseInstance, sender);

        // Removing someone that is not part of the team should fail
        await caseTeamService.removeMember(caseInstance, sender, employee, false);

        // Fetch case team. Should not be allowed for receiver, but should work for sender.
        await caseTeamService.getCaseTeam(caseInstance, receiver, false);
        await caseTeamService.getCaseTeam(caseInstance, sender);
        
        // Getting the case file is allowed for sender, as he is part of the team
        await caseFileService.getCaseFile(caseInstance, sender);
        // Getting the case file is not allowed for receiver, as he is no longer part of the team
        await caseFileService.getCaseFile(caseInstance, receiver, false);

        // Add employee to the team, and show that he now has access to the case
        await caseTeamService.setMember(caseInstance, sender, new CaseTeamMember(employee));
        await assertCaseTeamMember(new CaseTeamMember(employee), caseInstance, sender);

        // Now employee should be able to get the case
        await caseService.getCase(caseInstance, employee);

        // Replace entire case team; removes sender and employee and then adds receiver and employee
        const newTeam = new CaseTeam([new CaseTeamMember(receiver, [requestorRole]), new CaseTeamMember(employee)]);
        // This call fails, because the new case team does not have any owners defined
        await caseTeamService.setCaseTeam(caseInstance, sender, newTeam, false);
        // Make receiver the owner, and then it should work
        newTeam.members[0].isOwner = true;
        await caseTeamService.setCaseTeam(caseInstance, sender, newTeam);

        // Verify whether receiver is owner or not
        await assertCaseTeamMember(new CaseOwner(receiver, [requestorRole]), caseInstance, receiver);
        // Verify employee's presence in the case team
        await assertCaseTeamMember(new CaseTeamMember(employee), caseInstance, receiver);
        // Sender is not part of the team
        await assertCaseTeamMember(new CaseOwner(sender, [requestorRole]), caseInstance, receiver, false);

        // So now sender no longer has access, but the others do.
        await caseService.getCase(caseInstance, sender, false);
        await caseService.getCase(caseInstance, receiver);
        await caseService.getCase(caseInstance, employee);

        // Compare the case team with both what the GET case API thinks it is and what the GET case team API thinks it is
        await assertCaseTeam(caseInstance, employee, newTeam);

        // Add a role that is not defined in the case model should not be possible
        await caseTeamService.setMember(caseInstance, receiver, new CaseOwner(receiver, [notExistingRole]), false);

        // Add an empty role should not be possible through setting a member
        await caseTeamService.setMember(caseInstance, receiver, new CaseTeamMember(employee, [emptyRole]), false);
        // But not when assigning a non existing role
        await caseTeamService.setMember(caseInstance, receiver, new CaseTeamMember(employee, ['a/b/c']), false);

        // Now add approver role to the employee and see if that works
        await caseTeamService.setMember(caseInstance, receiver, new CaseTeamMember(employee, [approverRole]));
        // Now add approver role to the receiver and see if that works
        await caseTeamService.setMember(caseInstance, receiver, new CaseOwner(receiver, [approverRole]));

        // Verify employee's, and receiver's membership in the team
        await assertCaseTeamMember(new CaseOwner(receiver, [requestorRole, approverRole]), caseInstance, receiver);
        await assertCaseTeamMember(new CaseTeamMember(employee, [approverRole]), caseInstance, receiver);

        // Remove requestorRole from receiver
        await caseTeamService.removeMemberRoles(caseInstance, receiver, new CaseOwner(receiver), requestorRole);
        await assertCaseTeamMember(new CaseOwner(receiver, [approverRole]), caseInstance, receiver);

        // Now add PA role to the receiver and see if that works
        await caseTeamService.setMember(caseInstance, receiver, new CaseOwner(receiver, [paRole]));
        await assertCaseTeamMember(new CaseOwner(receiver, [approverRole, paRole]), caseInstance, receiver);

        const caseTeam1 = new CaseTeam([
            new CaseOwner(receiver),
            new CaseOwner(sender)
        ]);
        const caseTeam2 = new CaseTeam([
            new CaseOwner(receiver)
        ]);

        console.log('\nA test for removing a user\'s ownership by another owner\n')
        await this.testOwnership(caseTeam1, sender, receiver)

        console.log('\nA test for removing self ownership when there are more than one owners\n')
        await this.testOwnership(caseTeam1, receiver, receiver)

        console.log('\nA test for removing self ownership when there is one owner\n')
        await this.testOwnership(caseTeam2, receiver, receiver, false, true)
    }

    async testOwnership(caseTeam: CaseTeam, ownerWhoRemoves: User, ownerToRemove: User, expectNoFailure: boolean = true, isStillOwner: boolean = false) {
        const startCase = { tenant, definition, debug: true, caseTeam };

        // Starting a by ownerWhoRemoves would not result in failure
        const caseInstance = await caseService.startCase(startCase, ownerWhoRemoves) as Case;

        // ownerToRemove can perform get case
        await caseService.getCase(caseInstance, ownerToRemove);

        await assertCaseTeam(caseInstance, receiver, caseTeam);

        // It should be possible to remove a user's ownership by another owner
        await caseTeamService.setMember(caseInstance, ownerWhoRemoves, new CaseTeamMember(ownerToRemove, [], 'user', false), expectNoFailure);

        // Verify ownerToRemove's ownership in the case team
        await assertCaseTeamMember(new CaseTeamMember(ownerToRemove, [], 'user', false), caseInstance, ownerWhoRemoves, expectNoFailure);

        // Irrespective of ownerToRemove's ownership, he is part of the team
        await caseService.getCase(caseInstance, ownerToRemove);

        // ownerToRemove cannot perform ownership tasks
        await caseTeamService.setMember(caseInstance, ownerToRemove, new CaseOwner(ownerToRemove), isStillOwner);
        await caseTeamService.setMember(caseInstance, ownerToRemove, new CaseTeamMember(ownerWhoRemoves, [], 'user', false), false);
    }
}