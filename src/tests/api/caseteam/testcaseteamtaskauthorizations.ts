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
        await repositoryService.validateAndDeploy(sender, definition, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([
            new CaseOwner(sender),
            new CaseTeamMember(receiver, [approverRole, paRole, requestorRole], 'user', false)
        ]);
        const startCase = { tenant, definition, debug: true, caseTeam };
        const caseInstance = await caseService.startCase(sender, startCase) as Case;

        // Get case tasks should be possible for sender
        const tasks = await taskService.getCaseTasks(sender, caseInstance);
        const approveTask = findTask(tasks, 'Approve');
        const requestTask = findTask(tasks, 'Request');
        const assistTask = findTask(tasks, 'Assist');
        const taskWithoutRole = findTask(tasks, 'Task Without Role');

        // Although sender didn't have appropriate roles;
        // Sender can claim Approve task, as sender is owner
        await taskService.claimTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Claim', 'Assigned', sender, sender);

        // Sender can revoke Approve task
        await taskService.revokeTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Now, Approve task can be claimed by receiver (as a member who have appropriate roles)
        await taskService.claimTask(receiver, approveTask);
        await assertTask(sender, approveTask, 'Claim', 'Assigned', receiver, receiver);

        // Employee is not part of the case team
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember(employee), false);

        // Although employee doesn't have appropriate roles and not part of the team;
        // Sender can delegate Approve task to employee (receiver perspective)
        await taskService.delegateTask(sender, approveTask, employee);
        await assertTask(sender, approveTask, 'Delegate', 'Delegated', employee, receiver);

        // Now, employee is part of the case team with Approver role
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember(employee, [approverRole]));

        // Employee cannot claim the Approve task; because Approve task is delegated
        await taskService.claimTask(employee, approveTask, 400);
        await assertTask(sender, approveTask, 'Claim', 'Delegated', employee, receiver);

        // Sender can revoke the Approve task (employee perspective)
        await taskService.revokeTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Revoke', 'Assigned', receiver, receiver);

        // Sender can revoke the Approve task (receiver perspective)
        await taskService.revokeTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Sender can remove Approve role from employee
        await caseTeamService.removeMemberRoles(sender, caseInstance, new CaseTeamMember(employee), approverRole);
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember(employee));

        // Now, employee cannot perform save the Approve task output as employee lack approriate role
        await taskService.saveTaskOutput(employee, approveTask, {}, 401);
        await assertTask(employee, approveTask, 'Save', 'Unassigned', User.NONE, User.NONE);

        // Approve task can be assigned to employee by sender (although he don't have appropriate roles)
        await taskService.assignTask(sender, approveTask, employee);
        await assertTask(sender, approveTask, 'Assign', 'Assigned', employee, employee);

        // Now, employee gets the Approve role as sender is assigned task to employee
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember(employee, [approverRole]));

        // Sender don't have the Approver role
        await assertCaseTeamMember(sender, caseInstance, new CaseOwner(sender));

        // Employee delegates the Approve task to sender
        await taskService.delegateTask(employee, approveTask, sender);
        await assertTask(sender, approveTask, 'Delegate', 'Delegated', sender, employee);

        // Now, sender should not get the Approver role (as Sender is owner)
        await assertCaseTeamMember(sender, caseInstance, new CaseOwner(sender, []));

        // Sender cannot claim the Approve task as sender is delegated to it
        await taskService.claimTask(sender, approveTask, 400);
        await assertTask(sender, approveTask, 'Claim', 'Delegated', sender, employee);

        // Sender revokes the Approve task
        await taskService.revokeTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Revoke', 'Assigned', employee, employee);

        // Receiver cannot delegate Approve task to sender
        await taskService.delegateTask(receiver, approveTask, sender, 401);
        await assertTask(sender, approveTask, 'Assign', 'Assigned', employee, employee);

        // Sender delegates the Approve task to receiver (employee perspective)
        await taskService.delegateTask(sender, approveTask, receiver);
        await assertTask(sender, approveTask, 'Delegate', 'Delegated', receiver, employee);

        // Receiver cannot claim the Approve task, as Approve task is delegated to receiver itself
        await taskService.claimTask(receiver, approveTask, 400);
        await assertTask(sender, approveTask, 'Claim', 'Delegated', receiver, employee);

        // Receiver can revoke the Approve task
        await taskService.revokeTask(receiver, approveTask);
        await assertTask(sender, approveTask, 'Revoke', 'Assigned', employee, employee);

        // Sender can delegate the Approve task to sender itself
        await taskService.delegateTask(sender, approveTask, sender);
        await assertTask(sender, approveTask, 'Delegate', 'Delegated', sender, employee);

        // Although employee is the owner of the Approve task, cannot revoke it
        await taskService.revokeTask(employee, approveTask, 401);
        await assertTask(sender, approveTask, 'Revoke', 'Delegated', sender, employee);

        // Sender can revoke the Approve task
        await taskService.revokeTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Revoke', 'Assigned', employee, employee);

        // Employee revokes the Approve task
        await taskService.revokeTask(employee, approveTask);
        await assertTask(sender, approveTask, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Although employee revokes the task, the Approver role is present with employee itself
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember(employee, [approverRole]));

        // Employee can claim the Approve task (without help of sender)
        await taskService.claimTask(employee, approveTask);
        await assertTask(sender, approveTask, 'Claim', 'Assigned', employee, employee);

        // Employee can delegate the Approve task to receiver
        await taskService.delegateTask(employee, approveTask, receiver);
        await assertTask(sender, approveTask, 'Delegate', 'Delegated', receiver, employee);

        // Check receiver's roles in the case team
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember(receiver, [approverRole, paRole, requestorRole]));

        // Finally receiver can complete the Approve task
        await taskService.completeTask(receiver, approveTask);
        await assertTask(sender, approveTask, 'Complete', 'Completed', receiver, employee);

        // Sender cannot delegate Request task to false-user who is not in the team and tenant
        await taskService.delegateTask(sender, requestTask, new TenantUser('I\'m not in the tenant'), 404);
        await assertTask(sender, requestTask, 'Delegate', 'Unassigned', User.NONE, User.NONE);

        // As the task is not delegated false-user cannot be part of the case team
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember('I\'m not in the tenant'), false);

        // Sender cannot assign Request task to false-user who is not in the team and tenant
        await taskService.assignTask(sender, requestTask, new TenantUser('I\'m not in the tenant'), 404);
        await assertTask(sender, requestTask, 'Delegate', 'Unassigned', User.NONE, User.NONE);

        // As the task is not assigned false-user cannot be part of the case team
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember('I\'m not in the tenant'), false);

        // Sender can remove employee from case team
        await caseTeamService.removeMember(sender, caseInstance, employee);
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember(employee, [approverRole]), false);

        // Sender can assign Request task to employee (who is not part of the team)
        await taskService.assignTask(sender, requestTask, employee);
        await assertTask(sender, requestTask, 'Assign', 'Assigned', employee, employee);

        // Now, employee is part of the team with Requestor role
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember(employee, [requestorRole]));

        // Receiver cannot assign to itself the Request task (although receiver has appropriate role)
        await taskService.assignTask(receiver, requestTask, receiver, 401);
        await assertTask(sender, requestTask, 'Assign', 'Assigned', employee, employee);

        // But, sender can assign to itself the Request task (as sender is owner)
        await taskService.assignTask(sender, requestTask, sender);
        await assertTask(sender, requestTask, 'Assign', 'Assigned', sender, sender);

        // Sender again assigns the Request task to employee
        await taskService.assignTask(sender, requestTask, employee);
        await assertTask(sender, requestTask, 'Assign', 'Assigned', employee, employee);

        // Employee revokes the Request task
        await taskService.revokeTask(employee, requestTask);
        await assertTask(sender, requestTask, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Still employee should have one role, i.e., Request role
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember(employee, [requestorRole]));

        // Sender should not have the Request role
        await assertCaseTeamMember(sender, caseInstance, new CaseOwner(sender, []));

        // // Sender cannot remove Request role from sender itself (as there is no Request role)
        // await caseTeamService.removeMemberRoles(sender, caseInstance, new CaseTeamMember(sender), requestorRole, false);

        // Sender assigns the Request task to receiver
        await taskService.assignTask(sender, requestTask, receiver);
        await assertTask(sender, requestTask, 'Assign', 'Assigned', receiver, receiver);

        // Check receiver's roles in the team
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember(receiver, [approverRole, paRole, requestorRole]));

        // Sender can complete the task assigned to receiver
        await taskService.completeTask(sender, requestTask);
        await assertTask(sender, requestTask, 'Complete', 'Completed', receiver, receiver);

        // Again, sender removes the employee from the team
        await caseTeamService.removeMember(sender, caseInstance, employee);
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember(employee, [requestorRole]), false);

        // Sender can assign Assist task to employee (who is not part of the team)
        await taskService.assignTask(sender, assistTask, employee);
        await assertTask(sender, assistTask, 'Assign', 'Assigned', employee, employee);

        // Now, employee is part of the team with PA role
        await assertCaseTeamMember(sender, caseInstance, new CaseTeamMember(employee, [paRole]));

        // Receiver cannot complete the Assist task which is assigned to employee
        await taskService.completeTask(receiver, assistTask, {}, 401);
        await assertTask(sender, assistTask, 'Complete', 'Assigned', employee, employee);

        // Employee revokes the assist task
        await taskService.revokeTask(employee, assistTask);
        await assertTask(sender, assistTask, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Sender removes the paRole from receiver
        await caseTeamService.removeMemberRoles(sender, caseInstance, new CaseTeamMember(receiver), paRole);

        // Receiver cannot complete the unassigned task because receiver doesn't have appropriate role
        await taskService.completeTask(receiver, assistTask, {}, 401);
        await assertTask(sender, assistTask, 'Complete', 'Unassigned', User.NONE, User.NONE);

        // Employee can save the Assist task output
        await taskService.saveTaskOutput(employee, assistTask, {});
        await assertTask(employee, assistTask, 'Save', 'Unassigned', User.NONE, User.NONE);

        // Sender claims the Assist task
        await taskService.claimTask(sender, assistTask);
        await assertTask(sender, assistTask, 'Claim', 'Assigned', sender, sender);

        // Sender should not get PA role
        await assertCaseTeamMember(sender, caseInstance, new CaseOwner(sender, []));

        // Neither employee nor receiver can complete the task which is assigned to sender
        await taskService.completeTask(employee, assistTask, {}, 401);
        await taskService.completeTask(receiver, assistTask, {}, 401);
        await assertTask(sender, assistTask, 'Complete', 'Assigned', sender, sender);

        // Sender revokes the task
        await taskService.revokeTask(sender, assistTask);
        await assertTask(sender, assistTask, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Finally, employee can complete the Assist task b/e employee has the appropriate role 
        await taskService.completeTask(employee, assistTask);
        await assertTask(sender, assistTask, 'Complete', 'Completed', User.NONE, User.NONE);

        // Receiver can also complete the Task Without Role task eventhough receiver is not case owner
        await taskService.completeTask(receiver, taskWithoutRole, {});
        await assertTask(receiver, assistTask, 'Complete', 'Completed', User.NONE, User.NONE);
    }
}