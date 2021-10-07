import CaseService from "../../../framework/service/case/caseservice";
import DebugService from "../../../framework/service/case/debugservice";
import RepositoryService from "../../../framework/service/case/repositoryservice";
import TaskService from "../../../framework/service/task/taskservice";
import TenantService from "../../../framework/service/tenant/tenantservice";
import Tenant from "../../../framework/tenant/tenant";
import TenantUser, { TenantOwner } from "../../../framework/tenant/tenantuser";
import { findTask } from "../../../framework/test/caseassertions/task";
import TestCase from "../../../framework/test/testcase";
import WorldWideTestTenant from "../../worldwidetesttenant";

const worldwideTenant = new WorldWideTestTenant();
const definition = 'helloworld.xml';

const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestRecovery extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    /**
     * @override
     */
    async run() {
        await this.runTenantRecovery();

        await this.runCaseRecovery();
    }

    async runTenantRecovery() {
        await DebugService.forceRecovery(user, tenant);

        // Assert the right owners
        await TenantService.getTenantOwners(user, tenant).then(owners => {
            console.log(`Found tenant owners ${owners}`);
        });

        await TenantService.getTenantUsers(user, tenant).then(users => {
            console.log(`Found ${users.length} tenant users`);
        });

    }

    async runCaseRecovery() {
        // Here you can fill your own case id. If not given, then a random id will be retrieved.
        const caseId = await this.getRandomCaseId();
        // const caseId = '';
        if (! caseId) {
            console.log(`User ${user.id} has no cases to recover`);
            return;
        }

        await DebugService.forceRecovery(user, caseId);

        await CaseService.getDiscretionaryItems(user, caseId).then(items => {
            console.log(`Found ${items.discretionaryItems.length} items`);
        });
    }

    async getRandomCaseId() {
        const cases = await CaseService.getCases(user);
        if (cases.length > 0) {
            return cases[0].id;
        } else {
            // Create a simple helloworld case and complete the first task in it
            const newCase = await CaseService.startCase(user,{ tenant, definition, inputs : { Greeting: { Message: 'Hello there', From: user.id }}});
            const task = await TaskService.getCaseTask(user, newCase, 'Receive Greeting and Send response');    
            await TaskService.completeTask(user, task, { Response: { Message: 'Toedeledoki' }});
            return newCase.id;
        }
    }
}