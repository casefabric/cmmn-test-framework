import TestCase from "../../../framework/test/testcase";
import RepositoryService, { readLocalXMLDocument } from "../../../framework/service/case/repositoryservice";
import WorldWideTestTenant from "../../worldwidetesttenant";
import User from "../../../framework/user";
import TenantService from "../../../framework/service/tenant/tenantservice";
import Tenant from "../../../framework/tenant/tenant";
import TenantUser from "../../../framework/tenant/tenantuser";
import { ServerSideProcessing } from "../../../framework/test/time";


const repositoryService = new RepositoryService();
const tenantService = new TenantService();

const worldwideTenant = new WorldWideTestTenant('For-repository-testing');
const tenant = worldwideTenant.name;
const tenantOwner = worldwideTenant.sender;
const tenantUser = new TenantUser('tenant-user', []);

export default class TestRepositoryAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();

        try {
            await tenantService.addTenantUser(tenantOwner, worldwideTenant.tenant, tenantUser);
        } catch (e) {
            if (!e.message.indexOf('already exists')) {
                console.log(e);
                throw e;
            }
        }

        // give it some good time.
        await ServerSideProcessing();
    }

    async run() {
        const invalidCaseDefinition = 'invalid.xml';
        const validCaseDefinition = 'planning.xml';

        // Validating the invalid case model should result in an error
        await repositoryService.validateCaseDefinition(invalidCaseDefinition, tenantOwner, false);

        // Validating the valid case model should not result in an error
        await repositoryService.validateCaseDefinition(validCaseDefinition, tenantOwner);

        // Deploying an invalid case definition to a valid file name should result in an error.
        const deployInvalidCaseDefinition = {
            definition: readLocalXMLDocument(invalidCaseDefinition),
            modelName: invalidCaseDefinition,
            tenant
        };
        await repositoryService.deployCase(deployInvalidCaseDefinition, tenantOwner, false);

        // Listing case definitions should succeed as tenant owner
        await repositoryService.listCaseDefinitions(tenantOwner, tenant);

        // By now, tenant processing should have made it such that the tenant user can login.
        // But still we will give it some extra waiting time
        await ServerSideProcessing();
        // Login as tenant user, and then try to deploy a case. That should not be possible.
        await tenantUser.login();

        // Listing case definitions should succeed
        await repositoryService.listCaseDefinitions(tenantUser, tenant);

        // Deploying an valid case definition should work for a tenant owner, but fail for a tenant user
        const deployValidCaseDefinition = {
            definition: readLocalXMLDocument(validCaseDefinition),
            modelName: invalidCaseDefinition,
            tenant
        };

        // Should give "unauthorized"
        await repositoryService.deployCase(deployValidCaseDefinition, tenantUser, false);

        // As tenant owner it should succeed
        await repositoryService.deployCase(deployValidCaseDefinition, tenantOwner);
    }
}