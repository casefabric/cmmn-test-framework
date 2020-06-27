'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import WorldWideTestTenant from '../../worldwidetesttenant';
import CaseTeamService from '../../../framework/service/case/caseteamservice';
import { CaseOwner, TenantRoleMember } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import TaskService from '../../../framework/service/task/taskservice';
import { findTask } from '../../../framework/test/assertions';
import Case from '../../../framework/cmmn/case';

const caseService = new CaseService();
const caseTeamService = new CaseTeamService();
const taskService = new TaskService();

const definition = 'caseteam.xml';
const requestorRole = 'Requestor';

export default class TestCaseTeam3 {
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

        // Get case tasks should be possible for sender
        const tasks = await taskService.getCaseTasks(caseInstance, sender);

        const approveTask = findTask(tasks, 'Approve')

        // Getting case tasks and task for receiver should fail
        await taskService.getTask(approveTask, receiver, false);
        await taskService.getCaseTasks(caseInstance, receiver, false);

        // Sender can add a role mapping to the case team
        await caseTeamService.setMember(caseInstance, sender, new TenantRoleMember('Receiver', [requestorRole]))

        // Now, getting the case, case tasks, and task should be possible for receiver
        await caseService.getCase(caseInstance, receiver);
        await taskService.getCaseTasks(caseInstance, receiver);
        await taskService.getTask(approveTask, receiver);

        // As receiver is not a caseteam owner, he cannot remove sender (who is also owner)
        await caseTeamService.removeMember(caseInstance, receiver, sender, false);

        // Sender makes receiver a case team owner; but via user mapping
        await caseTeamService.setMember(caseInstance, sender, new CaseOwner(receiver, [requestorRole]))

        await caseService.getCase(caseInstance, receiver);
        
        // Now, receiver can remove sender; although the role binding says it as not an owner
        await caseTeamService.removeMember(caseInstance, receiver, sender);

        // Finally, sender cannot perform get case, case tasks, and task
        await caseService.getCase(caseInstance, sender, false);
        await taskService.getCaseTasks(caseInstance, sender, false);
        await taskService.getTask(approveTask, sender, false);
    }    
}