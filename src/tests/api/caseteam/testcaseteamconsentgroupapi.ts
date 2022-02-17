'use strict';

import CaseTeam from '@cafienne/typescript-client/cmmn/team/caseteam';
import CaseTeamGroup, { GroupRoleMapping, GroupRoleMappingWithCaseOwnership } from '@cafienne/typescript-client/cmmn/team/caseteamgroup';
import CaseTeamUser, { CaseOwner } from '@cafienne/typescript-client/cmmn/team/caseteamuser';
import CaseTeamTenantRole from '@cafienne/typescript-client/cmmn/team/caseteamtenantrole';
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
export default class TestCaseTeamConsentGroupAPI extends TestCase {
    async onPrepareTest() {
        await universe.create();
        await RepositoryService.validateAndDeploy(universe.boy, definition, tenant);
    }

    async run() {
        const invalidCaseRoleMapping = new GroupRoleMapping(universe.groupRoleTester, invalidCaseRole);
        const invalidGroupRoleMapping = new GroupRoleMapping(invalidGroupRole, caseRolePA);
        const validMappingTesterIsPA = new GroupRoleMappingWithCaseOwnership(universe.groupRoleTester, caseRolePA);
        const validMappingUserIsRequestor = new GroupRoleMapping(universe.groupRoleUser, caseRoleRequestor);

        const caseTeamMoonGroup = new CaseTeamGroup(universe.moonGroup);
        const caseTeamMarsGroup = new CaseTeamGroup(universe.marsGroup, [new GroupRoleMapping(universe.groupRoleTester, caseRoleParticipant)]);
        const caseTeamMars2Group = new CaseTeamGroup(universe.marsGroup2, [new GroupRoleMapping('', '')]); // Basically anyone in the group
        const invalidGroup = new CaseTeamGroup(invalidGroupId, [validMappingTesterIsPA]);
        const caseGroups = [caseTeamMoonGroup, invalidGroup];

        const caseTeam = new CaseTeam([
            new CaseOwner(universe.boy), // No special roles, case owner can perform all non-consent group related tasks. 
            new CaseOwner(universe.girl, [caseRolePA]), // This case owner can also do consent group tasks with PA as performer.
        ], caseGroups, [
            new CaseTeamTenantRole('Family') // The whole family has access to the case. But only those in world, not those in moon or mars
        ]);

        // Command to start the case with.
        const startCase = { tenant, definition, caseTeam };

        // It should not be possible to start a case without mappings
        await CaseService.startCase(universe.boy, startCase, 400, 'It should not be possible to start a case with groups that have no mappings');

        // Give caseTeamMoonGroup valid mappings
        caseTeamMoonGroup.mappings = [validMappingTesterIsPA, validMappingUserIsRequestor];

        // It should not be possible to start a case with a non-existing consent group.
        await CaseService.startCase(universe.boy, startCase, 404, 'It should not be possible to start a case with a non-existing consent group');

        // Correct the case team to a valid group
        caseTeam.groups = [caseTeamMoonGroup];

        // It should not be possible to start a case with an invalid case role
        caseTeamMoonGroup.mappings = [invalidCaseRoleMapping];
        await CaseService.startCase(universe.boy, startCase, 400, 'It should not be possible to start a case with an invalid case role');

        // It should not be possible to start a case with an invalid group role
        caseTeamMoonGroup.mappings = [invalidGroupRoleMapping];
        await CaseService.startCase(universe.boy, startCase, 404, 'It should not be possible to start a case with an invalid group role');

        // It should be possible to start a case with the valid role names
        caseTeamMoonGroup.mappings = [validMappingTesterIsPA, validMappingUserIsRequestor];
        const caseInstance = await CaseService.startCase(universe.boy, startCase, undefined, 'It should be possible to start a case with the valid role names');

        await CaseTeamService.getCaseTeam(universe.boy, caseInstance).then(team => console.log(JSON.stringify(team, undefined, 2)));

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

        // And so is Elon
        await CaseService.getCase(universe.elon, caseInstance, 404, 'Elon should not have access, as he is from a different planet');

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

        // Add mars2 group, then Elon should also get access
        await CaseTeamService.setGroup(universe.boy, caseInstance, caseTeamMars2Group);

        // As a marsgroup2 member, elon should have access
        await CaseService.getCase(universe.elon, caseInstance, 200, 'As a marsgroup2 member, elon should have access');

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