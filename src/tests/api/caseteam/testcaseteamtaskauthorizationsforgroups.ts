'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import TaskState from '../../../cmmn/taskstate';
import CaseTeam from '../../../cmmn/team/caseteam';
import CaseTeamGroup, { GroupRoleMappingWithCaseOwnership } from '../../../cmmn/team/caseteamgroup';
import CaseService from '../../../service/case/caseservice';
import ConsentGroup from '../../../service/consentgroup/consentgroup';
import ConsentGroupMember, { ConsentGroupOwner } from '../../../service/consentgroup/consentgroupmember';
import ConsentGroupService from '../../../service/consentgroup/consentgroupservice';
import PlatformService from '../../../service/platform/platformservice';
import TaskService from '../../../service/task/taskservice';
import Tenant from '../../../tenant/tenant';
import { TenantOwner } from '../../../tenant/tenantuser';
import { assertTask, findTask } from '../../../test/caseassertions/task';
import TestCase from '../../../test/testcase';
import Util from '../../../test/util';
import User, { admin } from '../../../user';

const definition = Definitions.CaseTeam;
const adminUser1 = new TenantOwner('adminUser1');
const adminUser2 = new TenantOwner('adminUser2');
const employeeUser = new TenantOwner('employeeUser');

const groupRoleAdmin = 'Admin';
const groupRoleEmployee = 'Employee';

const tenant = new Tenant(Util.generateId('tenant-'), [adminUser1, adminUser2, employeeUser]);
const groupId = Util.generateId('group-');
const group = new ConsentGroup([new ConsentGroupOwner(adminUser1.id, [groupRoleAdmin]), new ConsentGroupMember(adminUser2.id, [groupRoleAdmin]), new ConsentGroupMember(employeeUser.id, [groupRoleEmployee])], groupId);

const caseRoleRequestor = "Requestor";
const caseRoleApprover = "Approver";
const caseRolePA = "PersonalAssistant";


const groupMembershipMappingAdmin = new GroupRoleMappingWithCaseOwnership(groupRoleAdmin, [caseRoleApprover, caseRoleRequestor, caseRolePA]);
const groupMembershipMappingEmployee = new GroupRoleMappingWithCaseOwnership(groupRoleEmployee, [caseRoleApprover, caseRoleRequestor, caseRolePA]);

const caseTeamGroup = new CaseTeamGroup(groupId, [groupMembershipMappingAdmin, groupMembershipMappingEmployee]);


export default class TestCaseTeamTaskAuthorizationsForGroups extends TestCase {
    async onPrepareTest() {
        await admin.login();
        await PlatformService.createTenant(admin, tenant);
        await adminUser1.refreshToken();
        await definition.deploy(adminUser1, tenant);
        await ConsentGroupService.createGroup(adminUser1, tenant, group);
        await adminUser2.refreshToken();
        await employeeUser.refreshToken();
    }

    async run() {
        const caseTeam = new CaseTeam([], [caseTeamGroup]);
        const startCase = { tenant, definition, debug: true, caseTeam };
        await ConsentGroupService.getGroup(adminUser1, groupId)
        const caseInstance = await CaseService.startCase(adminUser1, startCase);
        this.addIdentifier(caseInstance);

        // Get case tasks should be possible for sender
        const tasks = await TaskService.getCaseTasks(adminUser1, caseInstance);
        const approveTask = findTask(tasks, 'Approve');

        await TaskService.claimTask(adminUser1, approveTask);
        await assertTask(adminUser1, approveTask, 'Claim', TaskState.Assigned, adminUser1, adminUser1);

        await TaskService.revokeTask(adminUser1, approveTask);
        await assertTask(adminUser1, approveTask, 'Revoke', TaskState.Unassigned, User.NONE, User.NONE);

        await TaskService.claimTask(adminUser2, approveTask);
        await assertTask(adminUser1, approveTask, 'Claim', TaskState.Assigned, adminUser2, adminUser2);

        await TaskService.claimTask(employeeUser, approveTask);
        await assertTask(adminUser1, approveTask, 'Claim', TaskState.Assigned, employeeUser, employeeUser);

        await TaskService.assignTask(employeeUser, approveTask, adminUser2);
        await assertTask(adminUser1, approveTask, 'Assign', TaskState.Assigned, adminUser2, adminUser2);

        // Admin1 can revoke the Approve task (employee perspective)
        await TaskService.completeTask(adminUser1, approveTask);
    }
}
