'use strict';

import Case from '../../../src/cmmn/case';
import Definitions from '../../../src/cmmn/definitions/definitions';
import Task from '../../../src/cmmn/task';
import TaskState from '../../../src/cmmn/taskstate';
import CaseTeam from '../../../src/cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../../src/cmmn/team/caseteamuser";
import CaseService from '../../../src/service/case/caseservice';
import CaseTeamService from '../../../src/service/case/caseteamservice';
import TaskService from '../../../src/service/task/taskservice';
import TenantUser from '../../../src/tenant/tenantuser';
import { assertTask, findTask } from '../../../src/test/caseassertions/task';
import { assertCaseTeamUser } from '../../../src/test/caseassertions/team';
import TestCase from '../../../src/test/testcase';
import User from '../../../src/user';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';

const definition = Definitions.CaseTeam;
const worldwideTenant = new WorldWideTestTenant('wwtt-3');
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
        await definition.deploy(sender, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([
            new CaseOwner(sender),
            new CaseTeamUser(receiver, [approverRole, paRole, requestorRole])
        ]);
        const startCase = { tenant, definition, debug: true, caseTeam };
        const caseInstance = await CaseService.startCase(sender, startCase);
        this.addIdentifier(caseInstance);

        // Get case tasks should be possible for sender
        const tasks = await TaskService.getCaseTasks(sender, caseInstance);
        const approveTask = findTask(tasks, 'Approve');
        const requestTask = findTask(tasks, 'Request');
        const assistTask = findTask(tasks, 'Assist');
        const taskWithoutRole = findTask(tasks, 'Task Without Role');

        await this.runApproveTaskOperations(approveTask, caseInstance);
        await this.runRequestTaskOperations(requestTask, caseInstance);
        await this.runAssistTaskOperations(assistTask, caseInstance);


        // Receiver can also complete the Task Without Role task eventhough receiver is not case owner
        await TaskService.completeTask(receiver, taskWithoutRole, {});
        await assertTask(receiver, taskWithoutRole, 'Complete', TaskState.Completed, receiver, receiver);        
    }

    async runApproveTaskOperations(approveTask: Task, caseInstance: Case) {
        // Although sender didn't have appropriate roles;
        // Sender can claim Approve task, as sender is owner
        await TaskService.claimTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Claim', TaskState.Assigned, sender, sender);

        // Now, Approve task can be claimed by receiver (as a member who have appropriate roles)
        await TaskService.claimTask(receiver, approveTask);
        await assertTask(sender, approveTask, 'Claim', TaskState.Assigned, receiver, receiver);

        // Sender can revoke Approve task
        await TaskService.revokeTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Revoke', TaskState.Unassigned, User.NONE, User.NONE);

        // Now, Approve task can be claimed by receiver (as a member who have appropriate roles)
        await TaskService.claimTask(receiver, approveTask);
        await assertTask(sender, approveTask, 'Claim', TaskState.Assigned, receiver, receiver);

        // Verify that employee gets added to the caseteam with the right role
        await this.verifyCaseTeamChangeThroughDelegationAndAssignment(approveTask, caseInstance);

        // Now remove Approve role from employee and verify access to the task operations
        await CaseTeamService.setUser(sender, caseInstance, new CaseTeamUser(employee, []));
        await this.verifyEmployeeNoLongerHasTaskAccess(approveTask, caseInstance);

        // Check receiver's roles in the case team
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(receiver, [approverRole, paRole, requestorRole]));

        // Check delegation lifecycle validations
        await this.verifyCanDelegateUnassignedAndDelegatedTask(approveTask, caseInstance);

        // Finally complete the Approve task, and check that delegated task can be completed without having the case role
        await this.completeDelegatedTaskWithoutCaseRole(approveTask, caseInstance);
    }

    async verifyCaseTeamChangeThroughDelegationAndAssignment(approveTask: Task, caseInstance: Case) {
        // First verify that employee is not part of the case team
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee), false);
        // Also verify that employee cannot get the task
        await TaskService.getTask(employee, approveTask, 404);

        // Do an extra task assertion so that it is clear here in the test code what the expected task state
        await assertTask(sender, approveTask, 'Claim', TaskState.Assigned, receiver, receiver);

        // Since employee is not part of the case team, receiver cannot delegate the task
        await TaskService.delegateTask(receiver, approveTask, employee, 400);
        await assertTask(sender, approveTask, 'Claim', TaskState.Assigned, receiver, receiver);

        // Although employee doesn't have appropriate roles and not part of the team;
        // Sender can delegate Approve task to employee - but without employee getting the 'Approver' role
        await TaskService.delegateTask(sender, approveTask, employee);
        await assertTask(sender, approveTask, 'Delegate', TaskState.Delegated, employee, receiver);

        // Now, employee is part of the case team but without the Approver role
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, []));

        // Check that employee cannot delegate the task to someone else
        await TaskService.delegateTask(employee, approveTask, receiver, 401);
        await assertTask(sender, approveTask, 'Delegate', TaskState.Delegated, employee, receiver);

        // Employee can revoke the task, and still should not have the role in the case team
        await TaskService.revokeTask(employee, approveTask);
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, []));
        await assertTask(sender, approveTask, 'Revoke', TaskState.Assigned, receiver, receiver);

        // After the employee revoked, employee should not be able to claim the task
        await TaskService.claimTask(employee, approveTask, 401);
        await assertTask(sender, approveTask, 'Revoke', TaskState.Assigned, receiver, receiver);

        // If Sender assigns instead of delegates the task to employee, then employee should get the approver role and also own the task
        await TaskService.assignTask(sender, approveTask, employee);
        await assertTask(sender, approveTask, 'Assign', TaskState.Assigned, employee, employee);
        
        // Now, employee is part of the case team with Approver role
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, [approverRole]));

        // Employee can revoke the task, and should still have the role in the case team
        await TaskService.revokeTask(employee, approveTask);
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, [approverRole]));

        // Therefore, Employee can also claim the task again
        await TaskService.claimTask(employee, approveTask);
        await assertTask(sender, approveTask, 'Claim', TaskState.Assigned, employee, employee);

        // Sender can revoke the Approve task
        await TaskService.revokeTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Revoke', TaskState.Unassigned);        
    }

    async verifyEmployeeNoLongerHasTaskAccess(approveTask: Task, caseInstance: Case) {
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee));

        // Now, employee cannot perform save the Approve task output as employee lack approriate role
        await TaskService.saveTaskOutput(employee, approveTask, {}, 401, 'Employee should not be able to save the Approve task output as employee lack approriate role');
        await TaskService.claimTask(employee, approveTask, 401, 'Employee cannot claim the Approve task as employee lacks the approriate role');
        await TaskService.assignTask(employee, approveTask, sender, 401, 'Employee cannot assign the Approve task as employee lacks the approriate role');
        await TaskService.revokeTask(employee, approveTask, 401, 'Employee cannot revoke the Approve task as employee lacks the approriate role');
        await TaskService.delegateTask(employee, approveTask, sender, 401, 'Employee cannot delegate the Approve task as employee lacks the approriate role');

        // Assert that the task is still in same state.
        await assertTask(employee, approveTask, 'Save, Claim, Assign, Revoke and Delegate', TaskState.Unassigned, User.NONE, User.NONE, sender);
    }

    async verifyCaseOwnerDoesNotGetCaseRoles(approveTask: Task, caseInstance: Case) {
        // Verify that sender is owner and doesn't have the Approver role
        await assertCaseTeamUser(sender, caseInstance, new CaseOwner(sender));

        // Let receiver claim the task.
        await TaskService.claimTask(receiver, approveTask);//, 400, 'Sender should not be able to claim the Approve task as sender is delegated to it');

        // Receiver delegates the Approve task to sender
        await TaskService.delegateTask(receiver, approveTask, sender);
        await assertTask(sender, approveTask, 'Delegate', TaskState.Delegated, sender, receiver);

        // Now, sender should not get the Approver role (as Sender is owner)
        await assertCaseTeamUser(sender, caseInstance, new CaseOwner(sender, []));

        // Revoke task back to receiver
        await TaskService.revokeTask(receiver, approveTask);
        await assertTask(receiver, approveTask, 'Revoke', TaskState.Assigned, receiver, receiver);

        // Show that when assigning the task also the sender does not get the role
        await TaskService.assignTask(receiver, approveTask, sender);
        await assertCaseTeamUser(receiver, caseInstance, new CaseOwner(sender, []));
        await TaskService.revokeTask(sender, approveTask);        
        await assertCaseTeamUser(receiver, caseInstance, new CaseOwner(sender, []));
        
        // Show that when claiming the task also the sender does not get the role
        await TaskService.claimTask(sender, approveTask);
        await assertCaseTeamUser(receiver, caseInstance, new CaseOwner(sender, []));
        await assertTask(sender, approveTask, 'Claim', TaskState.Assigned, sender, sender);

        // Sender revokes the Approve task
        await TaskService.revokeTask(sender, approveTask);
        await assertTask(sender, approveTask, 'Revoke', TaskState.Unassigned);
    }
    
    async verifyCanDelegateUnassignedAndDelegatedTask(approveTask: Task, caseInstance: Case) {
        // Receiver should not be able to delegate Approve task to sender
        await TaskService.delegateTask(receiver, approveTask, sender);
        await assertTask(sender, approveTask, 'Delete', TaskState.Delegated, sender);

        // Sender delegates the Approve task to receiver (employee perspective)
        await TaskService.delegateTask(sender, approveTask, receiver);
        await assertTask(sender, approveTask, 'Delegate', TaskState.Delegated, receiver);
    }
    
    async completeDelegatedTaskWithoutCaseRole(approveTask: Task, caseInstance: Case) {
        // Verify that employee does not have any roles in the case team
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, []));

        await TaskService.claimTask(receiver, approveTask);
        await TaskService.delegateTask(receiver, approveTask, employee);

        await assertTask(sender, approveTask, 'Delegate', TaskState.Delegated, employee, receiver);

        // Again, even though task is delegated, employee should not have any roles.
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, []));

        await TaskService.completeTask(employee, approveTask);
        await assertTask(sender, approveTask, 'Complete', TaskState.Completed, employee, receiver, employee);
    }

    async runRequestTaskOperations(requestTask: Task, caseInstance: Case) {
        await this.verifyCannotAssignOutsideUsersWhenNotOwner(requestTask, caseInstance);

        // Let's now remove employee from the team
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee));
        await CaseTeamService.removeUser(sender, caseInstance, employee);
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee), false);

        // Sender can assign Request task to employee (who is not part of the team)
        await TaskService.assignTask(sender, requestTask, employee);
        await assertTask(sender, requestTask, 'Assign', TaskState.Assigned, employee, employee, sender);

        // Now, employee is part of the team with Requestor role
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, [requestorRole]));

        // Receiver should not be able to assign to itself the Request task (although receiver has appropriate role)
        await TaskService.assignTask(receiver, requestTask, receiver);
        await assertTask(sender, requestTask, 'Assign', TaskState.Assigned, receiver, receiver);

        // But, sender can assign to itself the Request task (as sender is owner)
        await TaskService.assignTask(sender, requestTask, sender);
        await assertTask(sender, requestTask, 'Assign', TaskState.Assigned, sender, sender);

        // Sender again assigns the Request task to employee
        await TaskService.assignTask(sender, requestTask, employee);
        await assertTask(sender, requestTask, 'Assign', TaskState.Assigned, employee, employee);

        // Employee revokes the Request task
        await TaskService.revokeTask(employee, requestTask);
        await assertTask(sender, requestTask, 'Revoke', TaskState.Unassigned, User.NONE, User.NONE);

        // Still employee should have one role, i.e., Request role
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, [requestorRole]));

        // Sender should not have the Request role
        await assertCaseTeamUser(sender, caseInstance, new CaseOwner(sender, []));

        // Sender assigns the Request task to receiver
        await TaskService.assignTask(sender, requestTask, receiver);
        await assertTask(sender, requestTask, 'Assign', TaskState.Assigned, receiver, receiver);

        // Check receiver's roles in the team
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(receiver, [approverRole, paRole, requestorRole]));

        // Sender can complete the task assigned to receiver, but then assignee is changed to sender
        await TaskService.completeTask(sender, requestTask);
        await assertTask(sender, requestTask, 'Complete', TaskState.Completed, sender, sender);

        // Again, sender removes the employee from the team
        await CaseTeamService.removeUser(sender, caseInstance, employee);
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, [requestorRole]), false);
    }

    async verifyCannotAssignOutsideUsersWhenNotOwner(requestTask: Task, caseInstance: Case) {
        const notExistingTenantUserId = `I'm not in the tenant`;

        // Sender should not be able to assign Request task to false-user who is not in the team
        await TaskService.assignTask(employee, requestTask, new TenantUser(notExistingTenantUserId), 401, 'Employee should not be able to assign Request task as he is not case owner');
        await assertTask(sender, requestTask, 'Delegate', TaskState.Unassigned, User.NONE, User.NONE);

        // Sender should not be able to delegate Request task to false-user who is not in the team
        await TaskService.delegateTask(employee, requestTask, new TenantUser(notExistingTenantUserId), 401, 'Employee should not be able to delegate Request task as he is not case owner');
        await assertTask(sender, requestTask, 'Delegate', TaskState.Unassigned, User.NONE, User.NONE);

        // As the task is not delegated false-user cannot be part of the case team
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(notExistingTenantUserId), false);
    }

    async runAssistTaskOperations(assistTask: Task, caseInstance: Case) {
        // Sender can assign Assist task to employee (who is not part of the team)
        await TaskService.assignTask(sender, assistTask, employee);
        await assertTask(sender, assistTask, 'Assign', TaskState.Assigned, employee, employee);

        // Now, employee is part of the team with PA role
        await assertCaseTeamUser(sender, caseInstance, new CaseTeamUser(employee, [paRole]));

        // Sender removes the paRole from receiver
        await CaseTeamService.setUser(sender, caseInstance, new CaseTeamUser(receiver, [approverRole, requestorRole]));

        // Receiver should not be able to complete the assigned task because receiver doesn't have appropriate role
        await TaskService.completeTask(receiver, assistTask, {}, 401, 'Receiver should not be able to complete the assigned task because receiver doesn\'t have appropriate role');
        await assertTask(sender, assistTask, 'Assign', TaskState.Assigned, employee, employee);

        // Employee revokes the assist task
        await TaskService.revokeTask(employee, assistTask);
        await assertTask(sender, assistTask, 'Revoke', TaskState.Unassigned, User.NONE, User.NONE);

        // Receiver should not be able to complete the unassigned task because receiver doesn't have appropriate role
        await TaskService.completeTask(receiver, assistTask, {}, 401, 'Receiver should not be able to complete the unassigned task because receiver doesn\'t have appropriate role');
        await assertTask(sender, assistTask, 'Assign', TaskState.Unassigned, User.NONE, User.NONE);

        // Employee can still save the Assist task output
        await TaskService.saveTaskOutput(employee, assistTask, {});
        await assertTask(employee, assistTask, 'Save', TaskState.Unassigned, User.NONE, User.NONE);

        // Sender claims the Assist task
        await TaskService.claimTask(sender, assistTask);
        await assertTask(sender, assistTask, 'Claim', TaskState.Assigned, sender, sender);

        // Sender should not get PA role
        await assertCaseTeamUser(sender, caseInstance, new CaseOwner(sender, []));

        // Employee can still save the Assist task output, even though task is assigned to sender
        await TaskService.saveTaskOutput(employee, assistTask, {});

        // Receiver should not be able to complete the task which is assigned to sender
        await TaskService.completeTask(receiver, assistTask, {}, 401, 'Receiver should not be able to complete the task which is assigned to sender');
        await assertTask(sender, assistTask, 'Claim', TaskState.Assigned, sender, sender);

        // Sender revokes the task
        await TaskService.revokeTask(sender, assistTask);
        await assertTask(sender, assistTask, 'Revoke', TaskState.Unassigned, User.NONE, User.NONE);

        // Finally, employee can complete the Assist task b/e employee has the appropriate role 
        await TaskService.completeTask(employee, assistTask);
        await assertTask(sender, assistTask, 'Complete', TaskState.Completed, employee, employee);

    }
}
