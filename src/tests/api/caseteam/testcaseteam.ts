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
        await repositoryService.validateAndDeploy(definition, sender, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        const caseInstance = await caseService.startCase(sender, startCase) as Case;

        // Getting the case must be allowed for sender
        await caseService.getCase(sender, caseInstance);

        // Getting the case is not allowed for the receiver and employee, as they are not part of the case team
        await caseService.getCase(receiver, caseInstance, 404);
        await caseService.getCase(employee, caseInstance, 404);

        // Get case tasks should be possible for sender and there should be 5 Unassigned tasks
        let tasks = await taskService.getCaseTasks(caseInstance, sender);
        assertTaskCount(tasks, 'Unassigned', 5);

        const approveTask = findTask(tasks, 'Approve');
        const taskWithoutRole = findTask(tasks, 'Task Without Role');
        const requestTask = findTask(tasks, 'Request');
        
        // Sender can claim task 'Task Without Role'
        await taskService.claimTask(taskWithoutRole, sender);
        await assertTask(taskWithoutRole, sender, 'Claim', 'Assigned', sender, sender);
        
        // There should be 4 Unassigned tasks
        tasks = await taskService.getCaseTasks(caseInstance, sender);
        assertTaskCount(tasks, 'Unassigned', 4);

        // Add Approver role to sender
        await caseTeamService.setMember(sender, caseInstance, new CaseOwner(sender, [approverRole]));
        await assertCaseTeamMember(new CaseOwner(sender, [approverRole]), caseInstance, sender);

        // Now, sender can claim 'Approve' task
        await taskService.claimTask(approveTask, sender)
        await assertTask(approveTask, sender, 'Claim', 'Assigned', sender, sender);

        // There should be 3 Unassigned tasks
        tasks = await taskService.getCaseTasks(caseInstance, sender);
        assertTaskCount(tasks, 'Unassigned', 3);

        // As receiver is not part of the team, getting tasks for receiver should fail
        await taskService.getTask(approveTask, receiver, 404);
        await taskService.getCaseTasks(caseInstance, receiver, 404);

        // Sender can add a role mapping to the case team
        await caseTeamService.setMember(sender, caseInstance, new TenantRoleMember('Receiver', [requestorRole]));
        await assertCaseTeamMember( new TenantRoleMember('Receiver', [requestorRole]), caseInstance, sender);

        // Now, getting the case and case tasks should be possible for receiver
        await taskService.getCaseTasks(caseInstance, receiver);
        await taskService.getTask(approveTask, receiver);

        // Receiver can claim 'Request' task
        await taskService.claimTask(requestTask, receiver);
        await assertTask(requestTask, receiver, 'Claim', 'Assigned', receiver, receiver);

        // There should be 2 Unassigned tasks
        tasks = await taskService.getCaseTasks(caseInstance, sender);
        assertTaskCount(tasks, 'Unassigned', 2);

        // As receiver is not a caseteam owner, he cannot remove sender (who is owner)
        await caseTeamService.removeMember(receiver, caseInstance, sender, 401);

        // Sender makes receiver a case team owner; but via user mapping
        await caseTeamService.setMember(sender, caseInstance, new CaseOwner(receiver, [requestorRole]));
        await assertCaseTeamMember(new CaseOwner(receiver, [requestorRole]), caseInstance, sender);

        await caseService.getCase(receiver, caseInstance);
        
        // Now, receiver can remove sender
        await caseTeamService.removeMember(receiver, caseInstance, sender);
        await assertCaseTeamMember(new CaseOwner(sender, [approverRole]), caseInstance, receiver, false);

        // Finally, sender cannot perform find case, case tasks, and task
        await caseService.getCase(sender, caseInstance, 404);
        await taskService.getCaseTasks(caseInstance, sender, 404);
        await taskService.getTask(approveTask, sender, 404);
    }
}