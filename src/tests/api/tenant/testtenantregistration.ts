import User from "@cafienne/typescript-client/user";
import TenantService from "@cafienne/typescript-client/service/tenant/tenantservice";
import Tenant from "@cafienne/typescript-client/tenant/tenant";
import TenantUser, { TenantOwner } from "@cafienne/typescript-client/tenant/tenantuser";
import TestCase from "@cafienne/typescript-client/test/testcase";
import Comparison from "@cafienne/typescript-client/test/comparison";
import PlatformService from "@cafienne/typescript-client/service/platform/platformservice";

const platformAdmin = new User('admin');

const guid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
const tenantName = 'test_tenant' + guid;

const tenantOwner1 = new TenantOwner('tenant-owner1');
const tenantOwner2 = new TenantOwner('tenant-owner2');
const tenantOwner3 = new TenantOwner('tenant-owner3');

const tenantUser1 = new TenantUser('tenant-user-1');
const tenantUser2 = new TenantUser('tenant-user-2');
const tenantUser3 = new TenantUser('tenant-user-3');

const tenant1 = new Tenant(tenantName, [tenantOwner1, tenantOwner2, tenantOwner3, tenantUser1, tenantUser2, tenantUser3]);


export default class TestTenantRegistration extends TestCase {
    /**
     * @override
     */
    async run() {
        await this.tryCreateTenant();

        await this.tryAddRemoveTenantUser();

        await this.tryChangeOwnership();

        await this.tryDisableEnableTenants();

        await this.tryDisableEnableUserAccounts();

        await this.tryChangeUserRoles();

        await this.tryChangeUserProperties();

        await this.tryReplaceTenant();

        await this.tryReplaceTenantUser();
    }

    async tryCreateTenant() {
        await platformAdmin.login();

        // Creating tenant as tenantOwner should fail.
        await PlatformService.createTenant(tenantOwner1, tenant1, 401, 'Creating tenant as tenantOwner should fail');

        // Creating tenant as platformOwner should not succeed if there are no active owners
        tenantOwner1.enabled = false;
        tenantOwner2.enabled = false;
        tenantOwner3.enabled = false;
        await PlatformService.createTenant(platformAdmin, tenant1, 400, 'Creating tenant as platformOwner should not succeed if there are no active owners');

        // Check that it is not possible to create a tenant with multiple users with the same id.
        tenant1.users.push(tenantOwner3);
        await PlatformService.createTenant(platformAdmin, tenant1, 400, 'Creating tenant as platformOwner should not succeed if there are multiple users with the same userId');
        // Remove the duplicate user
        tenant1.users.pop();

        // Creating tenant as platformOwner should succeed.
        tenantOwner1.enabled = true;
        tenantOwner2.enabled = true;
        tenantOwner3.enabled = true;
        await PlatformService.createTenant(platformAdmin, tenant1);

        // Creating tenant again should fail because tenant already exists
        await PlatformService.createTenant(platformAdmin, tenant1, 400, 'Creating tenant again should fail because tenant already exists');
        // Getting tenant owners as platformOwner should fail.
        await TenantService.getTenantOwners(platformAdmin, tenant1, 401, 'Getting tenant owners as platformOwner should fail.');

        // Login again to refresh the user information, after which it should contain the new tenant info
        await tenantOwner1.login();
        if (!tenantOwner1.userInformation?.tenants.find(tenantUser => tenantUser.tenant === tenantName)) {
            throw new Error(`User ${tenantOwner1} is supposed to be member of tenant ${tenantName}`);
        }

        // Assert the right owners
        await TenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            const expectedOwnerIDs = tenant1.getOwners().map(o => o.userId);
            if (!Comparison.sameJSON(owners, expectedOwnerIDs)) {
                throw new Error('List of tenant owners does not match. Received ' + JSON.stringify(owners));
            }
        });

        // Expect 6 users
        await TenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 6));

        // Platform owner should not be able to get list of users
        await TenantService.getTenantUsers(platformAdmin, tenant1, 401, 'Platform owner should not be able to get list of users');
    }

    async tryAddRemoveTenantUser() {
        const tempUser = new TenantUser('tempUser', ['all', 'the', 'roles', 'we', 'can', 'imagine'], 'tempName');

        // Not allowed to get a non-existing user
        await TenantService.getTenantUser(tenantOwner1, tenant1, tempUser, 404, 'A non-existing user should return 404 NotFound');

        // Should be possible to add a new tenant user
        await TenantService.setTenantUser(tenantOwner1, tenant1, tempUser);

        // Expect 7 users
        await TenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 7));

        // Adding tenant user again should not give any problems any longer (as it does an upsert)
        await TenantService.setTenantUser(tenantOwner1, tenant1, tempUser);

        // Expect still 7 users
        await TenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 7));

        // New user is allowed to fetch the user list of the tenant... Are they?
        await TenantService.getTenantUsers(tempUser, tenant1, 401, 'Getting users if not logged in should return a 401');
        await tempUser.login();
        // ... well i guess only if they are logged in...
        await TenantService.getTenantUsers(tempUser, tenant1).then(users => checkUserCount(users, 7));


        // Should be possible to add a new tenant user
        await TenantService.removeTenantUser(tenantOwner1, tenant1, tempUser);

        // Expecting original 6 users
        await TenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 6));
    }

    async tryChangeOwnership() {
        const tempOwner = new TenantOwner('tempOwner');
        await TenantService.setTenantUser(tenantOwner1, tenant1, tempOwner);
        // Adding tenant owner twice should not give any different results.
        await TenantService.setTenantUser(tenantOwner1, tenant1, tempOwner);

        // Check the list of tenant owners
        await TenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            const expectedOwnerIDs = tenant1.getOwners().concat([tempOwner]).map(o => o.userId);
            if (!Comparison.sameJSON(owners, expectedOwnerIDs)) {
                throw new Error('List of tenant owners does not match. Received ' + JSON.stringify(owners));
            }
        });

        // Remove the user as tenant owner
        tempOwner.isOwner = false
        await TenantService.setTenantUser(tenantOwner1, tenant1, tempOwner);

        // List of tenant owners should be the original one again
        await TenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            const expectedOwnerIDs = tenant1.getOwners().map(o => o.userId);
            if (!Comparison.sameJSON(owners, expectedOwnerIDs)) {
                throw new Error('List of tenant owners does not match. Received ' + JSON.stringify(owners));
            }
        });
    }

    async tryDisableEnableTenants() {
        // Tenant owner 1 may not disable the tenant
        await PlatformService.disableTenant(tenantOwner1, tenant1, 401, 'Tenant owner 1 should not be allowed to disable the tenant');

        // But the platform admin is allowed to
        await PlatformService.disableTenant(platformAdmin, tenant1);

        // And the platform admin is allowed to enable it as well
        await PlatformService.enableTenant(platformAdmin, tenant1);

        // And the platform admin is not allowed to enable/disable a non-existing tenant
        const nonExistingTenant = new Tenant("not-created", [tenantOwner1]);
        await PlatformService.enableTenant(platformAdmin, nonExistingTenant, 400, 'The platform admin should not be allowed to enable a non-existing tenant');

        await PlatformService.disableTenant(platformAdmin, nonExistingTenant, 400, 'The platform admin should not be allowed to disable a non-existing tenant');
    }

    async tryDisableEnableUserAccounts() {
        // Now disable and enable account of a tenant owner.
        tenantOwner2.enabled = false;
        await TenantService.setTenantUser(tenantOwner1, tenant1, tenantOwner2);

        // Owner 2 should no longer be in the list of owners, as the account is disabled
        await TenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            console.log(JSON.stringify(owners));
            if (owners.find((owner: string) => owner === tenantOwner2.id)) {
                throw new Error('The account for owner-2 has been disabled and should not appear in this list');
            };
        });

        // There should be one less tenant user
        await TenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 6));
        // There should be 1 disabled user account
        await TenantService.getDisabledUserAccounts(tenantOwner1, tenant1).then(users => checkUserCount(users, 1));
        // Not allowed to get a disabled user account
        await TenantService.getTenantUser(tenantOwner1, tenant1, tenantOwner2.id, 404, 'It should not be allowed to get a disabled user account');

        // Enable the user account again and validate that the user can be retrieved again.
        tenantOwner2.enabled = true;
        await TenantService.setTenantUser(tenantOwner1, tenant1, tenantOwner2)
        await TenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 7));
        await TenantService.getTenantUser(tenantOwner1, tenant1, tenantOwner2.id);

        await TenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            console.log(JSON.stringify(owners));
            if (!owners.find((owner: string) => owner === tenantOwner2.id)) {
                throw new Error('The account for owner-2 is enabled again and should appear in this list');
            };
        });
    }

    async tryChangeUserRoles() {
        const userRoles = ['role-x', 'role-y'];
        const roleChangingUser = new TenantUser('roleChangingUser', [...userRoles], 'user-with-or-without-roles');
        await TenantService.setTenantUser(tenantOwner1, tenant1, roleChangingUser);

        const assertUserRoles = (user: TenantUser, expectedRoles: string[]) => {
            // console.log('Comparing user roles:\nexpected: ' + expectedRoles + '\n   found: ' + user.roles);
            if (!Comparison.sameArray(user.roles, expectedRoles)) {
                throw new Error('Expected user to have roles ' + expectedRoles + ', but found ' + user.roles);
            }
        }

        await TenantService.getTenantUser(tenantOwner1, tenant1, roleChangingUser).then(user => assertUserRoles(user, userRoles));

        const roleToRemove = userRoles[0]; // 'role-x'
        const expectedNewRoles = userRoles.slice(1); // ['role-y']
        roleChangingUser.roles = expectedNewRoles;

        await TenantService.setTenantUser(tenantOwner1, tenant1, roleChangingUser);
        // Check the result for both getTenantUser and getTenantUsers.
        await TenantService.getTenantUser(tenantOwner1, tenant1, roleChangingUser.userId).then(user => assertUserRoles(user, expectedNewRoles))
        await TenantService.getTenantUsers(tenantOwner1, tenant1)
            .then(users => users.find((user: TenantUser) => user.userId === roleChangingUser.userId))
            .then(user => assertUserRoles(user, expectedNewRoles));

        // Restore role-x and check it
        roleChangingUser.roles.push(roleToRemove);
        await TenantService.setTenantUser(tenantOwner1, tenant1, roleChangingUser);
        await TenantService.getTenantUser(tenantOwner1, tenant1, roleChangingUser).then(user => assertUserRoles(user, userRoles));
        await TenantService.getTenantUsers(tenantOwner1, tenant1)
            .then(users => users.find((user: TenantUser) => user.userId === roleChangingUser.userId))
            .then(user => assertUserRoles(user, userRoles));

    }

    async tryChangeUserProperties() {
        const originalName = 'OriginalName';
        const originalEmail = 'OriginalEmail';

        const propertiesChecker = (user: TenantUser, expectedName: string, expectedEmail: string) => {
            if (user.name !== expectedName) {
                throw new Error('Expected user to have name ' + expectedName + ', but found ' + user.name);
            }
            if (user.email !== expectedEmail) {
                throw new Error('Expected user to have email ' + expectedEmail + ', but found ' + user.email);
            }
        }

        const propertiesChangingUser = new TenantUser('propertiesChangingUser', [], originalName, originalEmail);
        await TenantService.setTenantUser(tenantOwner1, tenant1, propertiesChangingUser);
        await TenantService.getTenantUser(tenantOwner1, tenant1, propertiesChangingUser).then(user => propertiesChecker(user, originalName, originalEmail));


        const newName = "NewName";
        propertiesChangingUser.name = newName;
        await TenantService.setTenantUser(tenantOwner1, tenant1, propertiesChangingUser);
        await TenantService.getTenantUser(tenantOwner1, tenant1, propertiesChangingUser).then(user => propertiesChecker(user, newName, originalEmail));

        const newEmail = "not really an email address, but that should be allowed";
        propertiesChangingUser.email = newEmail;
        await TenantService.setTenantUser(tenantOwner1, tenant1, propertiesChangingUser);
        await TenantService.getTenantUser(tenantOwner1, tenant1, propertiesChangingUser).then(user => propertiesChecker(user, newName, newEmail));
    }

    async tryReplaceTenant() {
        const updatedTenantOwner1 = new TenantOwner('tenant-owner1', ['owner-role-1']);
        const updatedTenantUser1 = new TenantUser('tenant-user-1', ['role-1']);
        const duplicateTenantUser = Object.assign({ ...updatedTenantUser1, isOwner: true, roles: ['role2'] })

        const noList: Array<TenantUser> = [];
        const noOwnerList = [updatedTenantUser1];
        const duplicateUsersList = [updatedTenantOwner1, updatedTenantUser1, duplicateTenantUser, tenantUser1, tenantOwner3, tenantUser1, tenantOwner3];
        const newUserList = [updatedTenantOwner1, updatedTenantUser1];

        // It should not be possible to replace the tenant without giving new owner information
        await TenantService.replaceTenant(tenantOwner1, new Tenant(tenantName, noList), 400, 'It should not be possible to replace the tenant without setting users');
        await TenantService.replaceTenant(tenantOwner1, new Tenant(tenantName, noOwnerList), 400, 'It should not be possible to replace the tenant without setting new owners');
        await TenantService.replaceTenant(tenantOwner1, new Tenant(tenantName, duplicateUsersList), 400, 'It should not be possible to replace the tenant with duplicate user ids');
        await TenantService.replaceTenant(tenantOwner1, new Tenant(tenantName, newUserList));

        await TenantService.getTenantUsers(tenantOwner1, tenant1).then((users: Array<TenantUser>) => {
            // Since user2 account is disabled, there should only be 7 users left
            if (users.length !== 2) {
                throw new Error(`Expected to find only 2 users in the tenant, but found ${users.length} instead`);
            }

            const userValidator = (user: TenantUser) => {
                const foundUser = users.find(u => u.userId === user.userId);
                if (!foundUser) {
                    throw new Error(`Missing user ${user.userId} in updated user list`);
                };
                if (foundUser.isOwner !== user.isOwner) {
                    throw new Error(`Expected user ${user.userId} to have ownership == ${user.isOwner}`);
                }
                if (foundUser.roles.length !== user.roles.length) {
                    throw new Error(`Mismatch in roles of user ${user.userId}, found ${foundUser.roles.length} and expected ${user.roles.length}`);
                };
                user.roles.forEach(expectedRole => {
                    if (!foundUser.roles.find(role => role === expectedRole)) {
                        throw new Error(`Mismatch in roles of user ${user.userId}, could not find role ${expectedRole} (roles found: ${foundUser.roles}`);
                    }
                });
            };
            userValidator(updatedTenantOwner1);
            userValidator(updatedTenantUser1);
        });

        await TenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            console.log(JSON.stringify(owners));
            if (owners.find((owner: string) => owner === tenantOwner3.id)) {
                throw new Error('Owner 3 should have been updated to no longer be an owner, but still is');
            };
        });

        // It should not be possible to remove the last owner
        const owner1 = Object.assign({ ...tenantOwner1, enabled: false });
        await TenantService.setTenantUser(tenantOwner1, tenant1, owner1, 400, 'It should not be possible to remove the last owner');

        // Restore the original tenant in one shot.
        await TenantService.replaceTenant(tenantOwner1, tenant1);
        await TenantService.getTenantUsers(tenantOwner1, tenant1).then((users: Array<TenantUser>) => {
            // We should be back at the original 6 users.
            if (users.length !== 6) {
                throw new Error(`Expected to find 6 users in the tenant, but found ${users.length} instead`);
            }
        });
    }

    async tryReplaceTenantUser() {
        // Pick an arbitrary user to play with
        const userId = tenantOwner2.id;
        const userToPlayWith = await TenantService.getTenantUser(tenantOwner1, tenant1, userId);

        userToPlayWith.name = 'xyz';
        await TenantService.setTenantUser(tenantOwner1, tenant1, userToPlayWith);
        await TenantService.getTenantUser(tenantOwner1, tenant1, userId).then(user => {
            if (user.name !== userToPlayWith.name) {
                throw new Error(`Expected name of user to be '${userToPlayWith.name}' but found '${user.name}'`);
            }
        });

        await TenantService.setTenantUser(tenantOwner1, tenant1, new TenantUser(userId));
        await TenantService.getTenantUser(tenantOwner1, tenant1, userId).then(user => {
            console.log("User: " + JSON.stringify(user, undefined, 2));
            if (user.name) {
                throw new Error(`Expected name of user to be empty, but found '${user.name}'`);
            }
            if (user.roles.length) {
                throw new Error(`Expected roles of user to be empty, but found '${user.roles}'`);
            }
            if (user.email) {
                throw new Error(`Expected email of user to be empty, but found '${user.email}'`);
            }
            if (user.isOwner) {
                throw new Error(`Expected user not to be an owner, but found '${user.isOwner}'`);
            }
            if (!user.enabled) {
                throw new Error(`Expected user-account to be enabled, but it is '${user.enabled}'`);
            }
        });

        // Remove all owners but ourselves, and then try to remove ourselves.
        const ownerList = await TenantService.getTenantOwners(tenantOwner1, tenant1);
        for (let i = 0; i < ownerList.length; i++) {
            const userId = ownerList[i];
            if (userId !== tenantOwner1.id) {
                const replaceTheOwner = new TenantUser(userId);
                replaceTheOwner.enabled = false;
                await TenantService.setTenantUser(tenantOwner1, tenant1, replaceTheOwner);
            }
        }

        // Now let's try to remove ourselves by both replace and update. 
        //  It should fail, both to remove ownership and to disable the account (and the combination).
        tenantOwner1.isOwner = false;
        await TenantService.setTenantUser(tenantOwner1, tenant1, tenantOwner1, 400);

        tenantOwner1.isOwner = true;
        tenantOwner1.enabled = false;
        await TenantService.setTenantUser(tenantOwner1, tenant1, tenantOwner1, 400);

        tenantOwner1.isOwner = false;
        tenantOwner1.enabled = false;
        await TenantService.setTenantUser(tenantOwner1, tenant1, tenantOwner1, 400);

        // Replacing a non-existing user should fail, whereas "updating" is actually an upsert.
        const notExistingUser = new TenantUser(`I-don't-think-so-i-don't-exist`)
        await TenantService.setTenantUser(tenantOwner1, tenant1, notExistingUser);
        await TenantService.getTenantUser(tenantOwner1, tenant1, notExistingUser.id).then(user => {
            console.log(`Better start thinking then, dear ${user.userId}`);
        });

        // Restore the original tenant in one shot.
        //  Don't forget to firsts restore our local tenantOwner1 copy
        tenantOwner1.isOwner = true;
        tenantOwner1.enabled = true;
        await TenantService.replaceTenant(tenantOwner1, tenant1);
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