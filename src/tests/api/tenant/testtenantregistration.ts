import User from "../../../framework/user";
import TenantService from "../../../framework/service/tenant/tenantservice";
import Tenant from "../../../framework/tenant/tenant";
import TenantUser, { TenantOwner } from "../../../framework/tenant/tenantuser";
import TestCase from "../../../framework/test/testcase";
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
        const tenantName = 'test_tenant' + guid;

        const tenantOwner1 = new TenantOwner('tenant-owner1');
        const tenantOwner2 = new TenantOwner('tenant-owner2');
        const tenantOwner3 = new TenantOwner('tenant-owner3');
        const user4TenantRoles = ['role-x', 'role-y'];
        const user4 = new TenantUser('tenant-user-4', user4TenantRoles, 'user-4', 'user4@users-and-owners.com');

        const tenantUser1 = new TenantUser('tenant-user-1');
        const tenantUser2 = new TenantUser('tenant-user-2');
        const tenantUser3 = new TenantUser('tenant-user-3');

        const tenant1 = new Tenant(tenantName, [tenantOwner1, tenantOwner2, tenantOwner3, tenantUser1, tenantUser2, tenantUser3]);

        await platformAdmin.login();

        // Creating tenant as tenantOwner should fail.
        await platformService.createTenant(tenantOwner1, tenant1, 401);

        // Creating tenant as platformOwner should succeed.
        await platformService.createTenant(platformAdmin, tenant1);

        // Creating tenant again should fail
        await platformService.createTenant(platformAdmin, tenant1, 400);
        // Getting tenant owners as platformOwner should fail.
        await tenantService.getTenantOwners(platformAdmin, tenant1, 401);
        await tenantOwner1.login();

        await tenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            const expectedOwnerIDs = tenant1.getOwners().map(o => o.userId);
            if (!Comparison.sameJSON(owners, expectedOwnerIDs)) {
                throw new Error('List of tenant owners does not match. Received ' + JSON.stringify(owners));
            }
        });

        await tenantService.getTenantUsers(tenantOwner1, tenant1).then(users => {
            console.log("Found " + users.length + " users")
        })

        // return;

        // Also not allowed to get a non-existing user
        await tenantService.getTenantUser(tenantOwner1, tenant1, "not a tenant user at all", 404);

        await tenantService.addTenantUser(tenantOwner1, tenant1, user4);

        // Adding tenant user again should not give any problems any longer (as it does an upsert)
        await tenantService.addTenantUser(tenantOwner1, tenant1, user4);

        // Also make the user a tenant owner
        await tenantService.addTenantOwner(tenantOwner1, tenant1, user4.userId);
        // Adding tenant owner twice should not give any different results.
        await tenantService.addTenantOwner(tenantOwner1, tenant1, user4.userId);

        // Check the list of tenant owners
        await tenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            const expectedOwnerIDs = tenant1.getOwners().concat([user4]).map(o => o.userId);
            if (!Comparison.sameJSON(owners, expectedOwnerIDs)) {
                throw new Error('List of tenant owners does not match. Received ' + JSON.stringify(owners));
            }
        });

        // Remove the user as tenant owner
        await tenantService.removeTenantOwner(tenantOwner1, tenant1, user4.userId);

        // List of tenant owners should be the original one again
        await tenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            const expectedOwnerIDs = tenant1.getOwners().map(o => o.userId);
            if (!Comparison.sameJSON(owners, expectedOwnerIDs)) {
                throw new Error('List of tenant owners does not match. Received ' + JSON.stringify(owners));
            }
        });

        // Tenant owner 1 may not disable the tenant
        await platformService.disableTenant(tenantOwner1, tenant1, 401);

        // But the platform admin is allowed to
        await platformService.disableTenant(platformAdmin, tenant1);

        // And the platform admin is allowed to enable it as well
        await platformService.enableTenant(platformAdmin, tenant1);

        // And the platform admin is not allowed to enable/disable a non-existing tenant
        const nonExistingTenant = new Tenant("not-created", [tenantOwner1]);
        await platformService.enableTenant(platformAdmin, nonExistingTenant, 400);
        await platformService.disableTenant(platformAdmin, nonExistingTenant, 400);

        // Lets get the list of tenant users. There should be 4. But platform admin is not allowed to get them.
        await tenantService.getTenantUsers(platformAdmin, tenant1, 401);

        // Lets get the list of tenant users. There should be 4. Tenant owners should be able to do so
        await tenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 7));

        // Now disable and enable a tenant user.
        await tenantService.disableTenantUser(tenantOwner1, tenant1, tenantOwner2.id)
        // There should be one less tenant user
        await tenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 6));
        // There should be 1 disabled user account
        await tenantService.getDisabledUserAccounts(tenantOwner1, tenant1).then(users => checkUserCount(users, 1));
        // Not allowed to get a disabled user account
        await tenantService.getTenantUser(tenantOwner1, tenant1, tenantOwner2.id, 404);
        // Enable the user account again and validate that the user can be retrieved again.
        await tenantService.enableTenantUser(tenantOwner1, tenant1, tenantOwner2.id)
        await tenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 7));
        await tenantService.getTenantUser(tenantOwner1, tenant1, tenantOwner2.id);

        // But also normal users are allowed to fetch the user list of a tenant... Are they?
        await tenantService.getTenantUsers(user4, tenant1, 401);
        await user4.login();
        // ... well i guess only if they are logged in...
        await tenantService.getTenantUsers(user4, tenant1).then(users => checkUserCount(users, 7));

        await tenantService.getTenantUser(tenantOwner1, tenant1, user4.userId).then(user => {
            if (!Comparison.sameArray(user.roles, user4TenantRoles)) {
                throw new Error('Expected user 4 to have roles ' + user4TenantRoles + ', but found ' + user.roles);
            }
            // console.log('User 4 has roles ' + user.roles);
        });

        const roleToRemove = user4TenantRoles[0];
        const expectedNewRoles = user4TenantRoles.slice(1);

        await tenantService.removeTenantUserRole(tenantOwner1, tenant1, user4.userId, roleToRemove);

        await tenantService.getTenantUser(tenantOwner1, tenant1, user4.userId).then(user => {
            if (!Comparison.sameArray(user.roles, expectedNewRoles)) {
                throw new Error('Expected user 4 to have roles ' + expectedNewRoles + ', but found ' + user.roles);
            }
            // console.log('User 4 has roles ' + user.roles);
        });


        const newName = "User4 is now called User-ABC"
        const user4WithNewName = Object.assign({
            ...user4,
            name: newName
        })
        await tenantService.updateTenantUser(tenantOwner1, tenant1, user4WithNewName);

        await tenantService.getTenantUser(tenantOwner1, tenant1, user4.userId).then(user => {
            if (user.name !== newName) {
                throw new Error('Expected user 4 to have new name ' + newName + ', but found ' + user.name);
            }
        });

        const nextOwnerId = 'next-owner';
        const nextTenantUser = new TenantUser(nextOwnerId, []);

        // Adding the owner without registering first as a user should fail.
        await tenantService.addTenantOwner(tenantOwner1, tenant1, nextOwnerId, 400);

        // Register the tenant user
        await tenantService.addTenantUser(tenantOwner1, tenant1, nextTenantUser);

        // Adding the user as an owner now should succeed.
        await tenantService.addTenantOwner(tenantOwner1, tenant1, nextOwnerId);

        await tenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 8));
    }
}

/**
 * Check the count of users in the array. Also validates that 'users' is of type Array
 * @param users 
 * @param expectedSize 
 */
const checkUserCount = (users: any, expectedSize: number) => {
    if (users instanceof Array) {
        if (users.length != expectedSize) {
            throw new Error(`Expected ${expectedSize} tenant users, but found ${users.length}: ${JSON.stringify(users, undefined, 2)}`);
        }
    } else {
        throw new Error('Expecting list of users, but got something of type ' + users.constructor.name);
    }
}