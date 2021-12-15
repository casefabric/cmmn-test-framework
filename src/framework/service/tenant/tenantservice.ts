import User from '../../user';
import CafienneService from '../cafienneservice';
import Tenant from '../../tenant/tenant';
import TenantUser from '../../tenant/tenantuser';
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
    static async getTenantUser(user: User, tenant: Tenant | string, tenantUserId: TenantUser | string, expectedStatusCode: number = 200,  msg = `GetTenantUser(${tenantUserId}) is not expected to succeed for user ${user} in tenant ${tenant}`) {
        const response = await CafienneService.get(`/tenant/${tenant}/users/${tenantUserId}`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, TenantUser);
    }

    /**
     * Adds or replaces the tenant user 
     * @param user Must be a tenant owner
     * @param tenant 
     * @param newTenantUser 
     * @param expectedStatusCode 
     */
    static async setTenantUser(user: User, tenant: Tenant | string, newTenantUser: TenantUser, expectedStatusCode: number = 204,  msg = `SetTenantUser is not expected to succeed for user ${user} in tenant ${tenant}`) {
        const userToSet = newTenantUser.toJson ? newTenantUser.toJson() : newTenantUser;
        const response = await CafienneService.post(`/tenant/${tenant}/users`, user, userToSet);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Remove the user from the tenant 
     * @param user Must be a tenant owner
     * @param tenant 
     * @param newTenantUser 
     * @param expectedStatusCode 
     */
     static async removeTenantUser(user: User, tenant: Tenant | string, tenantUser: TenantUser | string, expectedStatusCode: number = 204,  msg = `RemoveTenantUser is not expected to succeed for user ${user} in tenant ${tenant}`) {
        const response = await CafienneService.delete(`/tenant/${tenant}/users/${tenantUser}`, user);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Replaces the tenant users (in one API call, bulk replace)
     * @param user
     * @param tenant 
     * @param expectedStatusCode 
     */
    static async replaceTenant(user: User, tenant: Tenant, expectedStatusCode: number = 204,  msg = `ReplaceTenant is not expected to succeed for user ${user} in tenant ${tenant}`) {
        const response = await CafienneService.post(`/tenant/${tenant}`, user, tenant.toJson());
        return checkResponse(response, msg, expectedStatusCode);
    }
}
