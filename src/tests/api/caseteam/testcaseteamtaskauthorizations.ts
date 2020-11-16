'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeamMember, { CaseOwner } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import Case from '../../../framework/cmmn/case';
import { findTask, assertTask, assertCaseTeamMember } from '../../../framework/test/assertions';
import TaskService from '../../../framework/service/task/taskservice';
import User from '../../../framework/user';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import TenantUser from '../../../framework/tenant/tenantuser';

const repositoryService = new RepositoryService();
const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant('wwtt-3');
const taskService = new TaskService();
const caseTeamService = new CaseTeamService();

const definition = 'caseteam.xml';
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;
const requestorRole = "Requestor";
const approverRole = "Approver";
const paRole = "PersonalAssistant";

export default class TestCaseTeamTaskAuthorizations extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, sender, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([
            new CaseOwner(sender),
            new CaseTeamMember(receiver, [approverRole, paRole, requestorRole], 'user', false)
        ]);
        const startCase = { tenant, definition, debug: true, caseTeam };
        const caseInstance = await caseService.startCase(sender, startCase) as Case;

        // Get case tasks should be possible for sender
        const tasks = await taskService.getCaseTasks(caseInstance, sender);
        const approveTask = findTask(tasks, 'Approve');
        const requestTask = findTask(tasks, 'Request');
        const assistTask = findTask(tasks, 'Assist');

        // Although sender didn't have appropriate roles;
        // Sender can claim Approve task, as sender is owner
        await taskService.claimTask(approveTask, sender);
        await assertTask(approveTask, sender, 'Claim', 'Assigned', sender, sender);

        // Sender can revoke Approve task
        await taskService.revokeTask(approveTask, sender);
        await assertTask(approveTask, sender, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Now, Approve task can be claimed by receiver (as a member who have appropriate roles)
        await taskService.claimTask(approveTask, receiver);
        await assertTask(approveTask, sender, 'Claim', 'Assigned', receiver, receiver);

        // Employee is not part of the case team
        await assertCaseTeamMember(new CaseTeamMember(employee), caseInstance, sender, false);

        // Although employee doesn't have appropriate roles and not part of the team;
        // Sender can delegate Approve task to employee (receiver perspective)
        await taskService.delegateTask(approveTask, sender, employee);
        await assertTask(approveTask, sender, 'Delegate', 'Delegated', employee, receiver);

        // Now, employee is part of the case team with Approver role
        await assertCaseTeamMember(new CaseTeamMember(employee, [approverRole]), caseInstance, sender);

        // Employee cannot claim the Approve task; because Approve task is delegated
        await taskService.claimTask(approveTask, employee, 400);
        await assertTask(approveTask, sender, 'Claim', 'Delegated', employee, receiver);

        // Sender can revoke the Approve task (employee perspective)
        await taskService.revokeTask(approveTask, sender);
        await assertTask(approveTask, sender, 'Revoke', 'Assigned', receiver, receiver);

        // Sender can revoke the Approve task (receiver perspective)
        await taskService.revokeTask(approveTask, sender);
        await assertTask(approveTask, sender, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Sender can remove Approve role from employee
        await caseTeamService.removeMemberRoles(sender, caseInstance, new CaseTeamMember(employee), approverRole);
        await assertCaseTeamMember(new CaseTeamMember(employee), caseInstance, sender);

        // Approve task can be assigned to employee by sender (although he don't have appropriate roles)
        await taskService.assignTask(approveTask, sender, employee);
        await assertTask(approveTask, sender, 'Assign', 'Assigned', employee, employee);

        // Now, employee gets the Approve role as sender is assigned task to employee
        await assertCaseTeamMember(new CaseTeamMember(employee, [approverRole]), caseInstance, sender);

        // Sender don't have the Approver role
        await assertCaseTeamMember(new CaseOwner(sender), caseInstance, sender);

        // Employee delegates the Approve task to sender
        await taskService.delegateTask(approveTask, employee, sender);
        await assertTask(approveTask, sender, 'Delegate', 'Delegated', sender, employee);

        // Now, sender should not get the Approver role (as Sender is owner)
        await assertCaseTeamMember(new CaseOwner(sender, []), caseInstance, sender);

        // Sender cannot claim the Approve task as sender is delegated to it
        await taskService.claimTask(approveTask, sender, 400);
        await assertTask(approveTask, sender, 'Claim', 'Delegated', sender, employee);
        
        // Sender revokes the Approve task
        await taskService.revokeTask(approveTask, sender);
        await assertTask(approveTask, sender, 'Revoke', 'Assigned', employee, employee);

        // Receiver cannot delegate Approve task to sender
        await taskService.delegateTask(approveTask, receiver, sender, 401);
        await assertTask(approveTask, sender, 'Assign', 'Assigned', employee, employee);

        // Sender delegates the Approve task to receiver (employee perspective)
        await taskService.delegateTask(approveTask, sender, receiver);
        await assertTask(approveTask, sender, 'Delegate', 'Delegated', receiver, employee);

        // Receiver cannot claim the Approve task, as Approve task is delegated to receiver itself
        await taskService.claimTask(approveTask, receiver, 400);
        await assertTask(approveTask, sender, 'Claim', 'Delegated', receiver, employee);

        // Receiver can revoke the Approve task
        await taskService.revokeTask(approveTask, receiver);
        await assertTask(approveTask, sender, 'Revoke', 'Assigned', employee, employee);

        // Sender can delegate the Approve task to sender itself
        await taskService.delegateTask(approveTask, sender, sender);
        await assertTask(approveTask, sender, 'Delegate', 'Delegated', sender, employee);

        // Although employee is the owner of the Approve task, cannot revoke it
        await taskService.revokeTask(approveTask, employee, 401);
        await assertTask(approveTask, sender, 'Revoke', 'Delegated', sender, employee);

        // Sender can revoke the Approve task
        await taskService.revokeTask(approveTask, sender);
        await assertTask(approveTask, sender, 'Revoke', 'Assigned', employee, employee);

        // Employee revokes the Approve task
        await taskService.revokeTask(approveTask, employee);
        await assertTask(approveTask, sender, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Although employee revokes the task, the Approver role is present with employee itself
        await assertCaseTeamMember(new CaseTeamMember(employee, [approverRole]), caseInstance, sender);

        // Employee can claim the Approve task (without help of sender)
        await taskService.claimTask(approveTask, employee);
        await assertTask(approveTask, sender, 'Claim', 'Assigned', employee, employee);

        // Employee can delegate the Approve task to receiver
        await taskService.delegateTask(approveTask, employee, receiver);
        await assertTask(approveTask, sender, 'Delegate', 'Delegated', receiver, employee);

        // Check receiver's roles in the case team
        await assertCaseTeamMember(new CaseTeamMember(receiver, [approverRole, paRole, requestorRole]), caseInstance, sender);

        // Finally receiver can complete the Approve task
        await taskService.completeTask(approveTask, receiver);
        await assertTask(approveTask, sender, 'Complete', 'Completed', receiver, employee);

        // Sender cannot delegate Request task to false-user who is not in the team and tenant
        await taskService.delegateTask(requestTask, sender, new TenantUser('I\'m not in the tenant'), 404);
        await assertTask(requestTask, sender, 'Delegate', 'Unassigned', User.NONE, User.NONE);

        // As the task is not delegated false-user cannot be part of the case team
        await assertCaseTeamMember(new CaseTeamMember('I\'m not in the tenant'), caseInstance, sender, false);

        // Sender cannot assign Request task to false-user who is not in the team and tenant
        await taskService.assignTask(requestTask, sender, new TenantUser('I\'m not in the tenant'), 404);
        await assertTask(requestTask, sender, 'Delegate', 'Unassigned', User.NONE, User.NONE);

        // As the task is not assigned false-user cannot be part of the case team
        await assertCaseTeamMember(new CaseTeamMember('I\'m not in the tenant'), caseInstance, sender, false);

        // Sender can remove employee from case team
        await caseTeamService.removeMember(sender, caseInstance, employee);
        await assertCaseTeamMember(new CaseTeamMember(employee, [approverRole]), caseInstance, sender, false);

        // Sender can assign Request task to employee (who is not part of the team)
        await taskService.assignTask(requestTask, sender, employee);
        await assertTask(requestTask, sender, 'Assign', 'Assigned', employee, employee);

        // Now, employee is part of the team with Requestor role
        await assertCaseTeamMember(new CaseTeamMember(employee, [requestorRole]), caseInstance, sender);

        // Receiver cannot assign to itself the Request task (although receiver has appropriate role)
        await taskService.assignTask(requestTask, receiver, receiver, 401);
        await assertTask(requestTask, sender, 'Assign', 'Assigned', employee, employee);

        // But, sender can assign to itself the Request task (as senderis owner)
        await taskService.assignTask(requestTask, sender, sender);
        await assertTask(requestTask, sender, 'Assign', 'Assigned', sender, sender);

        // Sender again assigns the Request task to employee
        await taskService.assignTask(requestTask, sender, employee);
        await assertTask(requestTask, sender, 'Assign', 'Assigned', employee, employee);

        // Employee revokes the Request task
        await taskService.revokeTask(requestTask, employee);
        await assertTask(requestTask, sender, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Still employee should have one role, i.e., Request role
        await assertCaseTeamMember(new CaseTeamMember(employee, [requestorRole]), caseInstance, sender);

        // Sender should not have the Request role
        await assertCaseTeamMember(new CaseOwner(sender, []), caseInstance, sender);

        // // Sender cannot remove Request role from sender itself (as there is no Request role)
        // await caseTeamService.removeMemberRoles(sender, caseInstance, new CaseTeamMember(sender), requestorRole, false);

        // Sender assigns the Request task to receiver
        await taskService.assignTask(requestTask, sender, receiver);
        await assertTask(requestTask, sender, 'Assign', 'Assigned', receiver, receiver);

        // Check receiver's roles in the team
        await assertCaseTeamMember(new CaseTeamMember(receiver, [approverRole, paRole, requestorRole]), caseInstance, sender);

        // Sender can complete the task assigned to receiver
        await taskService.completeTask(requestTask, sender);
        await assertTask(requestTask, sender, 'Complete', 'Completed', receiver, receiver);

        // Again, sender removes the employee from the team
        await caseTeamService.removeMember(sender, caseInstance, employee);
        await assertCaseTeamMember(new CaseTeamMember(employee, [requestorRole]), caseInstance, sender, false);

        // Sender can assign Assist task to employee (who is not part of the team)
        await taskService.assignTask(assistTask, sender, employee);
        await assertTask(assistTask, sender, 'Assign', 'Assigned', employee, employee);

        // Now, employee is part of the team with PA role
        await assertCaseTeamMember(new CaseTeamMember(employee, [paRole]), caseInstance, sender);

        // Receiver cannot complete the Assist task which is assigned to employee
        await taskService.completeTask(assistTask, receiver, {}, 401);
        await assertTask(assistTask, sender, 'Complete', 'Assigned', employee, employee);

        // Employee revokes the assist task
        await taskService.revokeTask(assistTask, employee);
        await assertTask(assistTask, sender, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Neither employee nor receiver can complete the task
        await taskService.completeTask(assistTask, employee, {}, 401);
        await taskService.completeTask(assistTask, receiver, {}, 401);
        await assertTask(assistTask, sender, 'Complete', 'Unassigned', User.NONE, User.NONE);

        // Sender claims the Assist task
        await taskService.claimTask(assistTask, sender);
        await assertTask(assistTask, sender, 'Claim', 'Assigned', sender, sender);

        // Sender should not get PA role
        await assertCaseTeamMember(new CaseOwner(sender, []), caseInstance, sender);

        // Neither employee nor receiver can complete the task which is assigned to sender
        await taskService.completeTask(assistTask, employee, {}, 401);
        await taskService.completeTask(assistTask, receiver, {}, 401);
        await assertTask(assistTask, sender, 'Complete', 'Assigned', sender, sender);
        
        // Sender delegates the task to employee
        await taskService.delegateTask(assistTask, sender, employee);
        await assertTask(assistTask, sender, 'Delegate', 'Delegated', employee, sender);

        // Finally, employee can complete the Assist task
        await taskService.completeTask(assistTask, employee);
        await assertTask(assistTask, sender, 'Complete', 'Completed', employee, sender);
    }
}