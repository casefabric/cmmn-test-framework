import DeployCase from "../../../service/case/command/repository/deploycase";
import RepositoryService, { readLocalXMLDocument } from "../../../service/case/repositoryservice";
import TenantService from "../../../service/tenant/tenantservice";
import TenantUser from "../../../tenant/tenantuser";
import TestCase from "../../../test/testcase";
import WorldWideTestTenant from "../../worldwidetesttenant";

const repositoryTenant = new WorldWideTestTenant('For-repository-testing');
const repositoryTenant2 = new WorldWideTestTenant('For-repository-testing-2');
const tenant = repositoryTenant.name;
const tenantOwner = repositoryTenant.sender;
const tenantUser = new TenantUser('tenant-user', []);
const tenantUserInBothTenants = new TenantUser('tenant-user-2', []);

export default class TestRepositoryAPI extends TestCase {
    async onPrepareTest() {
        await repositoryTenant.create();
        await repositoryTenant2.create();

        const addUser = async (user:TenantUser, tenant: WorldWideTestTenant) => {
            try {
                await TenantService.setTenantUser(tenantOwner, tenant.tenant, user);
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
        await RepositoryService.validateCaseDefinition(tenantOwner, invalidCaseDefinition, 400);

        // Validating the valid case model should not result in an error
        await RepositoryService.validateCaseDefinition(tenantOwner, validCaseDefinition);

        // Deploying an invalid case definition to a valid file name should result in an error.
        const deployInvalidCaseDefinition = new DeployCase(readLocalXMLDocument(invalidCaseDefinition), invalidCaseDefinition, tenant);
        await RepositoryService.deployCase(tenantOwner, deployInvalidCaseDefinition, 400);

        // Listing case definitions should succeed as tenant owner
        await RepositoryService.listCaseDefinitions(tenantOwner, tenant);

        // Login as tenant user, and then try to deploy a case. That should not be possible.
        await tenantUser.login();

        // Listing case definitions should succeed
        await RepositoryService.listCaseDefinitions(tenantUser, tenant);

        // Listing case definitions should succeed, because tenant user is only in 1 tenant
        await RepositoryService.listCaseDefinitions(tenantUser);

        // Listing case definitions should fail in wrong tenant with unauthorized
        await RepositoryService.listCaseDefinitions(tenantUser, 'not-existing-tenant', 404, 'Listing case definitions should fail in wrong tenant with not found');

        // Deploying an valid case definition should work for a tenant owner, but fail for a tenant user
        const deployValidCaseDefinition = new DeployCase(readLocalXMLDocument(validCaseDefinition), invalidCaseDefinition, tenant);

        // Should give "unauthorized"
        await RepositoryService.deployCase(tenantUser, deployValidCaseDefinition, 401, 'Deploying an valid case definition should fail for a tenant user');

        // As tenant owner it should succeed
        await RepositoryService.deployCase(tenantOwner, deployValidCaseDefinition);

        // Try test on empty tenant for a user with multiple tenants should fail
        await tenantUserInBothTenants.login();
        await RepositoryService.listCaseDefinitions(tenantUserInBothTenants, undefined, 400, 'Listing case definitions without passing tenant information if the user belongs to multiple tenants should fail');

        // Listing case definitions without being registered in a tenant should not be possible
        await RepositoryService.listCaseDefinitions(repositoryTenant.platformAdmin, undefined, 401, 'Listing case definitions without being registered in a tenant should not be possible');
    }
}