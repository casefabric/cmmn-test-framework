'use strict';

import Case from '@cafienne/typescript-client/cmmn/case';
import PlanItem from '@cafienne/typescript-client/cmmn/planitem';
import CaseTeam from '@cafienne/typescript-client/cmmn/team/caseteam';
import CaseTeamGroup, { GroupRoleMapping } from '@cafienne/typescript-client/cmmn/team/caseteamgroup';
import CaseTeamTenantRole from '@cafienne/typescript-client/cmmn/team/caseteamtenantrole';
import CaseTeamUser, { CaseOwner } from '@cafienne/typescript-client/cmmn/team/caseteamuser';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import TaskService from '@cafienne/typescript-client/service/task/taskservice';
import { assertPlanItem } from '@cafienne/typescript-client/test/caseassertions/plan';
import TestCase from '@cafienne/typescript-client/test/testcase';
import User from '@cafienne/typescript-client/user';
import MultiTenantSetup from '../../multitenantsetup';

// Case definition with the roles
const definition = 'caseteam.xml';
const caseRoleRequestor = 'Requestor';
const caseRoleApprover = 'Approver';
const caseRolePersonalAssistant = 'PersonalAssistant';
const caseRoleParticipant = 'CaseParticipant';

const requestTask = 'Request'; // Only for caseRoleRequestor
const participantTask = 'Arbitrary Task'; // Only for caseRoleParticipant
const approveTask = 'Approve'; // Only for caseRoleApprover
const taskWithoutRole = 'Task Without Role'; // For all case team members
const assistTask = 'Assist'; // Only for caseRolePersonalAssistant

// Platform setup with multiple tenants and consent groups.
const universe = new MultiTenantSetup();
const tenant = universe.futureWorld;

// Consent group roles
const groupRoleUser = universe.groupRoleUser;
const groupRoleTester = universe.groupRoleTester;

const caseTeam = new CaseTeam([
    new CaseOwner(universe.boy),
    new CaseTeamUser(universe.dad, [caseRoleParticipant, caseRolePersonalAssistant]), // This case user can also take tasks with PA as performer.
], [
    new CaseTeamGroup(universe.moonGroup, [
        new GroupRoleMapping(groupRoleTester, [caseRoleParticipant, caseRolePersonalAssistant]),
        new GroupRoleMapping(groupRoleUser, caseRoleParticipant)
    ]),
    new CaseTeamGroup(universe.marsGroup, [new GroupRoleMapping(groupRoleUser, [caseRoleParticipant, caseRoleRequestor])]),
    new CaseTeamGroup(universe.marsGroup2, [new GroupRoleMapping(groupRoleTester, [''])])
], [
    // The whole Family has access to the case as Approver. But only 'Family' in world, not 'Family' in moon or mars
    new CaseTeamTenantRole('Family', [caseRoleParticipant, caseRoleApprover])
]);


// Different tenants having the same tenantRole 'Family'. The role is present in both 'world' and 'moon' tenant.
// In this test case we validate that even if you have the same tenant role name, it does not mean you get case access.
// People with tenant role 'Family' have access to the case
const familyCaseMembers = universe.people.filter(person => person.roles.indexOf('Family') >= 0);

// Different caseteam groups, with different mappings, but on the same groupRole name.
// In this test case we validate that even if you have the same group role name, it does not mean you get case access.
// All moon groupers can access the case
const moonGroupCaseMembers = universe.people.filter(person => universe.moonGroup.hasMember(person));
// Only mars group owners and members with role user have access 
const marsGroupCaseMembers = [universe.jeff, universe.boy];
// Only mars2 group owners and members with role tester have access 
const mars2GroupCaseMembers = [universe.boy, universe.martian];
const caseTeamMembers = [...familyCaseMembers, ...moonGroupCaseMembers, ...marsGroupCaseMembers, ...mars2GroupCaseMembers];


export default class TestCaseTeamAuthorizations extends TestCase {
    async onPrepareTest() {
        await universe.create();
        await RepositoryService.validateAndDeploy(universe.boy, definition, tenant);
    }

    async run() {
        // Command to start the case with.
        const startCase = { tenant, definition, caseTeam };

        // It should not be possible to start a case without mappings
        const caseInstance = await CaseService.startCase(universe.boy, startCase);

        // This test validates the base query extension on case team membership
        await this.validateCaseAccess(caseInstance);

        // This test validates that only members of the marsGroup can access the task, and not e.g. the case owners
        await this.validateRequestTaskAccess(caseInstance);
        // // This test validates that only tenant members with Family role can access the task, and not e.g. a consent group owner
        await this.validateApproveTaskAccess(caseInstance);
        // // This test validates that all members except for one specific group can access the task
        await this.validateParticipantTaskAccess(caseInstance);
        // Validate
        await this.validateAssistTaskAccess(caseInstance);
        // This test validates that the whole team can access the task, because there is no role attached.
        await this.validateRolelessTaskAccess(caseInstance);
    }

    async validateRequestTaskAccess(caseInstance: Case) {
        // Jeff is owner of the mars group, and is allowed to Assign and Delegate the task.
        //  Boy is case owner, but the request task is exclusive to the mars group, and therefore he cannot assign the task
        //  Also he is mars group member, but not mars group owner, so also therefore he cannot assign the task.
        const taskPerformers: Array<User> = [universe.boy];
        const taskManagers: Array<User> = [universe.jeff];

        await this.validateTaskAccess(caseInstance, requestTask, taskPerformers, taskManagers);        
    }

    async validateApproveTaskAccess(caseInstance: Case) {
        // Approve task is only available to tenant user with 'Family' role.
        // Boy is case owner and can therefore manage the task
        const taskPerformers: Array<User> = familyCaseMembers;
        const taskManagers: Array<User> = [universe.boy];

        await this.validateTaskAccess(caseInstance, approveTask, taskPerformers, taskManagers);        
    }

    async validateParticipantTaskAccess(caseInstance: Case) {
        // The whole case team, except for the mars2Group, has the participant role and should be able to access the task.
        const taskPerformers = [...familyCaseMembers, ...moonGroupCaseMembers, ...marsGroupCaseMembers];
        // Boy is case owner, neil owns moonGroup and jeff owns marsGroup
        const taskManagers = [universe.boy, universe.neil, universe.jeff];

        await this.validateTaskAccess(caseInstance, participantTask, taskPerformers, taskManagers);
    }

    async validateAssistTaskAccess(caseInstance: Case) {
        // The assist task can be taken by both case owners and moonmen that are moontester or owner of the moongroup.
        const taskManagers = [universe.boy, universe.neil]; // Case owner and consent group owner
        const taskPerformers = [universe.dad, universe.alien]; // Users with role 'PersonalAssistant'

        await this.validateTaskAccess(caseInstance, assistTask, taskPerformers, taskManagers);
    }

    async validateRolelessTaskAccess(caseInstance: Case) {
        // All case team members should be able to access a task without a caseRole
        const taskPerformers = caseTeamMembers;
        // boy is both case owner from tenant perspective and group owner of marsGroup2
        // Neil owns moonGroup and jeff owns marsGroup.
        const taskManagers = [universe.boy];

        await this.validateTaskAccess(caseInstance, taskWithoutRole, taskPerformers, taskManagers);
    }

    async validateCaseAccess(caseInstance: Case) {
        const usersWithCaseAccess = caseTeamMembers;
        const usersWithoutCaseAccess = universe.people.filter(person => caseTeamMembers.filter(user => user.id === person.id).length === 0);

        for (const user of usersWithCaseAccess) {
            console.log(`Checking whether user ${user} has access to case ${caseInstance}`);
            await CaseService.getCase(user, caseInstance, 200, `Expected user ${user} to have access on case ${caseInstance}`);
        };

        for (const user of usersWithoutCaseAccess) {
            console.log(`Checking whether user ${user} has access to case ${caseInstance}`);
            await CaseService.getCase(user, caseInstance, 404, `Did not expect user ${user} to have access on case ${caseInstance}`);
        };
    }

    async validateTaskAccess(caseInstance: Case | string, taskName: string, taskPerformers: Array<User>, taskManagers: Array<User>) {
        const task = await assertPlanItem(universe.boy, caseInstance, taskName, -1, 'Active');
        if (!task) {
            throw new Error(`Cannot find an active task ${taskName} in case ${caseInstance}`)
        }
        const taskUsers = [...taskManagers, ...taskPerformers];

        await this.validateTaskPerformers(task, taskUsers);

        const assignee = taskPerformers[0];
        await this.validateTaskManagers(task, assignee, taskManagers, taskPerformers);
    }

    async validateTaskPerformers(task: PlanItem, usersWithTaskAccess: Array<User>, usersWithoutTaskAccess = caseTeamMembers.filter(member => !usersWithTaskAccess.find(user => user.id === member.id))) {
        // const usersWithoutTaskAccess = caseTeamMembers.filter(member => !usersWithTaskAccess.find(user => user.id === member.id));
        const taskName = task.name;

        for (const user of usersWithTaskAccess) {
            console.log(`Checking whether user ${user} has access to task ${taskName}`);
            await TaskService.claimTask(user, task, 202, `Expected user ${user} to have access to claim task ${taskName}`);
            await TaskService.revokeTask(user, task, 202, `Expected user ${user} to have access to revoke task ${taskName}`);
            await TaskService.getTask(user, task).then(task => console.log("Task state is: " + task.taskState));
        };

        for (const user of usersWithoutTaskAccess) {
            console.log(`Checking whether user ${user} has access to task ${taskName}`);
            await TaskService.claimTask(user, task, 401, `Not expected that user ${user} has access to claim task ${taskName}`);
        };
    }

    async validateTaskManagers(task: PlanItem, assignee: User, taskManagers: Array<User>, others: Array<User>) {
        // Just filter out task managers from others
        others = others.filter(possibleManager => ! taskManagers.find(manager => manager.id === possibleManager.id));

        const taskName = task.name;
        for (const user of taskManagers) {
            console.log(`Checking whether user ${user} is allowed to manage task ${taskName}`);
            if (assignee) {
                await TaskService.assignTask(user, task, assignee, 202, `Expected user ${user} to have access to assign task ${taskName}`);
                await TaskService.revokeTask(user, task, 202, `Expected user ${user} to have access to revoke task ${taskName}`);
            }
        };

        for (const user of others) {
            console.log(`Checking whether user ${user} is allowed to manage task ${taskName}`);
            await TaskService.assignTask(user, task, assignee, 401, `Not expected that user ${user} is allowed to manage task ${taskName}`);
        };
    }
}