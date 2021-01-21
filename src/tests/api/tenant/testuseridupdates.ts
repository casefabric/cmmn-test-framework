import User from "../../../framework/user";
import TenantService from "../../../framework/service/tenant/tenantservice";
import Tenant from "../../../framework/tenant/tenant";
import TenantUser, { TenantOwner, UpsertableTenantUser } from "../../../framework/tenant/tenantuser";
import TestCase from "../../../framework/test/testcase";
import Comparison from "../../../framework/test/comparison";
import PlatformService from "../../../framework/service/platform/platformservice";
import RepositoryService from "../../../framework/service/case/repositoryservice";
import CaseService from "../../../framework/service/case/caseservice";
import TaskService from "../../../framework/service/task/taskservice";
import CaseTeam from "../../../framework/cmmn/caseteam";
import CaseTeamMember, { CaseOwner } from "../../../framework/cmmn/caseteammember";
import Case from "../../../framework/cmmn/case";
import Task from "../../../framework/cmmn/task";
import StartCase from "../../../framework/service/case/startcase";
import logger from "../../../framework/logger";
import CaseTeamService from "../../../framework/service/case/caseteamservice";
import CaseHistoryService from "../../../framework/service/case/casehistoryservice";
import PlanItemHistory from "../../../framework/cmmn/planitemhistory";
import { ServerSideProcessing, SomeTime } from "../../../framework/test/time";
import CasePlanService from "../../../framework/service/case/caseplanservice";

const platformAdmin = new User('admin');

const tenantService = new TenantService();
const platformService = new PlatformService();

const guid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
const tenant1Name = 'tenant-1-' + guid;
const tenant2Name = 'tenant-2-' + guid;

const tenantOwner = new TenantOwner('tenant-owner1');

const tenantRoles = ["role1", "role2"]; // Roles can be used to add users to the case team without mentioning their user id.
const tenantUser1 = new TenantUser('user-1-' + guid, tenantRoles);
const tenantUser2 = new TenantUser('user-2-' + guid, tenantRoles);
const tenantUser3 = new TenantUser('user-3-' + guid, tenantRoles);

// New IDs
const newUser1Id = 'user1_' + guid;
const newUser3Id = 'user3_' + guid;

const tenant1 = new Tenant(tenant1Name, [tenantOwner, tenantUser1, tenantUser2, tenantUser3]);
const tenant2 = new Tenant(tenant2Name, [tenantOwner, tenantUser1, tenantUser2]);

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const caseHistoryService = new CaseHistoryService();

export default class TestUserIdUpdates extends TestCase {
    /**
     * @override
     */
    async run() {
        await this.createTenants();
        await this.createCases();
        await this.invalidChangeUser();
        const beforeStatsUser1 = await this.getUserStats(tenantUser1);
        const beforeStatsUser3 = await this.getUserStats(tenantUser3);
        await this.changeUser(tenantUser1, newUser1Id, beforeStatsUser1);
        await SomeTime(5000);
        await this.changeUser(tenantUser3, newUser3Id, beforeStatsUser3);
    }

    async changeUser(user: TenantUser, newId: string, beforeStates: any) {
        const newInfo = [{
            existingUserId: user.id,
            newUserId: newId
        }];

        // Get user stats before updating user-id
        const beforeStats = await this.getUserStats(user);
        // console.log(JSON.stringify(beforeStats, undefined, 2));

        // const userInfo = await platformService.getUserInformation(tenantUser1);
        await platformService.updateUserInformation(platformAdmin, newInfo);
        
        await SomeTime(5000);

        const newUser = new TenantUser(newId);
        await newUser.login();
        // const newUserInfo = await platformService.getUserInformation(newUser);
        
        // Get user stats after updating user-id
        const afterStats = await this.getUserStats(newUser);
        // console.log(JSON.stringify(afterStats, undefined, 2));

        const beforeMsg = JSON.stringify({user: user.id, beforeStats}, undefined, 2);
        const afterMsg = JSON.stringify({user: newId, afterStats}, undefined, 2);

        if(!Comparison.sameJSON(beforeStats, afterStats)) {
            throw new Error(`Mismatching statistics for user ${user.id};\nExpected:${beforeMsg},\nFound:${afterMsg}`);
        }
    }

    async invalidChangeUser() {
        const invalidNewInfo = [{
            existingUserId: tenantUser2.id,
            newUserId: tenantUser1.id
        }, {
            existingUserId: tenantUser1.id,
            newUserId: tenantUser3.id
        }];
        await platformService.updateUserInformation(platformAdmin, invalidNewInfo, 400);
    }

    async getUserStats(user: TenantUser) {
        // first update token
        await user.login();

        console.log(`Getting stats of user: ${user.userId}`)

        // get the number of tenants that user is part of
        const tenants = await platformService.getUserInformation(user).then(res => res.tenants.length);

        // get the number of cases that user is part of
        const caseIds: Array<string> = [];
        const cases = await caseService.getCases(user).then(res => {
            res.forEach(c => {
                caseIds.push(c.id);
                console.log(`Found case [${c.id}] for user ${user.id} in tenant ${c.tenant}`)
            });
            return res.length;
        });
        for (const id in caseIds) {
            await new CaseTeamService().getCaseTeam(user, caseIds[id]).then(team => {
                console.log("Members in case " + id +": " + team.members.map(m => m.memberId + " (of type: " + m.memberType +")"))
            })
        }
        // await caseService.getCases(user).then(res => console.log(JSON.stringify(res, undefined, 2)));

        // get the number of tasks that user is part of
        const tasks = await taskService.getTasks(user).then(res => res.length);

        return {tenants, cases, tasks};
    };

    async createCases() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: tenantUser1.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(tenantUser1), new CaseTeamMember('role1', [], 'role')]);
        
        const caseInstanceId = 'case1-'+guid;
        const startCase = { tenant: tenant1.name, definition, inputs, caseTeam, caseInstanceId };

        // Create a case and complete the first task
        await this.createCaseAndCompleteTask(tenantUser1, tenantUser2, startCase);
        startCase.caseInstanceId = 'case2-'+guid;
        await this.createCaseAndCompleteTask(tenantUser1, tenantUser3, startCase);

        // Also create a case in second tenant.
        startCase.tenant = tenant2.name;
        startCase.caseInstanceId = 'case3-'+guid;
        await this.createCaseAndCompleteTask(tenantUser1, tenantUser2, startCase);

        // Starting a case with actual user-ids tenantUser1, tenantUser3
        const caseTeam2 = new CaseTeam([new CaseOwner(tenantUser1), new CaseTeamMember(tenantUser3)]);
        const startCase2 = { tenant: tenant1.name, definition, inputs, caseTeam: caseTeam2, caseInstanceId };
        startCase2.caseInstanceId = 'case4-'+guid;
        await caseService.startCase(tenantUser1, startCase2) as Case;

        // Starting a case with actual user-ids tenantUser1, tenantUser2, tenantUser3
        const caseTeam3 = new CaseTeam([new CaseOwner(tenantUser1), new CaseTeamMember(tenantUser3), new CaseTeamMember(tenantUser2)]);
        // console.log(JSON.stringify(caseTeam2, undefined, 2))
        startCase2.caseInstanceId = 'case5-'+guid;
        startCase2.caseTeam = caseTeam3;
        await caseService.startCase(tenantUser1, startCase2) as Case;

        // TODO: add test that creates a case with a team with actual userIds instead of role;
        // then create the case (without doing any further tasks), and verify that the case is also found with the new team memers


        // TODO: add a test that retrieves the tenants and the cases and check whether the user ids have been updated
    }

    async createCaseAndCompleteTask(creator: User, completer: User, startCase: StartCase) {
        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };
        const caze = await caseService.startCase(creator, startCase) as Case;
        const tasks = await taskService.getCaseTasks(completer, caze);
        const task = tasks.find(task => Task.isActive(task));
        if (! task) throw new Error('Expected to find an active task');
        await taskService.claimTask(completer, task);
        await taskService.completeTask(completer, task, taskOutput);
    }

    async createTenants() {
        await platformAdmin.login();
        await platformService.createTenant(platformAdmin, tenant1);
        await platformService.createTenant(platformAdmin, tenant2);

        // Login again to refresh the user information, after which it should contain the new tenant info
        await tenantOwner.login();
        if (!tenantOwner.userInformation?.tenants.find(tenant => tenant.tenant === tenant1Name)) {
            throw new Error(`User ${tenantOwner} is supposed to be member of tenant ${tenant1Name}`);
        }
        await tenantUser1.login();
        await tenantUser2.login();
        await tenantUser3.login();

        await repositoryService.validateAndDeploy(tenantOwner, definition, tenant1);
        await repositoryService.validateAndDeploy(tenantOwner, definition, tenant2);
    }
}