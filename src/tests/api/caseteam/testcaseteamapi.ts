'use strict';

import Case from '../../../cmmn/case';
import Definitions from '../../../cmmn/definitions/definitions';
import CaseTeam from '../../../cmmn/team/caseteam';
import CaseTeamTenantRole from '../../../cmmn/team/caseteamtenantrole';
import CaseTeamUser, { CaseOwner } from '../../../cmmn/team/caseteamuser';
import CaseFileService from '../../../service/case/casefileservice';
import CaseService from '../../../service/case/caseservice';
import CaseTeamService from '../../../service/case/caseteamservice';
import { assertCaseTeam, assertCaseTeamUser } from '../../../test/caseassertions/team';
import TestCase from '../../../test/testcase';
import User from '../../../user';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';

const definition = Definitions.CaseTeam;
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
    private casesCreated: Array<Case> = [];

    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(sender, tenant);
    }

    async run() {
        await this.generalAPITest();
        await this.ownershipTest();

        console.log("Test Case Team API generated cases\n- " + this.casesCreated.join("\n- "))
    }

    async generalAPITest() {
        const caseTeam = new CaseTeam([
            new CaseOwner(sender, [requestorRole]),
            new CaseOwner(receiver, [approverRole, paRole])
        ], [], [new CaseTeamTenantRole(requestorRole, ['ADMIN', 'Not-Exisitng-TenantRole-Still-Allowed-In-Team'])]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        // It should not be possible to start a case with invalid role names
        await CaseService.startCase(sender, startCase, 400, 'It should not be possible to start a case with invalid role names');

        caseTeam.tenantRoles[0].caseRoles = []; // Change roles of requestor to be empty instead of having wrong roles
        const caseInstance = await CaseService.startCase(sender, startCase);
        this.casesCreated.push(caseInstance);
        this.addIdentifier(caseInstance);

        // It should not be possible to start a case without case owners in the team
        const t2 = new CaseTeam([
            new CaseTeamUser('Piet', [requestorRole]),
            new CaseTeamUser('Joop'),
            new CaseTeamUser(receiver)
        ]);
        await CaseTeamService.setCaseTeam(sender, caseInstance, t2, 400, 'It should not be possible to start a case without case owners in the team');

        // Getting the case must be allowed for both sender and receiver
        await CaseService.getCase(sender, caseInstance);
        await CaseService.getCase(receiver, caseInstance);
        // Getting the case is not allow for the employee, as he is not part of the case team
        await CaseService.getCase(employee, caseInstance, 404);

        // After removing receiver, he should not longer have access.
        await CaseTeamService.removeUser(sender, caseInstance, receiver);

        // Receiver is no longer part of the team
        await assertCaseTeamUser(sender, caseInstance, new CaseOwner(receiver, [approverRole, paRole]), false);

        // Getting the case is no longer allowed for receiver
        // Getting the case is still allowed for sender
        await CaseService.getCase(receiver, caseInstance, 404);
        await CaseService.getCase(sender, caseInstance);

        // Removing someone that is not part of the team should fail
        await CaseTeamService.removeUser(sender, caseInstance, employee, 400, 'Removing someone that is not part of the team should fail');

        // Fetch case team. Should not be allowed for receiver, but should work for sender.
        await CaseTeamService.getCaseTeam(receiver, caseInstance, 404, 'Fetch case team. Should not be allowed for receiver, but should work for sender');
        await CaseTeamService.getCaseTeam(sender, caseInstance);

        // Getting the case file is allowed for sender, as he is part of the team
        await CaseFileService.getCaseFile(sender, caseInstance);
        // Getting the case file is not allowed for receiver, as he is no longer part of the team
        await CaseFileService.getCaseFile(receiver, caseInstance, 404, 'Getting the case file is not allowed for receiver, as he is no longer part of the team');

        // Add employee to the team, and show that he now has access to the case
        await CaseTeamService.setUser(sender, caseInstance, new CaseTeamUser(employee));
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee));

        // Now employee should be able to get the case
        await CaseService.getCase(employee, caseInstance);

        // Replace entire case team; removes sender and employee and then adds receiver and employee
        const newTeam = new CaseTeam([new CaseTeamUser(receiver, [requestorRole]), new CaseTeamUser(employee)]);
        // This call fails, because the new case team does not have any owners defined
        await CaseTeamService.setCaseTeam(sender, caseInstance, newTeam, 400, 'This call fails, because the new case team does not have any owners defined');
        // Make receiver the owner, and then it should work
        newTeam.users[0].isOwner = true;
        // This call fails, because employee is not an owner
        await CaseTeamService.setCaseTeam(employee, caseInstance, newTeam, 401, 'This call fails, because employee is not an owner');
        await CaseTeamService.setCaseTeam(sender, caseInstance, newTeam);

        // Verify whether receiver is owner or not
        await assertCaseTeamUser(receiver, caseInstance, new CaseOwner(receiver, [requestorRole]));
        // Verify employee's presence in the case team
        await assertCaseTeamUser(receiver, caseInstance, new CaseTeamUser(employee));
        // Sender is not part of the team
        await assertCaseTeamUser(receiver, caseInstance, new CaseOwner(sender, [requestorRole]), false);

        // So now sender no longer has access, but the others do.
        await CaseService.getCase(sender, caseInstance, 404);
        await CaseService.getCase(receiver, caseInstance);
        await CaseService.getCase(employee, caseInstance);

        // Generate multiple events on the user, and validate them
        await CaseTeamService.setUser(receiver, caseInstance, new CaseTeamUser(employee, [requestorRole]));
        await assertCaseTeamUser(receiver, caseInstance, new CaseTeamUser(employee, [requestorRole]));
        await CaseTeamService.setUser(receiver, caseInstance, new CaseOwner(employee, [approverRole]));
        await assertCaseTeamUser(receiver, caseInstance, new CaseOwner(employee, [approverRole]));

        // Show that setCaseTeam is idempotent
        await CaseTeamService.setCaseTeam(receiver, caseInstance, newTeam);
        await assertCaseTeam(receiver, caseInstance, newTeam);
        await CaseTeamService.setCaseTeam(receiver, caseInstance, newTeam);
        await assertCaseTeam(receiver, caseInstance, newTeam);

        // Compare the case team with both what the GET case API thinks it is and what the GET case team API thinks it is
        await assertCaseTeam(employee, caseInstance, newTeam);

        // Add a role that is not defined in the case model should not be possible
        await CaseTeamService.setUser(receiver, caseInstance, new CaseOwner(receiver, [notExistingRole]), 400, 'Add a role that is not defined in the case model should not be possible');

        // Add an empty role should not be possible through setting a member
        await CaseTeamService.setUser(receiver, caseInstance, new CaseTeamUser(employee, [emptyRole]), 400, 'Add an empty role should not be possible through setting a member');
        // But not when assigning a non existing role
        await CaseTeamService.setUser(receiver, caseInstance, new CaseTeamUser(employee, ['a/b/c']), 400, 'Add an invalid role should not be possible through setting a member');

        // Now add approver role to the employee and see if that works
        await CaseTeamService.setUser(receiver, caseInstance, new CaseTeamUser(employee, [approverRole]));
        // Now add approver role to the receiver and see if that works
        await CaseTeamService.setUser(receiver, caseInstance, new CaseOwner(receiver, [requestorRole, approverRole]));

        // Verify employee's, and receiver's membership in the team
        await assertCaseTeamUser(receiver, caseInstance, new CaseOwner(receiver, [requestorRole, approverRole]));
        await assertCaseTeamUser(receiver, caseInstance, new CaseTeamUser(employee, [approverRole]));

        // Remove requestorRole from receiver
        await CaseTeamService.setUser(receiver, caseInstance, new CaseOwner(receiver, [approverRole]));
        await assertCaseTeamUser(receiver, caseInstance, new CaseOwner(receiver, [approverRole]));

        // Now add PA role to the receiver and see if that works
        await CaseTeamService.setUser(receiver, caseInstance, new CaseOwner(receiver, [approverRole, paRole]));
        await assertCaseTeamUser(receiver, caseInstance, new CaseOwner(receiver, [approverRole, paRole]));
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
        const caseInstance = await CaseService.startCase(ownerWhoRemoves, startCase);
        this.casesCreated.push(caseInstance);
        this.addIdentifier(caseInstance);

        // ownerToRemove can perform get case and get team
        await CaseService.getCase(ownerToRemove, caseInstance);
        await assertCaseTeam(ownerToRemove, caseInstance, caseTeam);

        // It should be possible to remove a user's ownership by another owner
        const expectedRemovalStatusCode = removingOwnershipShouldSucceed ? 200 : 400;
        await CaseTeamService.setUser(ownerWhoRemoves, caseInstance, new CaseTeamUser(ownerToRemove, []), expectedRemovalStatusCode);

        // Verify ownerToRemove's ownership in the case team
        await CaseTeamService.getCaseTeam(ownerWhoRemoves, caseInstance).then(team => {
            const expectedOwnership = !removingOwnershipShouldSucceed;
            if (team.find(ownerToRemove)?.isOwner !== expectedOwnership) {
                throw new Error(`Not expecting user ${ownerToRemove.id} to still have ownership === ${expectedOwnership}`);
            }
        })

        // Irrespective of ownerToRemove's ownership, he is part of the team
        await CaseService.getCase(ownerToRemove, caseInstance);

        // ownerToRemove cannot perform ownership tasks
        const expectedStatusCodeForCaseTeamActions = removingOwnershipShouldSucceed ? 401 : 200;
        await CaseTeamService.setUser(ownerToRemove, caseInstance, new CaseOwner(employee), expectedStatusCodeForCaseTeamActions);
        await CaseTeamService.setUser(ownerToRemove, caseInstance, new CaseTeamUser(employee, []), expectedStatusCodeForCaseTeamActions);

        return caseInstance;
    }
}
