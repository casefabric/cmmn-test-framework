'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import CaseFileService from '../../../framework/service/case/casefileservice';
import CaseTeamMember from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import Comparison from '../../../framework/test/comparison';
import TenantService from '../../../framework/service/tenant/tenantservice';
import TaskService from '../../../framework/service/task/taskservice';
import { assertCaseFileContent, assertTask, findTask, assertPlanItemState, assertTaskCount } from '../../../framework/test/assertions';
import TaskFilter from '../../../framework/service/task/taskfilter';
import { ServerSideProcessing } from '../../../framework/test/time';
import Task from '../../../framework/cmmn/task';
import User from '../../../framework/user';
import Case from '../../../framework/cmmn/case';
import TenantUser from '../../../framework/tenant/tenantuser';

const repositoryService = new RepositoryService();
const definition = 'caseteam.xml';

const caseService = new CaseService();
const caseTeamService = new CaseTeamService();
const caseFileService = new CaseFileService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant('wwtt-3');
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;

const requestorRole = "Requestor";
const approverRole = "Approver";
const paRole = "PersonalAssistant";
const notExistingRole = "ThisRoleIsNotInTheCaseDefinition";
const emptyRole = "";
const participantRole = 'CaseParticipant';

export default class TestCaseTeam2 extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, sender, tenant);
        await new TenantService().addTenantUserRole(sender, worldwideTenant.tenant, sender.id, "Receiver");
    }

    async run() {
        const caseTeam = new CaseTeam([]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        let caseInstance = await caseService.startCase(startCase, sender) as Case;

        // Getting the case must be allowed for sender
        await caseService.getCase(caseInstance, sender);

        // Getting the case is not allowed for the receiver and employee, as they are not part of the case team
        await caseService.getCase(caseInstance, receiver, false);
        await caseService.getCase(caseInstance, employee, false);

        // Get case tasks should be possible for sender and there should be 5 Unassigned tasks
        let tasks = await taskService.getCaseTasks(caseInstance, sender);
        assertTaskCount(tasks, 'Unassigned', 5)

        const approveTask = findTask(tasks, 'Approve')
        const assistTask = findTask(tasks, 'Assist')
        const arbitraryTask = findTask(tasks, 'Arbitrary Task')
        const taskWithoutRole = findTask(tasks, 'Task Without Role')
        const requestTask = findTask(tasks, 'Request')
        
        // Except 'Task Without Role' sender cannot claim any of the tasks in the case
        await taskService.claimTask(approveTask, sender, false)
        await taskService.claimTask(assistTask, sender, false)
        await taskService.claimTask(arbitraryTask, sender, false)
        await taskService.claimTask(requestTask, sender, false)
        await taskService.claimTask(taskWithoutRole, sender)
        await assertTask(taskWithoutRole, sender, 'Claim', 'Assigned', sender, sender)
        
        // Add Approver role to sender
        await caseTeamService.setMember(caseInstance, sender, new CaseTeamMember(sender, 'user', true, [approverRole]))

        // Now, sender can claim 'Approve' task
        await taskService.claimTask(approveTask, sender)
        await assertTask(approveTask, sender, 'Claim', 'Assigned', sender, sender)

        // There should be 3 Unassigned tasks
        tasks = await taskService.getCaseTasks(caseInstance, sender);
        assertTaskCount(tasks, 'Unassigned', 3)

        // As receiver is not part of the team, cannot perform getCaseTasks 
        tasks = await taskService.getCaseTasks(caseInstance, receiver, false);

        // Sender can add a role mapping to the case team
        await caseTeamService.setMember(caseInstance, sender, new CaseTeamMember('Receiver', 'role', false, [requestorRole]))

        // Now, receiver can perform getCaseTasks
        tasks = await taskService.getCaseTasks(caseInstance, receiver);

        // Receiver can claim 'Request' task
        await taskService.claimTask(requestTask, receiver)
        await assertTask(requestTask, receiver, 'Claim', 'Assigned', receiver, receiver)

        // There should be 2 Unassigned tasks
        tasks = await taskService.getCaseTasks(caseInstance, sender);
        assertTaskCount(tasks, 'Unassigned', 2)
    }    
}