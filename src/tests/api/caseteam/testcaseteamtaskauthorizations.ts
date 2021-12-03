'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import { CaseOwner } from '../../../framework/cmmn/team/caseteamuser';
import CaseTeamUser from "../../../framework/cmmn/team/caseteamuser";
import CaseTeam from '../../../framework/cmmn/team/caseteam';
import { findTask, assertTask } from '../../../framework/test/caseassertions/task';
import { assertCaseTeamUser } from '../../../framework/test/caseassertions/team';
import TaskService from '../../../framework/service/task/taskservice';
import User from '../../../framework/user';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import TenantUser from '../../../framework/tenant/tenantuser';

const worldwideTenant = new WorldWideTestTenant('wwtt-3');

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
        await RepositoryService.validateAndDeploy(sender, definition, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([
            new CaseOwner(sender),
            new CaseTeamUser(receiver, [approverRole, paRole, requestorRole])
        ]);
        const startCase = { tenant, definition, debug: true, caseTeam };
        const caseInstance = await CaseService.startCase(sender, startCase);

        // Get case tasks should be possible for sender
        const tasks = await TaskService.getCaseTasks(sender, caseInstance);
        const approveTask = findTask(tasks, 'Approve');
        const requestTask = findTask(tasks, 'Request');
        const assistTask = findTask(tasks, 'Assist');
        const taskWithoutRole = findTask(tasks, 'Task Without Role');

        // Although sender didn't have appropriate roles;
        // Sender can claim Approve task, as sender is owner
        await TaskService.claimTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Claim', 'Assigned', sender, sender);

        // Sender can revoke Approve task
        await TaskService.revokeTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Now, Approve task can be claimed by receiver (as a member who have appropriate roles)
        await TaskService.claimTask(receiver, approveTask);
        await assertTask(sender, approveTask, 'Claim', 'Assigned', receiver, receiver);

        // Employee is not part of the case team
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee), false);

        // Although employee doesn't have appropriate roles and not part of the team;
        // Sender can delegate Approve task to employee (receiver perspective)
        await TaskService.delegateTask(sender, approveTask, employee);
        await assertTask(sender, approveTask, 'Delegate', 'Delegated', employee, receiver);

        // Now, employee is part of the case team with Approver role
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, [approverRole]));

        // Employee cannot claim the Approve task; because Approve task is delegated
        await TaskService.claimTask(employee, approveTask, 400, 'Employee cannot claim the Approve task; because Approve task is delegated');
        await assertTask(sender, approveTask, 'Claim', 'Delegated', employee, receiver);

        // Sender can revoke the Approve task (employee perspective)
        await TaskService.revokeTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Revoke', 'Assigned', receiver, receiver);

        // Sender can revoke the Approve task (receiver perspective)
        await TaskService.revokeTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Sender can remove Approve role from employee
        await CaseTeamService.setUser(sender, caseInstance, new CaseTeamUser(employee, []));
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee));

        // Now, employee cannot perform save the Approve task output as employee lack approriate role
        await TaskService.saveTaskOutput(employee, approveTask, {}, 401, 'Employee should not be able to save the Approve task output as employee lack approriate role');
        await assertTask(employee, approveTask, 'Save', 'Unassigned', User.NONE, User.NONE);

        // Approve task can be assigned to employee by sender (although he don't have appropriate roles)
        await TaskService.assignTask(sender, approveTask, employee);
        await assertTask(sender, approveTask, 'Assign', 'Assigned', employee, employee);

        // Now, employee gets the Approve role as sender is assigned task to employee
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, [approverRole]));

        // Sender don't have the Approver role
        await assertCaseTeamUser(sender, caseInstance, new CaseOwner(sender));

        // Employee delegates the Approve task to sender
        await TaskService.delegateTask(employee, approveTask, sender);
        await assertTask(sender, approveTask, 'Delegate', 'Delegated', sender, employee);

        // Now, sender should not get the Approver role (as Sender is owner)
        await assertCaseTeamUser(sender, caseInstance, new CaseOwner(sender, []));

        // Sender should not be able to claim the Approve task as sender is delegated to it
        await TaskService.claimTask(sender, approveTask, 400, 'Sender should not be able to claim the Approve task as sender is delegated to it');
        await assertTask(sender, approveTask, 'Claim', 'Delegated', sender, employee);

        // Sender revokes the Approve task
        await TaskService.revokeTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Revoke', 'Assigned', employee, employee);

        // Receiver should not be able to delegate Approve task to sender
        await TaskService.delegateTask(receiver, approveTask, sender, 401, 'Receiver should not be able to delegate Approve task to sender');
        await assertTask(sender, approveTask, 'Assign', 'Assigned', employee, employee);

        // Sender delegates the Approve task to receiver (employee perspective)
        await TaskService.delegateTask(sender, approveTask, receiver);
        await assertTask(sender, approveTask, 'Delegate', 'Delegated', receiver, employee);

        // Receiver should not be able to claim the Approve task, as Approve task is delegated to receiver itself
        await TaskService.claimTask(receiver, approveTask, 400, 'Receiver should not be able to claim the Approve task, as Approve task is delegated to receiver itself');
        await assertTask(sender, approveTask, 'Claim', 'Delegated', receiver, employee);

        // Receiver can revoke the Approve task
        await TaskService.revokeTask(receiver, approveTask);
        await assertTask(sender, approveTask, 'Revoke', 'Assigned', employee, employee);

        // Sender can delegate the Approve task to sender itself
        await TaskService.delegateTask(sender, approveTask, sender);
        await assertTask(sender, approveTask, 'Delegate', 'Delegated', sender, employee);

        // Although employee is the owner of the Approve task, should not be able to revoke it
        await TaskService.revokeTask(employee, approveTask, 401, 'Although employee is the owner of the Approve task, should not be able to revoke it');
        await assertTask(sender, approveTask, 'Revoke', 'Delegated', sender, employee);

        // Sender can revoke the Approve task
        await TaskService.revokeTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Revoke', 'Assigned', employee, employee);

        // Employee revokes the Approve task
        await TaskService.revokeTask(employee, approveTask);
        await assertTask(sender, approveTask, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Although employee revokes the task, the Approver role is present with employee itself
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, [approverRole]));

        // Employee can claim the Approve task (without help of sender)
        await TaskService.claimTask(employee, approveTask);
        await assertTask(sender, approveTask, 'Claim', 'Assigned', employee, employee);

        // Employee can delegate the Approve task to receiver
        await TaskService.delegateTask(employee, approveTask, receiver);
        await assertTask(sender, approveTask, 'Delegate', 'Delegated', receiver, employee);

        // Check receiver's roles in the case team
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(receiver, [approverRole, paRole, requestorRole]));

        // Finally receiver can complete the Approve task
        await TaskService.completeTask(receiver, approveTask);
        await assertTask(sender, approveTask, 'Complete', 'Completed', receiver, employee);

        const notExistingTenantUserId = `I'm not in the tenant`;

        // Sender should not be able to assign Request task to false-user who is not in the team
        await TaskService.assignTask(employee, requestTask, new TenantUser(notExistingTenantUserId), 401, 'Employee should not be able to assign Request task as he is not case owner');
        await assertTask(sender, requestTask, 'Delegate', 'Unassigned', User.NONE, User.NONE);

        // Sender should not be able to delegate Request task to false-user who is not in the team
        await TaskService.delegateTask(employee, requestTask, new TenantUser(notExistingTenantUserId), 401, 'Employee should not be able to delegate Request task as he is not case owner');
        await assertTask(sender, requestTask, 'Delegate', 'Unassigned', User.NONE, User.NONE);

        // As the task is not delegated false-user cannot be part of the case team
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(notExistingTenantUserId), false);

        // Sender can remove employee from case team
        await CaseTeamService.removeUser(sender, caseInstance, employee);
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, [approverRole]), false);

        // Sender can assign Request task to employee (who is not part of the team)
        await TaskService.assignTask(sender, requestTask, employee);
        await assertTask(sender, requestTask, 'Assign', 'Assigned', employee, employee);

        // Now, employee is part of the team with Requestor role
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, [requestorRole]));

        // Receiver should not be able to assign to itself the Request task (although receiver has appropriate role)
        await TaskService.assignTask(receiver, requestTask, receiver, 401, 'Receiver should not be able to assign to itself the Request task (although receiver has appropriate role)');
        await assertTask(sender, requestTask, 'Assign', 'Assigned', employee, employee);

        // But, sender can assign to itself the Request task (as sender is owner)
        await TaskService.assignTask(sender, requestTask, sender);
        await assertTask(sender, requestTask, 'Assign', 'Assigned', sender, sender);

        // Sender again assigns the Request task to employee
        await TaskService.assignTask(sender, requestTask, employee);
        await assertTask(sender, requestTask, 'Assign', 'Assigned', employee, employee);

        // Employee revokes the Request task
        await TaskService.revokeTask(employee, requestTask);
        await assertTask(sender, requestTask, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Still employee should have one role, i.e., Request role
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, [requestorRole]));

        // Sender should not have the Request role
        await assertCaseTeamUser(sender, caseInstance, new CaseOwner(sender, []));

        // Sender assigns the Request task to receiver
        await TaskService.assignTask(sender, requestTask, receiver);
        await assertTask(sender, requestTask, 'Assign', 'Assigned', receiver, receiver);

        // Check receiver's roles in the team
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(receiver, [approverRole, paRole, requestorRole]));

        // Sender can complete the task assigned to receiver
        await TaskService.completeTask(sender, requestTask);
        await assertTask(sender, requestTask, 'Complete', 'Completed', receiver, receiver);

        // Again, sender removes the employee from the team
        await CaseTeamService.removeUser(sender, caseInstance, employee);
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, [requestorRole]), false);

        // Sender can assign Assist task to employee (who is not part of the team)
        await TaskService.assignTask(sender, assistTask, employee);
        await assertTask(sender, assistTask, 'Assign', 'Assigned', employee, employee);

        // Now, employee is part of the team with PA role
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, [paRole]));

        // Receiver should not be able to complete the Assist task which is assigned to employee
        await TaskService.completeTask(receiver, assistTask, {}, 401, 'Receiver should not be able to complete the Assist task which is assigned to employee');
        await assertTask(sender, assistTask, 'Complete', 'Assigned', employee, employee);

        // Employee revokes the assist task
        await TaskService.revokeTask(employee, assistTask);
        await assertTask(sender, assistTask, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Sender removes the paRole from receiver
        await CaseTeamService.setUser(sender, caseInstance, new CaseTeamUser(receiver, [approverRole, requestorRole]));

        // Receiver should not be able to complete the unassigned task because receiver doesn't have appropriate role
        await TaskService.completeTask(receiver, assistTask, {}, 401, 'Receiver should not be able to complete the unassigned task because receiver doesn\'t have appropriate role');
        await assertTask(sender, assistTask, 'Complete', 'Unassigned', User.NONE, User.NONE);

        // Employee can save the Assist task output
        await TaskService.saveTaskOutput(employee, assistTask, {});
        await assertTask(employee, assistTask, 'Save', 'Unassigned', User.NONE, User.NONE);

        // Sender claims the Assist task
        await TaskService.claimTask(sender, assistTask);
        await assertTask(sender, assistTask, 'Claim', 'Assigned', sender, sender);

        // Sender should not get PA role
        await assertCaseTeamUser(sender, caseInstance, new CaseOwner(sender, []));

        // Neither employee nor receiver should not be able to complete the task which is assigned to sender
        await TaskService.completeTask(employee, assistTask, {}, 401, 'Employee should not be able to complete the task which is assigned to sender');
        await TaskService.completeTask(receiver, assistTask, {}, 401, 'Receiver should not be able to complete the task which is assigned to sender');
        await assertTask(sender, assistTask, 'Complete', 'Assigned', sender, sender);

        // Sender revokes the task
        await TaskService.revokeTask(sender, assistTask);
        await assertTask(sender, assistTask, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Finally, employee can complete the Assist task b/e employee has the appropriate role 
        await TaskService.completeTask(employee, assistTask);
        await assertTask(sender, assistTask, 'Complete', 'Completed', User.NONE, User.NONE);

        // Receiver can also complete the Task Without Role task eventhough receiver is not case owner
        await TaskService.completeTask(receiver, taskWithoutRole, {});
        await assertTask(receiver, assistTask, 'Complete', 'Completed', User.NONE, User.NONE);
    }
}