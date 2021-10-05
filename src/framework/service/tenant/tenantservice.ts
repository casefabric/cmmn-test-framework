import User from '../../user';
import CafienneService from '../cafienneservice';
import Tenant from '../../tenant/tenant';
import TenantUser, { UpsertableTenantUser } from '../../tenant/tenantuser';
import { checkResponse, checkJSONResponse } from '../response';


/**
 * Connection to the /tenant APIs of Cafienne
 */
export default class TenantService {
    /**
     * Return a list of the current owners of the tenant. Can only be invoked by users that are owner of the tenant.
     * @param user Must be a tenant owner
     * @param tenant 
     * @param expectedStatusCode 
     */
    static async getTenantOwners(user: User, tenant: Tenant | string, expectedStatusCode: number = 200,  msg = `GetTenantOwners is not expected to succeed for user ${user} in tenant ${tenant}`) {
        const response = await CafienneService.get(`/tenant/${tenant}/owners`, user);
        return checkJSONResponse(response, msg, expectedStatusCode);
    }

    /**
     * Add a tenant owner.
     * @param user Must be a tenant owner
     * @param tenant 
     * @param newOwner User id of the owner to be added
     * @param expectedStatusCode 
     */
    static async addTenantOwner(user: User, tenant: Tenant | string, newOwner: string, expectedStatusCode: number = 204) {
        const upsertUser = new UpsertableTenantUser(newOwner);
        upsertUser.isOwner = true;
        return this.updateTenantUser(user, tenant, upsertUser, expectedStatusCode);
    }

    /**
     * Remove the tenant owner.
     * @param user Must be a tenant owner
     * @param tenant 
     * @param formerOwner User id of the owner to be removed
     * @param expectedStatusCode 
     */
    static async removeTenantOwner(user: User, tenant: Tenant | string, formerOwner: string, expectedStatusCode: number = 204) {
        const upsertUser = new UpsertableTenantUser(formerOwner);
        upsertUser.isOwner = false;
        return this.updateTenantUser(user, tenant, upsertUser, expectedStatusCode);
    }

    /**
     * Returns a list of the tenant users
     * @param user Must be a valid user in the tenant
     * @param tenant 
     * @param expectedStatusCode 
     */
    static async getTenantUsers(user: User, tenant: Tenant | string, expectedStatusCode: number = 200,  msg = `GetTenantUsers is not expected to succeed for user ${user} in tenant ${tenant}`) {
        const response = await CafienneService.get(`/tenant/${tenant}/users`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, [TenantUser]);
    }

    /**
     * Returns a list of the tenant users
     * @param user Must be a valid user in the tenant
     * @param tenant 
     * @param expectedStatusCode 
     */
    static async getDisabledUserAccounts(user: User, tenant: Tenant | string, expectedStatusCode: number = 200,  msg = `GettingDisabledAccounts is not expected to succeed for user ${user} in tenant ${tenant}`) {
        const response = await CafienneService.get(`/tenant/${tenant}/disabled-accounts`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, [TenantUser]);
    }

    /**
     * Retrieve information about a specific tenant user
     * @param user Must be a tenant user
     * @param tenant 
     * @param tenantUserId 
     * @param expectedStatusCode 
     */
    static async getTenantUser(user: User, tenant: Tenant | string, tenantUserId: string, expectedStatusCode: number = 200,  msg = `GetTenantUser(${tenantUserId}) is not expected to succeed for user ${user} in tenant ${tenant}`) {
        const response = await CafienneService.get(`/tenant/${tenant}/users/${tenantUserId}`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, TenantUser);
    }

    /**
     * Add a user to the tenant
     * @param user Must be a tenant owner
     * @param tenant 
     * @param newTenantUser 
     * @param expectedStatusCode 
     */
    static async addTenantUser(user: User, tenant: Tenant | string, newTenantUser: TenantUser, expectedStatusCode: number = 204) {
        return this.updateTenantUser(user, tenant, newTenantUser, expectedStatusCode);
    }

    /**
     * Update a tenant user 
     * @param user Must be a tenant owner
     * @param tenant 
     * @param newTenantUser 
     * @param expectedStatusCode 
     */
    static async updateTenantUser(user: User, tenant: Tenant | string, newTenantUser: UpsertableTenantUser, expectedStatusCode: number = 204,  msg = `UpdateTenantUser is not expected to succeed for user ${user} in tenant ${tenant}`) {
        const response = await CafienneService.put(`/tenant/${tenant}/users`, user, newTenantUser);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Replace roles, name, email address, ownership and account-enabled of a tenant user 
     * @param user Must be a tenant owner
     * @param tenant 
     * @param newTenantUser 
     * @param expectedStatusCode 
     */
    static async replaceTenantUser(user: User, tenant: Tenant | string, newTenantUser: UpsertableTenantUser, expectedStatusCode: number = 204,  msg = `ReplaceTenantUser is not expected to succeed for user ${user} in tenant ${tenant}`) {
        const response = await CafienneService.post(`/tenant/${tenant}/users`, user, newTenantUser);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Updates the list of tenant users (in one API call, bulk update)
     * @param user
     * @param tenant 
     * @param usersToUpdate 
     * @param expectedStatusCode 
     */
    static async updateTenantUsers(user: User, tenant: Tenant | string, usersToUpdate: Array<TenantUser>, expectedStatusCode: number = 204,  msg = `UpdateTenant is not expected to succeed for user ${user} in tenant ${tenant}`) {
        const response = await CafienneService.put(`/tenant/${tenant}`, user, { users: usersToUpdate });
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Replaces the tenant users (in one API call, bulk replace)
     * @param user
     * @param tenant 
     * @param expectedStatusCode 
     */
    static async replaceTenant(user: User, tenant: Tenant, expectedStatusCode: number = 204,  msg = `ReplaceTenant is not expected to succeed for user ${user} in tenant ${tenant}`) {
        const response = await CafienneService.post(`/tenant/${tenant}`, user, tenant);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Disable the tenant user
     * @param user Must be a tenant owner
     * @param tenant 
     * @param tenantUserId Id of the user to be disabled
     * @param expectedStatusCode 
     */
    static async disableTenantUser(user: User, tenant: Tenant | string, tenantUserId: string, expectedStatusCode: number = 204, msg?: string) {
        const upsertUser = new UpsertableTenantUser(tenantUserId);
        upsertUser.enabled = false;
        return this.updateTenantUser(user, tenant, upsertUser, expectedStatusCode, msg);
    }

    /**
     * Enable the tenant user (e.g., after it has been disabled)
     * @param user Must be a tenant owner
     * @param tenant 
     * @param tenantUserId 
     * @param expectedStatusCode 
     */
    static async enableTenantUser(user: User, tenant: Tenant | string, tenantUserId: string, expectedStatusCode: number = 204, msg?: string) {
        const upsertUser = new UpsertableTenantUser(tenantUserId);
        upsertUser.enabled = true;
        return this.updateTenantUser(user, tenant, upsertUser, expectedStatusCode, msg);
    }

    /**
     * Add a role to the tenant user with the specified id.
     * @param user Must be a tenant owner
     * @param tenant 
     * @param tenantUserId User to which the role will be added
     * @param newRole Name of the new role
     * @param expectedStatusCode 
     */
    static async addTenantUserRole(user: User, tenant: Tenant | string, tenantUserId: string, newRole: string, expectedStatusCode: number = 204,  msg = `Adding role ${newRole} to user ${tenantUserId} is not expected to succeed for user ${user} in tenant ${tenant}`) {
        const response = await CafienneService.put(`/tenant/${tenant}/users/${tenantUserId}/roles/${newRole}`, user);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Remove a role from the tenant user with the specified id.
     * @param user Must be a tenant owner
     * @param tenant 
     * @param tenantUserId User to which the role will be added
     * @param formerRole Name of the role to be removed
     * @param expectedStatusCode 
     */
    static async removeTenantUserRole(user: User, tenant: Tenant | string, tenantUserId: string, formerRole: string, expectedStatusCode: number = 204,  msg = `Removing role ${formerRole} from user ${tenantUserId} is not expected to succeed for user ${user} in tenant ${tenant}`) {
        const response = await CafienneService.delete(`/tenant/${tenant}/users/${tenantUserId}/roles/${formerRole}`, user);
        return checkResponse(response, msg, expectedStatusCode);
    }
}
