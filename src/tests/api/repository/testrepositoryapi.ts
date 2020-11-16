import TestCase from "../../../framework/test/testcase";
import RepositoryService, { readLocalXMLDocument } from "../../../framework/service/case/repositoryservice";
import WorldWideTestTenant from "../../worldwidetesttenant";
import TenantService from "../../../framework/service/tenant/tenantservice";
import TenantUser from "../../../framework/tenant/tenantuser";
import Tenant from "../../../framework/tenant/tenant";


const repositoryService = new RepositoryService();
const tenantService = new TenantService();

const repositoryTenant = new WorldWideTestTenant('For-repository-testing');
const repositoryTenant2 = new WorldWideTestTenant('For-repository-testing-2');
const tenant = repositoryTenant.name;
const tenant2 = repositoryTenant2.name;
const tenantOwner = repositoryTenant.sender;
const tenantUser = new TenantUser('tenant-user', []);
const tenantUserInBothTenants = new TenantUser('tenant-user-2', []);

export default class TestRepositoryAPI extends TestCase {
    async onPrepareTest() {
        await repositoryTenant.create();
        await repositoryTenant2.create();

        const addUser = async (user:TenantUser, tenant: WorldWideTestTenant) => {
            try {
                await tenantService.addTenantUser(tenantOwner, tenant.tenant, user);
            } catch (e) {
                if (e.message.indexOf('already exists') < 0) {
                    throw e;
                }
            }
        }

        await addUser(tenantUser, repositoryTenant);
        await addUser(tenantUserInBothTenants, repositoryTenant);
        await addUser(tenantUserInBothTenants, repositoryTenant2);
    }

    async run() {
        const invalidCaseDefinition = 'invalid.xml';
        const validCaseDefinition = 'planning.xml';

        // Validating the invalid case model should result in an error
        await repositoryService.validateCaseDefinition(tenantOwner, invalidCaseDefinition, 400);

        // Validating the valid case model should not result in an error
        await repositoryService.validateCaseDefinition(tenantOwner, validCaseDefinition);

        // Deploying an invalid case definition to a valid file name should result in an error.
        const deployInvalidCaseDefinition = {
            definition: readLocalXMLDocument(invalidCaseDefinition),
            modelName: invalidCaseDefinition,
            tenant
        };
        await repositoryService.deployCase(tenantOwner, deployInvalidCaseDefinition, 400);

        // Listing case definitions should succeed as tenant owner
        await repositoryService.listCaseDefinitions(tenantOwner, tenant);

        // Login as tenant user, and then try to deploy a case. That should not be possible.
        await tenantUser.login();

        // Listing case definitions should succeed
        await repositoryService.listCaseDefinitions(tenantUser, tenant);

        // Listing case definitions should succeed, because tenant user is only in 1 tenant
        await repositoryService.listCaseDefinitions(tenantUser);

        // Listing case definitions fail in wrong tenant with unauthorized
        await repositoryService.listCaseDefinitions(tenantUser, 'not-existing-tenant', 401);

        // Deploying an valid case definition should work for a tenant owner, but fail for a tenant user
        const deployValidCaseDefinition = {
            definition: readLocalXMLDocument(validCaseDefinition),
            modelName: invalidCaseDefinition,
            tenant
        };

        // Should give "unauthorized"
        await repositoryService.deployCase(tenantUser, deployValidCaseDefinition, 401);

        // As tenant owner it should succeed
        await repositoryService.deployCase(tenantOwner, deployValidCaseDefinition);

        // Try test on empty tenant for a user with multiple tenants should fail
        await tenantUserInBothTenants.login();
        await repositoryService.listCaseDefinitions(tenantUserInBothTenants, undefined, 400);

        // Listing case definitions without being registered in a tenant should not be possible
        await repositoryService.listCaseDefinitions(repositoryTenant.platformAdmin, undefined, 401);
    }
}