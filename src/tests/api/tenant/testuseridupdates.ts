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

const tenant1 = new Tenant(tenant1Name, [tenantOwner, tenantUser1, tenantUser2, tenantUser3]);
const tenant2 = new Tenant(tenant2Name, [tenantOwner, tenantUser1, tenantUser2]);

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';

const caseService = new CaseService();
const taskService = new TaskService();


export default class TestUserIdUpdates extends TestCase {
    /**
     * @override
     */
    async run() {
        await this.createTenants();
        await this.createCases();
        await this.changeUser2();
    }

    async changeUser2() {
        const invalidNewInfo = [{
            existingUserId: tenantUser2.id,
            newUserId: tenantUser1.id
        }, {
            existingUserId: tenantUser1.id,
            newUserId: tenantUser3.id
        }];
        const newInfo = [{
            existingUserId: tenantUser1.id,
            newUserId: 'user1_' + guid
        // }, {
        //     existingUserId: tenantUser2.id,
        //     newUserId: 'user2_' + guid
        }, {
            existingUserId: tenantUser3.id,
            newUserId: 'user3_' + guid
        }];
        await platformService.updateUserInformation(platformAdmin, invalidNewInfo, 400);
        await platformService.updateUserInformation(platformAdmin, newInfo);
    }

    async createCases() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: tenantUser1.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(tenantUser1), new CaseTeamMember('role1', [], 'role')]);
        
        const startCase = { tenant: tenant1.name, definition, inputs, caseTeam };

        // Create a case and complete the first task
        await this.createCaseAndCompleteTask(tenantUser1, tenantUser2, startCase);
        await this.createCaseAndCompleteTask(tenantUser1, tenantUser3, startCase);

        // Also create a case in second tenant.
        startCase.tenant = tenant2.name;
        await this.createCaseAndCompleteTask(tenantUser1, tenantUser2, startCase);

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