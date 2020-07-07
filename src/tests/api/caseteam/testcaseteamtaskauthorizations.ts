'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeamMember, { CaseOwner } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import Case from '../../../framework/cmmn/case';
import { findTask, assertTask } from '../../../framework/test/assertions';
import TaskService from '../../../framework/service/task/taskservice';
import User from '../../../framework/user';

const repositoryService = new RepositoryService();
const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant('wwtt-3');
const taskService = new TaskService();

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
            new CaseOwner(sender, [requestorRole]),
            new CaseTeamMember(receiver, [approverRole, paRole], 'user', false)
        ]);
        const startCase = { tenant, definition, debug: true, caseTeam };
        const caseInstance = await caseService.startCase(startCase, sender) as Case;


        // Get case tasks should be possible for employee
        const tasks = await taskService.getCaseTasks(caseInstance, sender);

        const approveTask = findTask(tasks, 'Approve');

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

        // Although employee doesn't have appropriate roles; sender can delegate task to employee (receiver perspective)
        await taskService.delegateTask(approveTask, sender, employee);
        await assertTask(approveTask, sender, 'Delegate', 'Delegated', employee, receiver);

        // Employee cannot claim the task; because of lack of appropriate roles
        await taskService.claimTask(approveTask, employee, false);
        await assertTask(approveTask, sender, 'Claim', 'Delegated', employee, receiver);

        // Sender can revoke the task (employee perspective)
        await taskService.revokeTask(approveTask, sender);
        await assertTask(approveTask, sender, 'Revoke', 'Assigned', receiver, receiver);

        // Sender can revoke the task (receiver perspective)
        await taskService.revokeTask(approveTask, sender);
        await assertTask(approveTask, sender, 'Revoke', 'Unassigned', User.NONE, User.NONE);

        // Task can be assigned to employee by sender (although he don't have appropriate roles)
        await taskService.assignTask(approveTask, sender, employee);
        await assertTask(approveTask, sender, 'Assign', 'Assigned', employee, employee);

        // Employee delegates the task to sender
        await taskService.delegateTask(approveTask, employee, sender);
        await assertTask(approveTask, sender, 'Delegate', 'Delegated', sender, employee);

        // Sender cannot claim the approveTask as sender is delegated to it
        await taskService.claimTask(approveTask, sender, false);
        await assertTask(approveTask, sender, 'Claim', 'Delegated', sender, employee);
        
        // Sender revokes the task
        await taskService.revokeTask(approveTask, sender);
        await assertTask(approveTask, sender, 'Revoke', 'Assigned', employee, employee);

        // Receiver cannot delegate task to sender
        await taskService.delegateTask(approveTask, receiver, sender, false);
        await assertTask(approveTask, sender, 'Assign', 'Assigned', employee, employee);

        // Sender delegates the task to receiver (employee perspective)
        await taskService.delegateTask(approveTask, sender, receiver);
        await assertTask(approveTask, sender, 'Delegate', 'Delegated', receiver, employee);

        // Receiver cannot claim the task, as task is delegated to receiver itself
        await taskService.claimTask(approveTask, receiver, false);
        await assertTask(approveTask, sender, 'Claim', 'Delegated', receiver, employee);

        // Receiver can revoke the task
        await taskService.revokeTask(approveTask, receiver);
        await assertTask(approveTask, sender, 'Revoke', 'Assigned', employee, employee);

        // Sender can delegate the task to sender itself
        await taskService.delegateTask(approveTask, sender, sender);
        await assertTask(approveTask, sender, 'Delegate', 'Delegated', sender, employee);

        // Although employee is the owner of the task, cannot revoke it
        await taskService.revokeTask(approveTask, employee, false);
        await assertTask(approveTask, sender, 'Revoke', 'Delegated', sender, employee);

        // Sender can revoke the task
        await taskService.revokeTask(approveTask, sender);
        await assertTask(approveTask, sender, 'Revoke', 'Assigned', employee, employee);

        // Employee can delegate the task to receiver
        await taskService.delegateTask(approveTask, employee, receiver);
        await assertTask(approveTask, sender, 'Delegate', 'Delegated', receiver, employee);

        // Finally receiver can complete the task
        await taskService.completeTask(approveTask, receiver);
        await assertTask(approveTask, sender, 'Complete', 'Completed', receiver, employee);
    }
}