'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import WorldWideTestTenant from '../../worldwidetesttenant';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import { CaseOwner, TenantRoleMember } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import TaskService from '../../../framework/service/task/taskservice';
import { assertTask, findTask, assertTaskCount } from '../../../framework/test/assertions';
import Case from '../../../framework/cmmn/case';
import { ServerSideProcessing } from '../../../framework/test/time';

const caseService = new CaseService();
const caseTeamService = new CaseTeamService();
const taskService = new TaskService();

const definition = 'caseteam.xml';
const requestorRole = 'Requestor';
const approverRole = 'Approver';

export default class TestCaseTeam2 {
    async run(worldwideTenant: WorldWideTestTenant) {
        const tenant = worldwideTenant.name;
        const sender = worldwideTenant.sender;
        const receiver = worldwideTenant.receiver;
        const employee = worldwideTenant.employee;

        const caseTeam = new CaseTeam([]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        const caseInstance = await caseService.startCase(startCase, sender) as Case;

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
        await caseTeamService.setMember(caseInstance, sender, new CaseOwner(sender, [approverRole]))

        // Now, sender can claim 'Approve' task
        await taskService.claimTask(approveTask, sender)
        await assertTask(approveTask, sender, 'Claim', 'Assigned', sender, sender)

        // There should be 3 Unassigned tasks
        tasks = await taskService.getCaseTasks(caseInstance, sender);
        assertTaskCount(tasks, 'Unassigned', 3)

        // As receiver is not part of the team, cannot perform getCaseTasks 
        tasks = await taskService.getCaseTasks(caseInstance, receiver, false);

        // Sender can add a role mapping to the case team
        await caseTeamService.setMember(caseInstance, sender, new TenantRoleMember('Receiver', [requestorRole]))

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