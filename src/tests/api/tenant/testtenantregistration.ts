import User from "../../../framework/user";
import TenantService from "../../../framework/service/tenant/tenantservice";
import Tenant from "../../../framework/tenant/tenant";
import TenantUser, { TenantOwner, UpsertableTenantUser } from "../../../framework/tenant/tenantuser";
import TestCase from "../../../framework/test/testcase";
import Comparison from "../../../framework/test/comparison";
import PlatformService from "../../../framework/service/platform/platformservice";

const platformAdmin = new User('admin');

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


export default class TestTenantRegistration extends TestCase {
    /**
     * @override
     */
    async run() {
        await this.tryCreateTenant();

        await this.tryCreateTenantUser();

        await this.tryChangeOwnership();

        await this.tryDisableEnableTenants();

        await this.tryDisableEnableUserAccounts();

        await this.tryChangeUserRoles();

        await this.tryChangeUserName();

        await this.tryChangeUserEmail();

        await this.newTenantOwnerMustBeRegisteredFirst();

        await this.tryUpdateTenant();

        await this.tryFailingCallsToUpdateTenant();

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
        if (!tenantOwner1.userInformation?.tenants.find(tenant => tenant.tenant === tenantName)) {
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

    async tryCreateTenantUser() {
        // Not allowed to get a non-existing user
        await TenantService.getTenantUser(tenantOwner1, tenant1, "not a tenant user at all", 404, 'A non-existing user should return 404 NotFound');

        // Should be possible to add a new tenant user
        await TenantService.addTenantUser(tenantOwner1, tenant1, user4);

        // Expect 7 users
        await TenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 7));

        // Adding tenant user again should not give any problems any longer (as it does an upsert)
        await TenantService.addTenantUser(tenantOwner1, tenant1, user4);

        // Expect still 7 users
        await TenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 7));

        // New user is allowed to fetch the user list of the tenant... Are they?
        await TenantService.getTenantUsers(user4, tenant1, 401, 'Getting users if not logged in should return a 401');
        await user4.login();
        // ... well i guess only if they are logged in...
        await TenantService.getTenantUsers(user4, tenant1).then(users => checkUserCount(users, 7));
    }

    async tryChangeOwnership() {
        // Make user4 a tenant owner
        await TenantService.addTenantOwner(tenantOwner1, tenant1, user4.userId);
        // Adding tenant owner twice should not give any different results.
        await TenantService.addTenantOwner(tenantOwner1, tenant1, user4.userId);

        // Check the list of tenant owners
        await TenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            const expectedOwnerIDs = tenant1.getOwners().concat([user4]).map(o => o.userId);
            if (!Comparison.sameJSON(owners, expectedOwnerIDs)) {
                throw new Error('List of tenant owners does not match. Received ' + JSON.stringify(owners));
            }
        });

        // Remove the user as tenant owner
        await TenantService.removeTenantOwner(tenantOwner1, tenant1, user4.userId);

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
        await TenantService.disableTenantUser(tenantOwner1, tenant1, tenantOwner2.id);

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
        await TenantService.enableTenantUser(tenantOwner1, tenant1, tenantOwner2.id)
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
        await TenantService.getTenantUser(tenantOwner1, tenant1, user4.userId).then(user => {
            if (!Comparison.sameArray(user.roles, user4TenantRoles)) {
                throw new Error('Expected user 4 to have roles ' + user4TenantRoles + ', but found ' + user.roles);
            }
            // console.log('User 4 has roles ' + user.roles);
        });

        const roleToRemove = user4TenantRoles[0];
        const expectedNewRoles = user4TenantRoles.slice(1);

        await TenantService.removeTenantUserRole(tenantOwner1, tenant1, user4.userId, roleToRemove);

        await TenantService.getTenantUser(tenantOwner1, tenant1, user4.userId).then(user => {
            if (!Comparison.sameArray(user.roles, expectedNewRoles)) {
                throw new Error('Expected user 4 to have roles ' + expectedNewRoles + ', but found ' + user.roles);
            }
            // console.log('User 4 has roles ' + user.roles);
        });

        // Now also check the same for getTenantUsers.
        await TenantService.getTenantUsers(tenantOwner1, tenant1)
            .then(users => users.find((user: TenantUser) => user.userId === user4.userId))
            .then(user => {
                if (!Comparison.sameArray(user.roles, expectedNewRoles)) {
                    throw new Error('Expected user 4 to have roles ' + expectedNewRoles + ', but found ' + user.roles);
                }
        });
    }

    async tryChangeUserName() {
        const newName = "User4 is now called User-ABC"
        const user4WithNewName = Object.assign({
            ...user4,
            name: newName
        })
        await TenantService.updateTenantUser(tenantOwner1, tenant1, user4WithNewName);

        await TenantService.getTenantUser(tenantOwner1, tenant1, user4.userId).then(user => {
            if (user.name !== newName) {
                throw new Error('Expected user 4 to have new name ' + newName + ', but found ' + user.name);
            }
        });
    }

    async tryChangeUserEmail() {
        const newEmail = "not really an email address, but that should be allowed"
        const user4WithNewEmail = Object.assign({
            ...user4,
            email: newEmail
        })
        await TenantService.updateTenantUser(tenantOwner1, tenant1, user4WithNewEmail);

        await TenantService.getTenantUser(tenantOwner1, tenant1, user4.userId).then(user => {
            if (user.email !== newEmail) {
                throw new Error(`Expected user 4 to have new email '${newEmail}', but found '${user.email}'`);
            }
        });
    }

    async newTenantOwnerMustBeRegisteredFirst() {
        const nextOwnerId = 'next-owner';
        const nextTenantUser = new TenantUser(nextOwnerId, []);

        // Register the tenant user
        await TenantService.addTenantUser(tenantOwner1, tenant1, nextTenantUser);

        // Adding the user as an owner now should succeed.
        await TenantService.addTenantOwner(tenantOwner1, tenant1, nextOwnerId);

        // The new user should also have become an owner
        await TenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            if (!owners.find((owner: string) => owner === nextOwnerId)) {
                throw new Error(`Expected user ${nextOwnerId} to have become a tenant owner`);
            };
        });

        // And the new user count now is 8
        await TenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 8));

        // Adding a user directly as owner should also succeed.
        await TenantService.addTenantOwner(tenantOwner1, tenant1, 'dummy-user-id');

        // And the new user count now is 9
        await TenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 9));

        // Disable the account again
        await TenantService.disableTenantUser(tenantOwner1, tenant1, 'dummy-user-id');

        // And the new user count now is 8
        await TenantService.getTenantUsers(tenantOwner1, tenant1).then(users => checkUserCount(users, 8));
    }

    async tryUpdateTenant() {
        const updatedTenantOwner1 = new TenantOwner('tenant-owner1', ['owner-role-1']);
        const updatedTenantOwner2 = new TenantOwner('tenant-owner2', ['owner-role-2']);
        const updatedTenantOwner3 = new TenantUser('tenant-owner3', ['role-3']);

        const updatedTenantUser1 = new TenantUser('tenant-user-1', ['role-1']);
        const updatedTenantUser2 = new TenantUser('tenant-user-2', ['role-2']);
        // Disable the user2 account
        updatedTenantUser2.enabled = false;

        const updatedUserList = [updatedTenantOwner1, updatedTenantOwner2, updatedTenantOwner3, updatedTenantUser1, updatedTenantUser2];

        await TenantService.updateTenantUsers(tenantOwner1, tenant1, updatedUserList);

        await TenantService.getTenantUsers(tenantOwner1, tenant1).then((users: Array<TenantUser>) => {
            // Since user2 account is disabled, there should only be 7 users left

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
            userValidator(updatedTenantOwner2);
            userValidator(updatedTenantOwner3);
            userValidator(updatedTenantUser1);
            // Since not updated, the original tenant user3 should still be the same
            userValidator(tenantUser3);
        });

        await TenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            console.log(JSON.stringify(owners));
            if (owners.find((owner: string) => owner === tenantOwner3.id)) {
                throw new Error('Owner 3 should have been updated to no longer be an owner, but still is');
            };
        });
    }

    async tryFailingCallsToUpdateTenant() {
        // Actually, trying with an empty user list should succeed, but without any changes
        await TenantService.updateTenantUsers(tenantOwner1, tenant1, []);

        // Get all owners and make the plain users -> should not be allowed
        const initialOwners: Array<TenantUser> = [];
        await TenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            owners.forEach((owner:string) => initialOwners.push(new TenantUser(owner)));
        });
        await TenantService.updateTenantUsers(tenantOwner1, tenant1, initialOwners, 400, 'Making all tenant owners plain tenant users should not be allowed');

        // Now make the owners again, but disable their accounts; should also not be allowed
        initialOwners.forEach(user => {
            user.isOwner = true;
            user.enabled = false;
        });
        await TenantService.updateTenantUsers(tenantOwner1, tenant1, initialOwners, 400, 'Disabling all tenant owner accounts should not be allowed');

        // Now try to individually disable all owner accounts; should fail only for the last one.
        //  Note: we're doing it with the last owner ;)
        const lastTenantOwner = initialOwners[initialOwners.length - 1];
        await lastTenantOwner.login();
        for (let i = 0; i<initialOwners.length; i++) {
            const owner = initialOwners[i];
            if (owner !== lastTenantOwner) {
                await TenantService.updateTenantUser(lastTenantOwner, tenant1, owner);
            } else {
                await TenantService.updateTenantUser(lastTenantOwner, tenant1, owner, 400, 'Disabling last active tenant owner account should not be allowed');
            }
        }

        // Now restore the initial owners one by one again.
        for (let i = 0; i<initialOwners.length - 1; i++) {
            const user = initialOwners[i];
            user.enabled = true;
            await TenantService.updateTenantUser(lastTenantOwner, tenant1, user);
        }

        await TenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            console.log(`Expecting to find owners ${initialOwners.map(o => o.userId)} and found: ${owners}`);
            if (owners.length !== initialOwners.length) {
                throw new Error(`Expecting to find owners ${initialOwners.map(o => o.userId)} but found: ${owners}`);
            }
        });
    }

    async tryReplaceTenant() {
        const updatedTenantOwner1 = new TenantOwner('tenant-owner1', ['owner-role-1']);
        const updatedTenantUser1 = new TenantUser('tenant-user-1', ['role-1']);

        const noList: Array<TenantUser> = [];
        const noOwnerList = [updatedTenantUser1];
        const newUserList = [updatedTenantOwner1, updatedTenantUser1];

        // It should not be possible to replace the tenant without giving new owner information
        await TenantService.replaceTenant(tenantOwner1, new Tenant(tenantName, noList), 400, 'It should not be possible to replace the tenant without setting users');
        await TenantService.replaceTenant(tenantOwner1, new Tenant(tenantName, noOwnerList), 400, 'It should not be possible to replace the tenant without setting new owners');
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
        await TenantService.disableTenantUser(tenantOwner1, tenant1, tenantOwner1.id, 400, 'It should not be possible to remove the last owner');

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
        await TenantService.replaceTenantUser(tenantOwner1, tenant1, userToPlayWith);
        await TenantService.getTenantUser(tenantOwner1, tenant1, userId).then(user => {
            if (user.name !== userToPlayWith.name) {
                throw new Error(`Expected name of user to be '${userToPlayWith.name}' but found '${user.name}'`);
            }
        });

        await TenantService.replaceTenantUser(tenantOwner1, tenant1, new UpsertableTenantUser(userId));
        await TenantService.getTenantUser(tenantOwner1, tenant1, userId).then(user => {
            console.log("User: " + JSON.stringify(user, undefined, 2));
            if (user.name) {
                throw new Error(`Expected name of user to be empty, but found '${user.name}'`);
            }
            if (user.roles.lenght) {
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
        for (let i = 0; i<ownerList.length; i++) {
            const userId = ownerList[i];
            if (userId !== tenantOwner1.id) {

                const replaceTheOwner = new UpsertableTenantUser(userId);
                replaceTheOwner.enabled = false;
                await TenantService.replaceTenantUser(tenantOwner1, tenant1, replaceTheOwner);
            }
        }

        // Now let's try to remove ourselves by both replace and update. 
        //  It should fail, both to remove ownership and to disable the account (and the combination).
        tenantOwner1.isOwner = false;
        await TenantService.replaceTenantUser(tenantOwner1, tenant1, tenantOwner1, 400);
        await TenantService.updateTenantUser(tenantOwner1, tenant1, tenantOwner1, 400);

        tenantOwner1.isOwner = true;
        tenantOwner1.enabled = false;
        await TenantService.replaceTenantUser(tenantOwner1, tenant1, tenantOwner1, 400);
        await TenantService.updateTenantUser(tenantOwner1, tenant1, tenantOwner1, 400);

        tenantOwner1.isOwner = false;
        tenantOwner1.enabled = false;
        await TenantService.replaceTenantUser(tenantOwner1, tenant1, tenantOwner1, 400);
        await TenantService.updateTenantUser(tenantOwner1, tenant1, tenantOwner1, 400);

        // Replacing a non-existing user should fail, whereas "updating" is actually an upsert.
        const notExistingUser = new UpsertableTenantUser(`I-don't-think-so-i-don't-exist`)
        await TenantService.replaceTenantUser(tenantOwner1, tenant1, notExistingUser, 400, 'Replacing a non-existing user should fail');
        await TenantService.updateTenantUser(tenantOwner1, tenant1, notExistingUser);
        await TenantService.getTenantUser(tenantOwner1, tenant1, notExistingUser.id).then(user => {
            console.log(`Better start thinking then, dear ${user.userId}`);
        });

        // Restore the original tenant in one shot.
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