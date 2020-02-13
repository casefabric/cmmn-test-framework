import User from "../../../framework/user";
import TenantService from "../../../framework/service/tenant/tenantservice";
import Tenant from "../../../framework/tenant/tenant";
import TenantUser from "../../../framework/tenant/tenantuser";
import TestCase from "../../../framework/test/testcase";
import { ServerSideProcessing } from "../../../framework/test/time";
import Comparison from "../../../framework/test/comparison";
import PlatformService from "../../../framework/service/platform/platformservice";

const platformAdmin = new User('admin');

const tenantService = new TenantService();
const platformService = new PlatformService();

export default class TestTenantRegistration extends TestCase {
    /**
     * @override
     */
    async run() {
        const guid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const tenantName = 'test-tenant' + guid;

        const tenantOwner1 = new User('tenant-owner1');
        const tenantOwner2 = new User('tenant-owner2');
        const tenantOwner3 = new User('tenant-owner3');
        const user4 = new User('tenant-user-4');
        const user4TenantRoles = ['role-x', 'role-y'];
        const tenant1 = new Tenant(tenantName, [new TenantUser(tenantOwner1.id), new TenantUser(tenantOwner2.id), new TenantUser(tenantOwner3.id)]);

        await platformAdmin.login();

        // Creating tenant as tenantOwner should fail.
        await platformService.createTenant(tenantOwner1, tenant1, false);

        // Creating tenant as platformOwner should succeed.
        await platformService.createTenant(platformAdmin, tenant1);

        // Creating tenant again should fail
        await platformService.createTenant(platformAdmin, tenant1, false)

        // Getting tenant owners as platformOwner should fail.
        await tenantService.getTenantOwners(platformAdmin, tenant1, false);

        await ServerSideProcessing('Give the system a second to handle the addition of the tenant owners');

        await tenantOwner1.login();

        await tenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            const expectedOwnerIDs = tenant1.owners.map(o => o.userId);
            if (!Comparison.sameJSON(owners, expectedOwnerIDs)) {
                throw new Error('List of tenant owners does not match. Received ' + JSON.stringify(owners));
            }
        });

        const tenantUser4 = new TenantUser(user4.id, user4TenantRoles);
        // Add the user as a tenant user
        await tenantService.addTenantUser(tenantOwner1, tenant1, tenantUser4);
        // Adding user twice should result in an error
        await tenantService.addTenantUser(tenantOwner1, tenant1, tenantUser4, false);
        await ServerSideProcessing('Give the system a second to handle projection of adding user4');

        // Also make the user a tenant owner
        await tenantService.addTenantOwner(tenantOwner1, tenant1, tenantUser4.userId);
        // Adding tenant owner twice should not give any different results.
        await tenantService.addTenantOwner(tenantOwner1, tenant1, tenantUser4.userId);

        // Check the list of tenant owners
        await tenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            const expectedOwnerIDs = tenant1.owners.concat([tenantUser4]).map(o => o.userId);
            if (!Comparison.sameJSON(owners, expectedOwnerIDs)) {
                throw new Error('List of tenant owners does not match. Received ' + JSON.stringify(owners));
            }
        });

        // Remove the user as tenant owner
        await tenantService.removeTenantOwner(tenantOwner1, tenant1, tenantUser4.userId);

        // List of tenant owners should be the original one again
        await tenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            const expectedOwnerIDs = tenant1.owners.map(o => o.userId);
            if (!Comparison.sameJSON(owners, expectedOwnerIDs)) {
                throw new Error('List of tenant owners does not match. Received ' + JSON.stringify(owners));
            }
        });

        // Tenant owner 1 may not disable the tenant
        await platformService.disableTenant(tenantOwner1, tenant1, false);

        // But the platform admin is allowed to
        await platformService.disableTenant(platformAdmin, tenant1);

        // And the platform admin is allowed to enable it as well
        await platformService.enableTenant(platformAdmin, tenant1);

        // And the platform admin is not allowed to enable/disable a non-existing tenant
        const nonExistingTenant = new Tenant("not-created", [new TenantUser(tenantOwner1.id)]);
        await platformService.enableTenant(platformAdmin, nonExistingTenant, false);
        await platformService.disableTenant(platformAdmin, nonExistingTenant, false);

        // Lets get the list of tenant users. There should be 4. But platform admin is not allowed to get them.
        await tenantService.getTenantUsers(platformAdmin, tenant1, false);

        // Lets get the list of tenant users. There should be 4. Tenant owners should be able to do so
        await tenantService.getTenantUsers(tenantOwner1, tenant1);

        // But also normal users are allowed to fetch the user list of a tenant... Are they?
        await tenantService.getTenantUsers(user4, tenant1, false);
        await user4.login();
        // ... well i guess only if they are logged in...
        await tenantService.getTenantUsers(user4, tenant1).then(users => {
            if (users instanceof Array) {
                if (users.length != 4) {
                    throw new Error('Expected 4 tenant users, but found ' + users.length + ': ' + JSON.stringify(users));
                }
            } else {
                throw new Error('Expecting list of users, but got something of type ' + users.constructor.name);
            }
        });

        await tenantService.getTenantUser(tenantOwner1, tenant1, tenantUser4.userId).then(user => {
            if (! Comparison.sameArray(user.roles, user4TenantRoles)) {
                throw new Error('Expected user 4 to have roles ' + user4TenantRoles + ', but found ' + user.roles);
            }
            console.log('User 4 has roles ' + user.roles);
        });

        await tenantService.removeTenantUserRole(tenantOwner1, tenant1, tenantUser4.userId, user4TenantRoles[0]);

        // Let the projection process the event as well.
        await ServerSideProcessing();

        await tenantService.getTenantUser(tenantOwner1, tenant1, tenantUser4.userId).then(user => {
            const expectedNewRoles = user4TenantRoles.splice(1);
            if (! Comparison.sameArray(user.roles, expectedNewRoles)) {
                throw new Error('Expected user 4 to have roles ' + expectedNewRoles + ', but found ' + user.roles);
            }
            console.log('User 4 has roles ' + user.roles);
        });

        const nextOwnerId = 'next-owner';
        const nextTenantUser = new TenantUser(nextOwnerId, []);

        // Adding the owner without registering first as a user should fail.
        await tenantService.addTenantOwner(tenantOwner1, tenant1, nextOwnerId, false);

        // Register the tenant user
        await tenantService.addTenantUser(tenantOwner1, tenant1, nextTenantUser);

        // Adding the user as an owner now should succeed.
        await tenantService.addTenantOwner(tenantOwner1, tenant1, nextOwnerId);
    }
}