import User from "../../../framework/user";
import Tenant from "../../../framework/tenant/tenant";
import TenantUser, { TenantOwner } from "../../../framework/tenant/tenantuser";
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
import CaseTeamService from "../../../framework/service/case/caseteamservice";
import CaseHistoryService from "../../../framework/service/case/casehistoryservice";
import { SomeTime } from "../../../framework/test/time";
import logger from "../../../framework/logger";

const platformAdmin = new User('admin');

const definition = 'helloworld.xml';

const guid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
const tenant1Name = 'tenant-1-' + guid;
const tenant2Name = 'tenant-2-' + guid;

const tenantOwner = new TenantOwner('tenant-owner1');

const tenantRoles = ["role1", "role2"]; // Roles can be used to add users to the case team without mentioning their user id.
const tenantUser1 = new TenantUser('user-1-' + guid, tenantRoles);
const tenantUser2 = new TenantUser('user-2-' + guid, tenantRoles);
const tenantUser3 = new TenantUser('user-3-' + guid, tenantRoles);

// New IDs
const newTenantUser1 = new TenantUser('user1_' + guid, tenantRoles);
const newTenantUser3 = new TenantUser('user3_' + guid, tenantRoles);

const tenant1 = new Tenant(tenant1Name, [tenantOwner, tenantUser1, tenantUser2, tenantUser3]);
const tenant2 = new Tenant(tenant2Name, [tenantOwner, tenantUser1, tenantUser2]);

const repositoryService = new RepositoryService();
const caseTeamService = new CaseTeamService();
const platformService = new PlatformService();
const caseService = new CaseService();
const taskService = new TaskService();
const caseHistoryService = new CaseHistoryService();

export default class TestUserIdUpdates extends TestCase {
    /**
     * @override
     */
    async run() {
        // Create a basic infra of 2 tenants and 5 cases.
        await this.createTenants();
        await this.createCases();

        // It should not be possible to change into existing users.
        await this.invalidChangeUser();
        // First, change 'user-1-guid' into 'user1_guid'
        await this.changeUsers([tenantUser1], [newTenantUser1]);
        // After that, change user 3
        await this.changeUsers([tenantUser3], [newTenantUser3]);
        // Finally, revert back to the original user id's in one shot.
        await this.changeUsers([newTenantUser1, newTenantUser3], [tenantUser1, tenantUser3]);
    }

    async changeUsers(users: Array<TenantUser>, newUsers: Array<TenantUser>) {
        const newInfo = [];
        const beforeStats = [];
        const afterStats = [];

        // Getting all the users stats before update
        for (let i = 0; i < users.length; i++) {
            const info = {
                existingUserId: users[i].userId,
                newUserId: newUsers[i].userId
            }
            newInfo.push(info);

            // Get user stats before updating user-id
            const beforeUserStats = await this.getUserStats(users[i]);
            beforeStats.push(beforeUserStats);
        }

        // Updating user-ids via platform admin
        await platformService.updateUserInformation(platformAdmin, newInfo);

        await SomeTime(5000);

        // Getting all the users stats after update
        for (let i = 0; i < newUsers.length; i++) {
            const newUser = newUsers[i];
            // for (let newUser of newUsers) {
            await newUser.login();
            // // It should not be possible to login with original user anymore
            // await users[i].login();

            // Get user stats after updating user-id
            const afterUserStats = await this.getUserStats(newUser);

            // Method that converts a user id to the old one, if it was changed.
            //  This is needed to make the comparison of modifiedBy to work properly.
            const convertId = (potentialNewUserId: string) => {
                for (let k = 0; k < newUsers.length; k++) {
                    if (potentialNewUserId === newUsers[k].userId) {
                        return users[k].userId;
                    }
                }
                return potentialNewUserId
            };
            // Run through the list of user id's and change the id of the newly changed users back to the old one
            //  in order to keep the comparison the same.
            const afterStatsLastModified = afterUserStats.lastModifiedSet;
            for (let j = 0; j<afterStatsLastModified.length; j++) {
                afterStatsLastModified[j] = convertId(afterStatsLastModified[j]);
            }
            afterStats.push(afterUserStats);
        }

        // Comparing before and after update stats
        for (let i = 0; i < users.length; i++) {
            const beforeMsg = JSON.stringify({ user: users[i].userId, beforeStats: beforeStats[i] }, undefined, 2);
            const afterMsg = JSON.stringify({ user: newUsers[i].userId, afterStats: afterStats[i] }, undefined, 2);

            if (!Comparison.sameJSON(beforeStats, afterStats)) {
                throw new Error(`Mismatching statistics for user ${users[i].userId};\nExpected:${beforeMsg},\nFound:${afterMsg}`);
            }
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
        const lastModifiedSet: Array<string> = [];
        const cases = await caseService.getCases(user).then(res => {
            res.forEach(c => {
                caseIds.push(c.id);
                lastModifiedSet.push(c.modifiedBy);
                console.log(`Found case [${c.id}] for user ${user.id} in tenant ${c.tenant}`)
            });
            return res.length;
        });
        let planItemHistories = 0;

        for (const id of caseIds) {
            await caseTeamService.getCaseTeam(user, id).then(team => {
                console.log("Members in case " + id + ": " + team.members.map(m => m.memberId + " (of type: " + m.memberType + ")"))
            })
            const planItemHistory = await caseHistoryService.getCasePlanHistory(user, { id } as Case).then(items => items.length);
            planItemHistories += planItemHistory;
        }
        // await caseService.getCases(user).then(res => console.log(JSON.stringify(res, undefined, 2)));

        // get the number of tasks that user is part of
        const tasks = await taskService.getTasks(user).then(res => res.length);

        return { tenants, cases, tasks, planItemHistories, lastModifiedSet };
    };

    async createCases() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: tenantUser1.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(tenantUser1), new CaseTeamMember('role1', [], 'role')]);

        const caseInstanceId = 'case1-' + guid;
        const startCase = { tenant: tenant1.name, definition, inputs, caseTeam, caseInstanceId };

        // Create a case and complete the first task
        await this.createCaseAndCompleteTask(tenantUser1, tenantUser2, startCase);
        startCase.caseInstanceId = 'case2-' + guid;
        await this.createCaseAndCompleteTask(tenantUser1, tenantUser3, startCase);

        // Also create a case in second tenant.
        startCase.tenant = tenant2.name;
        startCase.caseInstanceId = 'case3-' + guid;
        await this.createCaseAndCompleteTask(tenantUser1, tenantUser2, startCase);

        // Starting a case with actual user-ids tenantUser1, tenantUser3
        const caseTeam2 = new CaseTeam([new CaseOwner(tenantUser1), new CaseTeamMember(tenantUser3)]);
        const startCase2 = { tenant: tenant1.name, definition, inputs, caseTeam: caseTeam2, caseInstanceId };
        startCase2.caseInstanceId = 'case4-' + guid;
        await caseService.startCase(tenantUser1, startCase2) as Case;

        // Starting a case with actual user-ids tenantUser1, tenantUser2, tenantUser3
        const caseTeam3 = new CaseTeam([new CaseOwner(tenantUser1), new CaseTeamMember(tenantUser3), new CaseTeamMember(tenantUser2)]);
        // console.log(JSON.stringify(caseTeam2, undefined, 2))
        startCase2.caseInstanceId = 'case5-' + guid;
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
        if (!task) throw new Error('Expected to find an active task');
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