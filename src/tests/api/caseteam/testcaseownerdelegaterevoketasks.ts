'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import CaseTeamMember, { CaseOwner } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import Case from '../../../framework/cmmn/case';
import { findTask } from '../../../framework/test/assertions';
import TaskService from '../../../framework/service/task/taskservice';

const repositoryService = new RepositoryService();
const caseService = new CaseService();
const caseTeamService = new CaseTeamService();
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

export default class TestCaseOwnerDelegateRevokeTasks extends TestCase {
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

        // Add employee to the team, and show that he now has access to the case
        await caseTeamService.setMember(caseInstance, sender, new CaseTeamMember(employee));
        
        // Now employee should be able to get the case
        await caseService.getCase(caseInstance, employee);

        // Get case tasks should be possible for employee
        let tasks = await taskService.getCaseTasks(caseInstance, employee);

        const approveTask = findTask(tasks, 'Approve');

        // Although sender is owner; sender cannot claim Approve task
        await taskService.claimTask(approveTask, sender, false);

        // Approve task can be claimed by receiver
        await taskService.claimTask(approveTask, receiver);

        // Although employee doesn't have appropriate roles; sender can delegate task to employee
        await taskService.delegateTask(approveTask, sender, employee);

        // employee cannot claim the task; because of lack of appropriate roles
        await taskService.claimTask(approveTask, employee, false);

        // sender can revoke the task (employee perspective)
        await taskService.revokeTask(approveTask, sender);

        // sender can revoke the task (receiver perspective)
        await taskService.revokeTask(approveTask, sender);

        // task is assigned to sender by sender
        await taskService.assignTask(approveTask, sender, sender);        
        
        // task is cannot be assigned to employee by sender
        await taskService.assignTask(approveTask, sender, employee, false);

        // sender revokes the task
        await taskService.revokeTask(approveTask, sender);

        // Now, task is can be assigned to employee by sender
        await taskService.assignTask(approveTask, sender, employee);

        // receiver cannot delegate task to sender
        await taskService.delegateTask(approveTask, receiver, sender, false);

        // sender delegates the task to receiver (employee perspective)
        await taskService.delegateTask(approveTask, sender, receiver);

        // receiver cannot claim the task, as task is delegated to receiver itself
        await taskService.claimTask(approveTask, receiver, false);

        // receiver can revoke the task
        await taskService.revokeTask(approveTask, receiver);

        // sender can delegate the task to sender itself
        await taskService.delegateTask(approveTask, sender, sender);

        // Although employee is the owner of the task, cannot revoke it
        await taskService.revokeTask(approveTask, employee, false);

        // sender can revoke the task
        await taskService.revokeTask(approveTask, sender);

        // employee can delegate the task to receiver
        await taskService.delegateTask(approveTask, employee, receiver);

        // Finally receiver can complete the task
        await taskService.completeTask(approveTask, receiver);
    }
}