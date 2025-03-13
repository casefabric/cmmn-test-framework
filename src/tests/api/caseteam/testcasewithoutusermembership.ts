'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import CaseTeam from '../../../cmmn/team/caseteam';
import CaseTeamGroup, { GroupRoleMappingWithCaseOwnership } from '../../../cmmn/team/caseteamgroup';
import { CaseOwnerTenantRole } from '../../../cmmn/team/caseteamtenantrole';
import CaseService from '../../../service/case/caseservice';
import ConsentGroup from '../../../service/consentgroup/consentgroup';
import ConsentGroupService from '../../../service/consentgroup/consentgroupservice';
import TestCase from '../../../test/testcase';
import Util from '../../../test/util';
import User, { admin } from '../../../user';
import RandomTenant from '../../setup/randomtenant';
import RandomUser from '../../setup/randomuser';

const definition = Definitions.HelloWorld;

const primaryTenant = new RandomTenant('primary_tenant_');

const TENANT_ROLE_1 = 'TenantRole_1';

// Create a user that has tenant role 1 and also one with role 2.
//  The first one should have case access, the second one not.
const userWith_TENANT_ROLE_1 = primaryTenant.addUser(new RandomUser(undefined, [TENANT_ROLE_1]));

// Also create a group in the primary tenant, with both a member that has TenantRole1 and also one that has a different role
const groupInPrimaryTenant = new ConsentGroup([], Util.generateId('random_group_in_' + primaryTenant.name));

export default class TestCaseWithoutUserMembership extends TestCase {
    async onPrepareTest() {
        await admin.login();

        await primaryTenant.create(admin);
        this.addIdentifier(primaryTenant);
        this.addIdentifier(groupInPrimaryTenant);
        await userWith_TENANT_ROLE_1.login();

        await ConsentGroupService.createGroup(admin, primaryTenant, groupInPrimaryTenant);
        // Get the group to ensure it exists when creating a case for it
        // await ConsentGroupService.getGroup(userWith_TENANT_ROLE_1, groupInPrimaryTenant);

        await definition.deploy(admin, primaryTenant);
    }

    async run() {
        // First check that we can get access to the case by only having a tenant role in the case team
        await this.startAndGetCase(userWith_TENANT_ROLE_1, new CaseTeam([], [], [new CaseOwnerTenantRole(TENANT_ROLE_1, [])]));

        // Now check the same with consent group membership
        const group = new CaseTeamGroup(groupInPrimaryTenant, [new GroupRoleMappingWithCaseOwnership(TENANT_ROLE_1, [])]);
        await this.startAndGetCase(userWith_TENANT_ROLE_1, new CaseTeam([], [group], []));
    }

    async startAndGetCase(memberUser: User, caseTeam: CaseTeam) {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: admin.id
            }
        };
        
        const startCase = { tenant: primaryTenant.name, definition, inputs, caseTeam };

        const caseInstance = await CaseService.startCase(admin, startCase);
        this.addIdentifier(caseInstance);

        // Check that case creator does NOT have access
        await CaseService.getCase(admin, caseInstance, 404);

        // MemberUser must have access to    get the case
        await CaseService.getCase(memberUser, caseInstance);


        
    }
}
