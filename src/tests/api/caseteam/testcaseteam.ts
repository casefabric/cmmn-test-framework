'use strict';

import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseService from '../../../framework/service/case/caseservice';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import TaskService from '../../../framework/service/task/taskservice';
import { assertTaskCount, assertTask, findTask, assertCaseTeamMember } from '../../../framework/test/assertions';
import { CaseOwner, TenantRoleMember } from '../../../framework/cmmn/caseteammember';
import Case from '../../../framework/cmmn/case';
import CaseTeam from '../../../framework/cmmn/caseteam';

const repositoryService = new RepositoryService();
const caseService = new CaseService();
const caseTeamService = new CaseTeamService();
const taskService = new TaskService();

const tenantName = Math.random().toString(36).substring(7);
const worldwideTenant = new WorldWideTestTenant(tenantName);
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;
const definition = 'caseteam.xml';
const requestorRole = 'Requestor';
const approverRole = 'Approver';

export default class TestCaseTeam extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(sender, definition, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        const caseInstance = await caseService.startCase(sender, startCase);

        // Getting the case must be allowed for sender
        await caseService.getCase(sender, caseInstance);

        // Getting the case is not allowed for the receiver and employee, as they are not part of the case team
        await caseService.getCase(receiver, caseInstance, 404);
        await caseService.getCase(employee, caseInstance, 404);

        // Get case tasks should be possible for sender and there should be 5 Unassigned tasks
        let tasks = await taskService.getCaseTasks(sender, caseInstance);
        assertTaskCount(tasks, 'Unassigned', 5);

        const approveTask = findTask(tasks, 'Approve');
        const taskWithoutRole = findTask(tasks, 'Task Without Role');
        const requestTask = findTask(tasks, 'Request');
        
        // Sender can claim task 'Task Without Role'
        await taskService.claimTask(sender, taskWithoutRole);
        await assertTask(sender, taskWithoutRole, 'Claim', 'Assigned', sender, sender);
        
        // There should be 4 Unassigned tasks
        tasks = await taskService.getCaseTasks(sender, caseInstance);
        assertTaskCount(tasks, 'Unassigned', 4);

        // Add Approver role to sender
        await caseTeamService.setMember(sender, caseInstance, new CaseOwner(sender, [approverRole]));
        await assertCaseTeamMember(sender, caseInstance, new CaseOwner(sender, [approverRole]));

        // Now, sender can claim 'Approve' task
        await taskService.claimTask(sender, approveTask)
        await assertTask(sender, approveTask, 'Claim', 'Assigned', sender, sender);

        // There should be 3 Unassigned tasks
        tasks = await taskService.getCaseTasks(sender, caseInstance);
        assertTaskCount(tasks, 'Unassigned', 3);

        // As receiver is not part of the team, getting tasks for receiver should fail
        await taskService.getTask(receiver, approveTask, 404);
        await taskService.getCaseTasks(receiver, caseInstance, 404);

        // Sender can add a role mapping to the case team
        await caseTeamService.setMember(sender, caseInstance, new TenantRoleMember('Receiver', [requestorRole]));
        await assertCaseTeamMember(sender, caseInstance, new TenantRoleMember('Receiver', [requestorRole]));

        // Now, getting the case and case tasks should be possible for receiver
        await taskService.getCaseTasks(receiver, caseInstance);
        await taskService.getTask(receiver, approveTask);

        // Receiver can claim 'Request' task
        await taskService.claimTask(receiver, requestTask);
        await assertTask(receiver, requestTask, 'Claim', 'Assigned', receiver, receiver);

        // There should be 2 Unassigned tasks
        tasks = await taskService.getCaseTasks(sender, caseInstance);
        assertTaskCount(tasks, 'Unassigned', 2);

        // As receiver is not a caseteam owner, he cannot remove sender (who is owner)
        await caseTeamService.removeMember(receiver, caseInstance, sender, 401);

        // Sender makes receiver a case team owner; but via user mapping
        await caseTeamService.setMember(sender, caseInstance, new CaseOwner(receiver, [requestorRole]));
        await assertCaseTeamMember(sender, caseInstance, new CaseOwner(receiver, [requestorRole]));

        await caseService.getCase(receiver, caseInstance);
        
        // Now, receiver can remove sender
        await caseTeamService.removeMember(receiver, caseInstance, sender);
        await assertCaseTeamMember(receiver, caseInstance, new CaseOwner(sender, [approverRole]), false);

        // Finally, sender cannot perform find case, case tasks, and task
        await caseService.getCase(sender, caseInstance, 404);
        await taskService.getCaseTasks(sender, caseInstance, 404);
        await taskService.getTask(sender, approveTask, 404);
    }
}