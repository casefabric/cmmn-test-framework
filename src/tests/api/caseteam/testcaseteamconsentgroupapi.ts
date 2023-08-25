'use strict';

import { assertSameGroup } from '@cafienne/typescript-client';
import Case from '@cafienne/typescript-client/cmmn/case';
import CaseTeam from '@cafienne/typescript-client/cmmn/team/caseteam';
import CaseTeamGroup, { GroupRoleMapping, GroupRoleMappingWithCaseOwnership } from '@cafienne/typescript-client/cmmn/team/caseteamgroup';
import CaseTeamTenantRole from '@cafienne/typescript-client/cmmn/team/caseteamtenantrole';
import CaseTeamUser, { CaseOwner } from '@cafienne/typescript-client/cmmn/team/caseteamuser';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import CaseTeamService from '@cafienne/typescript-client/service/case/caseteamservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import User from '@cafienne/typescript-client/user';
import MultiTenantSetup from '../../multitenantsetup';

// Case definition with the roles
const definition = 'caseteam.xml';
const caseRoleRequestor = 'Requestor';
const caseRoleApprover = 'Approver';
const caseRolePA = 'PersonalAssistant';
const caseRoleParticipant = 'CaseParticipant';
const invalidCaseRole = 'ThisRoleIsNotInTheCaseDefinition';
const emptyRole = '';

// Platform setup with multiple tenants and consent groups.
const universe = new MultiTenantSetup();
const tenant = universe.futureWorld;
// Invalid Consent group roles
const invalidGroupRole = 'ThisRoleIsNotInTheConsentGroup';
const invalidGroupId = 'GroupThatDoesNotExist';
const invalidCaseRoleMapping = new GroupRoleMapping(universe.groupRoleTester, invalidCaseRole);
const invalidGroupRoleMapping = new GroupRoleMapping(invalidGroupRole, caseRolePA);
const validMappingTesterIsPA = new GroupRoleMappingWithCaseOwnership(universe.groupRoleTester, caseRolePA);
const validMappingUserIsRequestor = new GroupRoleMapping(universe.groupRoleUser, caseRoleRequestor);

const caseTeamMoonGroup = new CaseTeamGroup(universe.moonGroup);
const caseTeamMarsGroup = new CaseTeamGroup(universe.marsGroup, [new GroupRoleMapping(universe.groupRoleTester, caseRoleParticipant)]);
const caseTeamMars2Group = new CaseTeamGroup(universe.marsGroup2, [new GroupRoleMapping('', '')]); // Basically anyone in the group
const invalidGroup = new CaseTeamGroup(invalidGroupId, [validMappingTesterIsPA]);
const groupWithoutId = new CaseTeamGroup('', [validMappingTesterIsPA]);
const caseGroups = [caseTeamMoonGroup, invalidGroup];

const caseTeam = new CaseTeam([
    new CaseOwner(universe.boy), // No special roles, case owner can perform all non-consent group related tasks. 
    new CaseOwner(universe.girl, [caseRolePA]), // This case owner can also do consent group tasks with PA as performer.
], caseGroups, [
    new CaseTeamTenantRole('Family') // The whole family has access to the case. But only those in world, not those in moon or mars
]);

// Command to start the case with.
const startCase = { tenant, definition, caseTeam };


export default class TestCaseTeamConsentGroupAPI extends TestCase {
    async onPrepareTest() {
        await universe.create();
        await RepositoryService.validateAndDeploy(universe.boy, definition, tenant);
    }

    async run() {

        // First run a number of negative and positive tests on trying to pass the case team along the start case command with invalid groups
        await this.startCaseTesting();

        await this.validateStartCase();

        // It should be possible to start a case with the valid role names
        caseTeamMoonGroup.mappings = [validMappingTesterIsPA, validMappingUserIsRequestor];
        const caseInstance = await CaseService.startCase(universe.boy, startCase, undefined, 'It should be possible to start a case with the valid role names');
        this.addIdentifier(caseInstance);

        await CaseTeamService.getCaseTeam(universe.boy, caseInstance).then(team => console.log(JSON.stringify(team, undefined, 2)));

        // Below we perform a series of tests on the case team of the case instance.

        // First, check the access to the case for the specified team
        await this.validateCaseAccess(caseInstance);

        // Below run a series of negative tests on the CaseTeam.setGroup API
        await this.setGroupNegativeTesting(caseInstance);

        // Show that we have multiple ways to give a user case access
        await this.addJeffAsUserAndThroughGroup(caseInstance);

        // Modify the mars group in multiple ways
        await this.testVariousGroupUpdates(caseInstance);

        // Show that we can add a different consent group to the case team
        await this.testAdditionalGroup(caseInstance);

        // Show that we can add users to the team without them being registered in a group or a tenant, but simply by token.
        await this.testTokenBasedCafienneAccess(caseInstance);
    }

    async startCaseTesting() {
        await this.startCaseNegativeTesting();
        await this.startCasePositiveTesting();
    }

    async startCaseNegativeTesting() {
        // It should not be possible to start a case without mappings
        await CaseService.startCase(universe.boy, startCase, 400, 'It should not be possible to start a case with groups that have no mappings');

        // Give caseTeamMoonGroup valid mappings
        caseTeamMoonGroup.mappings = [validMappingTesterIsPA, validMappingUserIsRequestor];

        // It should not be possible to start a case with a non-existing consent group.
        await CaseService.startCase(universe.boy, startCase, 404, 'It should not be possible to start a case with a non-existing consent group');

        // It should not be possible to start a case without a groupId
        caseTeam.groups = [groupWithoutId];
        await CaseService.startCase(universe.boy, startCase, 400, 'It should not be possible to start a case without a groupId');

        // Correct the case team to a valid group only
        caseTeam.groups = [caseTeamMoonGroup];

        // Still, it should not be possible to start a case with empty group mappings.
        caseTeamMoonGroup.mappings = [];
        await CaseService.startCase(universe.boy, startCase, 400, 'It should not be possible to start a case with groups that have no mappings');

        // It should not be possible to start a case with an invalid case role
        caseTeamMoonGroup.mappings = [invalidCaseRoleMapping];
        await CaseService.startCase(universe.boy, startCase, 400, 'It should not be possible to start a case with an invalid case role');
    }
    async validateStartCase() {
        // Command to start the case with owner only via user
        await CaseService.startCase(universe.jeff, { 
            tenant: universe.mars, 
            definition, 
            caseTeam: new CaseTeam (
                [ 
                    new CaseOwner(universe.jeff),
                ], 
                [], 
                []) 
            });
        // Command to start the case with owner only via roles
        await CaseService.startCase(universe.jeff, { 
            tenant: universe.mars, 
            definition, 
            caseTeam: new CaseTeam (
                [], 
                [], 
                [ 
                    { tenantRole: universe.groupRoleTester, caseRoles: [caseRoleRequestor], isOwner: true}
                ]) 
            });
        // Command to start the case with owner only via consent group
        await CaseService.startCase(universe.jeff, { 
            tenant: universe.mars, 
            definition, 
            caseTeam: new CaseTeam (
                [], 
                [   new CaseTeamGroup(universe.marsGroup, [
                        { groupRole: universe.groupRoleTester, caseRoles:[caseRoleRequestor], isOwner: true },
                    ])
                ], 
                []) 
            });
                 
    }

    async startCasePositiveTesting() {
        // Command to start the case with owner only via user
        await CaseService.startCase(universe.jeff, {
            tenant: universe.mars,
            definition,
            caseTeam: new CaseTeam(
                [new CaseOwner(universe.jeff)],
                [],
                [])
        });
        // Command to start the case with owner only via roles
        await CaseService.startCase(universe.jeff, {
            tenant: universe.mars,
            definition,
            caseTeam: new CaseTeam(
                [],
                [],
                [{ tenantRole: universe.groupRoleTester, caseRoles: [caseRoleRequestor], isOwner: true }])
        });
        // Command to start the case with owner only via consent group
        await CaseService.startCase(universe.jeff, {
            tenant: universe.mars,
            definition,
            caseTeam: new CaseTeam(
                [],
                [new CaseTeamGroup(universe.marsGroup, [{ groupRole: universe.groupRoleTester, caseRoles: [caseRoleRequestor], isOwner: true },])],
                [])
        });

    }

    async validateCaseAccess(caseInstance: Case) {
        // Tenant members should be able to access the case
        await CaseService.getCase(universe.boy, caseInstance);

        // Consent group members as well
        await CaseService.getCase(universe.neil, caseInstance);

        // Dad should have access since he is has role 'Family' in world tenant
        await CaseService.getCase(universe.dad, caseInstance);

        // Irwin also has role 'Family', but not in 'world', only in 'moon', therefore:
        // Irwin should not have access since he has role 'Family' in moon and not in world tenant
        await CaseService.getCase(universe.irwin, caseInstance, 404, `Irwin should not have access since he has role 'Family' in moon and not in world tenant`);

        // Jeff should not have access, as he is from a different planet
        await CaseService.getCase(universe.jeff, caseInstance, 404, 'Jeff should not have access, as he is from a different planet');
    }

    async setGroupNegativeTesting(caseInstance: Case) {

        // Check what happens if we send an empty json
        const emptyGroupFormat = Object.assign({}) as CaseTeamGroup;
        await CaseTeamService.setGroup(universe.boy, caseInstance, emptyGroupFormat, 400);

        // Setting the group without groupId should also not be possible at the individual case team group operation
        await CaseTeamService.setGroup(universe.boy, caseInstance, groupWithoutId, 400);

        // Passing invalid group should not be allowed
        await CaseTeamService.setGroup(universe.boy, caseInstance, invalidGroup, 404);

        // Check that it is not allowed to set a group without mappings
        caseTeamMoonGroup.mappings = [];
        await CaseTeamService.setGroup(universe.boy, caseInstance, caseTeamMoonGroup, 400);

        // Check that it is not allowed to update a group with invalid case roles
        caseTeamMoonGroup.mappings = [invalidCaseRoleMapping];
        await CaseTeamService.setGroup(universe.boy, caseInstance, caseTeamMoonGroup, 400);
    }

    async addJeffAsUserAndThroughGroup(caseInstance: Case) {

        // Add jeff not through consent, but simply by user id, should no longer check on tenant membership of the user.
        await CaseTeamService.setUser(universe.boy, caseInstance, new CaseTeamUser(universe.jeff));

        // As a platform user, jeff should have access
        await CaseService.getCase(universe.jeff, caseInstance, 200, 'As a platform user, jeff should have access');

        // Remove member jeff
        await CaseTeamService.removeUser(universe.boy, caseInstance, universe.jeff);

        // Jeff should no longer have access, as his user membership is removed
        await CaseService.getCase(universe.jeff, caseInstance, 404, 'Jeff should no longer have access, as his user membership is removed');

        // Add mars group, then Jeff should again get access
        await CaseTeamService.setGroup(universe.boy, caseInstance, caseTeamMarsGroup);

        // As a marsgroup test user, jeff should have access
        await CaseService.getCase(universe.jeff, caseInstance, 200, 'As a marsgroup test user, jeff should have access');
    }

    async testVariousGroupUpdates(caseInstance: Case) {
        // Add mars group again, then Jeff should continue to have access and the group should not have been changed.
        await CaseTeamService.setGroup(universe.boy, caseInstance, caseTeamMarsGroup);

        // Group should not have changed.
        await assertSameGroup(universe.boy, caseInstance, caseTeamMarsGroup);

        // And also jeff should still have access
        await CaseService.getCase(universe.jeff, caseInstance, 200, 'As a marsgroup test user, jeff should have access');

        // Change the group mappings and check they are applied
        const caseTeamMarsGroupAlternative = new CaseTeamGroup(universe.marsGroup, [new GroupRoleMapping(universe.groupRoleTester, [caseRoleApprover, caseRoleRequestor]), validMappingUserIsRequestor]);
        await CaseTeamService.setGroup(universe.boy, caseInstance, caseTeamMarsGroupAlternative);
        await assertSameGroup(universe.boy, caseInstance, caseTeamMarsGroupAlternative);
        await assertSameGroup(universe.boy, caseInstance, caseTeamMarsGroup, false);

        // Restore the initial group mappings and check they are applied
        await CaseTeamService.setGroup(universe.boy, caseInstance, caseTeamMarsGroup);
        await assertSameGroup(universe.boy, caseInstance, caseTeamMarsGroup);
        await assertSameGroup(universe.boy, caseInstance, caseTeamMarsGroupAlternative, false);

        // Check to see if we can remove the group and set it again.
        await CaseTeamService.removeGroup(universe.boy, caseInstance, caseTeamMarsGroup);
        await CaseTeamService.getCaseTeam(universe.boy, caseInstance).then(team => {
            if (team.groups.filter(group => group.groupId === caseTeamMarsGroup.groupId).length > 0) {
                throw new Error(`Marsgroup should not be part of the case team anymore, but it is still found.`)
            }
        });

        // Set the mars group again and check is is available again
        await CaseTeamService.setGroup(universe.boy, caseInstance, caseTeamMarsGroup);
        await assertSameGroup(universe.boy, caseInstance, caseTeamMarsGroup);

        // Now also give it ownership, and also different case roles
        const groupMapping = new GroupRoleMappingWithCaseOwnership(universe.groupRoleTester, [caseRoleRequestor, caseRoleApprover]);
        const caseTeamMarsGroupWithOwnership = new CaseTeamGroup(universe.marsGroup, [groupMapping]);
        await CaseTeamService.setGroup(universe.boy, caseInstance, caseTeamMarsGroupWithOwnership);
        await assertSameGroup(universe.boy, caseInstance, caseTeamMarsGroupWithOwnership);
    }

    async testAdditionalGroup(caseInstance: Case) {
        // First, validate that elon does not have access, as he is from a different planet
        await CaseService.getCase(universe.elon, caseInstance, 404, 'Elon should not have access, as he is from a different planet');

        // Add mars2 group, then Elon should also get access
        await CaseTeamService.setGroup(universe.boy, caseInstance, caseTeamMars2Group);

        // As a marsgroup2 member, elon should have access
        await CaseService.getCase(universe.elon, caseInstance, 200, 'As a marsgroup2 member, elon should have access');
    }

    async testTokenBasedCafienneAccess(caseInstance: Case) {

        // It should also be possible to add a member that is not even registered in the case system. As long as that member has a valid token, they should be able to get the case.
        const someone = new User('Some-one-out-there');
        const someoneElse = new User('Not just someone out there');
        await CaseTeamService.setUser(universe.boy, caseInstance, new CaseTeamUser(someone));

        await someone.login();
        await someoneElse.login();

        // Someone should have access ...
        await CaseService.getCase(someone, caseInstance);

        // ... someone else not
        await CaseService.getCase(someoneElse, caseInstance, 404);

        await CaseTeamService.getCaseTeam(someone, caseInstance).then(team => console.log(JSON.stringify(team, undefined, 2)));

    }
}
