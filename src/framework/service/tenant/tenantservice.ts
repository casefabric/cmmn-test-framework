import User from '../../user';
import CafienneService from '../cafienneservice';
import Tenant from '../../tenant/tenant';
import UserInformation from '../../tenant/userinformation';
import Config from '../../../config';
import TenantUser from '../../tenant/tenantuser';
import { checkResponse, checkJSONResponse } from '../response';


/**
 * Connection to the /registration APIs of Cafienne
 */
export default class TenantService {
    cafienneService = new CafienneService();

    /**
     * Return a list of the current owners of the tenant. Can only be invoked by users that are owner of the tenant.
     * @param user Must be a tenant owner
     * @param tenant 
     * @param expectedStatusCode 
     */
    async getTenantOwners(user: User, tenant: Tenant, expectedStatusCode: number = 200) {
        const response = await this.cafienneService.get(`/tenant/${tenant.name}/owners`, user);
        const msg = `GetTenantOwners is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        return checkJSONResponse(response, msg, expectedStatusCode);
    }

    /**
     * Add a tenant owner.
     * @param user Must be a tenant owner
     * @param tenant 
     * @param newOwner User id of the owner to be added
     * @param expectedStatusCode 
     */
    async addTenantOwner(user: User, tenant: Tenant, newOwner: string, expectedStatusCode: number = 204) {
        const response = await this.cafienneService.put(`/tenant/${tenant.name}/owners/${newOwner}`, user);
        return checkResponse(response, `Adding ${newOwner} as owner to tenant ${tenant.name} succeeded unexpectedly`, expectedStatusCode);
    }

    /**
     * Remove the tenant owner.
     * @param user Must be a tenant owner
     * @param tenant 
     * @param formerOwner User id of the owner to be removed
     * @param expectedStatusCode 
     */
    async removeTenantOwner(user: User, tenant: Tenant, formerOwner: string, expectedStatusCode: number = 204) {
        const response = await this.cafienneService.delete(`/tenant/${tenant.name}/owners/${formerOwner}`, user);
        return checkResponse(response, `Removing ${formerOwner} as owner to tenant ${tenant.name} succeeded unexpectedly`, expectedStatusCode);
    }

    /**
     * Returns a list of the tenant users
     * @param user Must be a valid user in the tenant
     * @param tenant 
     * @param expectedStatusCode 
     */
    async getTenantUsers(user: User, tenant: Tenant, expectedStatusCode: number = 200) {
        const response = await this.cafienneService.get(`/tenant/${tenant.name}/users`, user);
        const msg = `GetTenantUsers is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        return checkJSONResponse(response, msg, expectedStatusCode, [TenantUser]);
    }

    /**
     * Returns a list of the tenant users
     * @param user Must be a valid user in the tenant
     * @param tenant 
     * @param expectedStatusCode 
     */
    async getDisabledUserAccounts(user: User, tenant: Tenant, expectedStatusCode: number = 200) {
        const response = await this.cafienneService.get(`/tenant/${tenant.name}/disabled-accounts`, user);
        const msg = `GettingDisabledAccounts is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        return checkJSONResponse(response, msg, expectedStatusCode, [TenantUser]);
    }

    /**
     * Retrieve information about a specific tenant user
     * @param user Must be a tenant user
     * @param tenant 
     * @param tenantUserId 
     * @param expectedStatusCode 
     */
    async getTenantUser(user: User, tenant: Tenant, tenantUserId: string, expectedStatusCode: number = 200) {
        const response = await this.cafienneService.get(`/tenant/${tenant.name}/users/${tenantUserId}`, user);
        const msg = `GetTenantUser(${tenantUserId}) is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        return checkJSONResponse(response, msg, expectedStatusCode, TenantUser);
    }

    /**
     * Add a user to the tenant
     * @param user Must be a tenant owner
     * @param tenant 
     * @param newTenantUser 
     * @param expectedStatusCode 
     */
    async addTenantUser(user: User, tenant: Tenant, newTenantUser: TenantUser, expectedStatusCode: number = 204) {
        return this.updateTenantUser(user, tenant, newTenantUser, expectedStatusCode);
    }

    /**
     * Update a tenant user 
     * @param user Must be a tenant owner
     * @param tenant 
     * @param newTenantUser 
     * @param expectedStatusCode 
     */
    async updateTenantUser(user: User, tenant: Tenant, newTenantUser: TenantUser, expectedStatusCode: number = 204) {
        const response = await this.cafienneService.put(`/tenant/${tenant.name}/users`, user, newTenantUser);
        const msg = `UpdateTenantUser is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Disable the tenant user
     * @param user Must be a tenant owner
     * @param tenant 
     * @param tenantUserId Id of the user to be disabled
     * @param expectedStatusCode 
     */
    async disableTenantUser(user: User, tenant: Tenant, tenantUserId: string, expectedStatusCode: number = 204) {
        const response = await this.cafienneService.put(`/tenant/${tenant.name}/users/${tenantUserId}/disable`, user);
        const msg = `Disable tenant user is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        return checkResponse(response, msg, expectedStatusCode);

    }

    /**
     * Enable the tenant user (e.g., after it has been disabled)
     * @param user Must be a tenant owner
     * @param tenant 
     * @param tenantUserId 
     * @param expectedStatusCode 
     */
    async enableTenantUser(user: User, tenant: Tenant, tenantUserId: string, expectedStatusCode: number = 204) {
        const response = await this.cafienneService.put(`/tenant/${tenant.name}/users/${tenantUserId}/enable`, user);
        const msg = `Enable tenant user is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Add a role to the tenant user with the specified id.
     * @param user Must be a tenant owner
     * @param tenant 
     * @param tenantUserId User to which the role will be added
     * @param newRole Name of the new role
     * @param expectedStatusCode 
     */
    async addTenantUserRole(user: User, tenant: Tenant, tenantUserId: string, newRole: string, expectedStatusCode: number = 204) {
        const response = await this.cafienneService.put(`/tenant/${tenant.name}/users/${tenantUserId}/roles/${newRole}`, user);
        const msg = `Adding role ${newRole} to user ${tenantUserId} is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
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
    async removeTenantUserRole(user: User, tenant: Tenant, tenantUserId: string, formerRole: string, expectedStatusCode: number = 204) {
        const response = await this.cafienneService.delete(`/tenant/${tenant.name}/users/${tenantUserId}/roles/${formerRole}`, user);
        const msg = `Removing role ${formerRole} from user ${tenantUserId} is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        return checkResponse(response, msg, expectedStatusCode);
    }
}
