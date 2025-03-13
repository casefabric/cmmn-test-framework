'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import CaseTeam from '../../../cmmn/team/caseteam';
import CaseTeamTenantRole from '../../../cmmn/team/caseteamtenantrole';
import { CaseOwner } from "../../../cmmn/team/caseteamuser";
import CaseService from '../../../service/case/caseservice';
import TestCase from '../../../test/testcase';
import { admin } from '../../../user';
import RandomGroup from '../../setup/randomgroup';
import RandomTenant from '../../setup/randomtenant';
import RandomUser from '../../setup/randomuser';

const definition = Definitions.HelloWorld;

const primaryTenant = new RandomTenant('primary_tenant_');
const otherTenant = new RandomTenant('other_tenant_');

const TENANT_ROLE_1 = 'TenantRole_1';
const TENANT_ROLE_2 = 'TenantRole_2';

// Create a user that has tenant role 1 and also one with role 2.
//  The first one should have case access, the second one not.
const userWithTenantRole1 = primaryTenant.addUser(new RandomUser('userWithTenantRole1', [TENANT_ROLE_1]));
const userWithTenantRole2 = primaryTenant.addUser(new RandomUser('userWithTenantRole2', [TENANT_ROLE_2]));

// Also create a group in the primary tenant, with both a member that has TenantRole1 and also one that has a different role
const groupInPrimaryTenant = primaryTenant.addGroup(new RandomGroup('group_in_primary_tenant_'));
const userInGroupWithTenantRole1 = groupInPrimaryTenant.addMember(new RandomUser('userInGroupWithTenantRole1'), [TENANT_ROLE_1]);
const userInGroupWithRole2 = groupInPrimaryTenant.addMember(new RandomUser('userInGroupWithRole2'), [TENANT_ROLE_2]);

// Now create a user and a group in another tenant with users that have the same role name. They should not have case access
const userInOtherTenantWithTenantRole1 = otherTenant.addUser(new RandomUser('user_in_other_tenant', [TENANT_ROLE_1]));
const groupInOtherTenant = otherTenant.addGroup(new RandomGroup('group_in_other_tenant_'));
const userInOtherTenantGroupWithTenantRole1 = new RandomUser('userInOtherTenantWithTenantRole1');
groupInOtherTenant.addMember(userInOtherTenantGroupWithTenantRole1, [TENANT_ROLE_1]);
groupInOtherTenant.addMember(userInGroupWithRole2, [TENANT_ROLE_1]);


export default class TestTenantGroupMembership extends TestCase {
    async onPrepareTest() {
        await admin.login();

        await primaryTenant.create(admin);
        this.addIdentifier(primaryTenant);
        this.addIdentifier(groupInPrimaryTenant);

        await otherTenant.create(admin);
        this.addIdentifier(otherTenant);
        this.addIdentifier(groupInOtherTenant)

        await definition.deploy(admin, primaryTenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: admin.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(admin)], [], [new CaseTeamTenantRole(TENANT_ROLE_1, [])]);
        
        const startCase = { tenant: primaryTenant.name, definition, inputs, caseTeam };

        const caseInstance = await CaseService.startCase(admin, startCase);
        this.addIdentifier(caseInstance);

        // Case owner can of course get the case
        await CaseService.getCase(admin, caseInstance);

        // User in primary tenant with tenant role 1 should have access.
        await CaseService.getCase(userWithTenantRole1, caseInstance);

        // User in primary tenant with tenant role 2 should not have access.
        await CaseService.getCase(userWithTenantRole2, caseInstance, 404);

        // User in group in primary tenant with tenant role 1 should have access.
        await CaseService.getCase(userInGroupWithTenantRole1, caseInstance);

        // User in group in primary tenant with tenant role 2 should not have access.
        await CaseService.getCase(userInGroupWithRole2, caseInstance, 404);

        // User in other tenant with tenant role 1 should not have access.
        await CaseService.getCase(userInOtherTenantWithTenantRole1, caseInstance, 404);

        // User in group in other tenant with tenant role 1 should not have access.
        await CaseService.getCase(userInOtherTenantGroupWithTenantRole1, caseInstance, 404);

    }
}
