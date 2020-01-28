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
     * Creates the tenant on behalf of the user. User must be a platform owner.
     * @param user
     * @param tenant 
     * @param expectNoFailures 
     */
    async createTenant(user: User, tenant: Tenant, expectNoFailures = true) {
        const response = await this.cafienneService.post('/registration', user, tenant);
        if (response.status === 400) {
            // Tenant already exists.
            if (Config.CafienneService.log.traffic) console.log('Tenant ' + tenant.name + ' already exists.')
            return response;
        }
        return checkResponse(response, 'CreateTenant is not expected to succeed for user ' + user.id + ' in tenant ' + tenant.name, expectNoFailures);
    }

    /**
     * Disable a tenant.
     * @param user Must be a platform owner
     * @param tenant 
     * @param expectNoFailures 
     */
    async disableTenant(user: User, tenant: Tenant, expectNoFailures = true) {
        const response = await this.cafienneService.put(`/registration/${tenant.name}/disable`, user);
        return checkResponse(response, 'Disabling the tenant ' + tenant.name + ' was not expected to succeed', expectNoFailures);
    }

    /**
     * Enable a tenant.
     * @param user Must be a platform owner
     * @param tenant 
     * @param expectNoFailures 
     */
    async enableTenant(user: User, tenant: Tenant, expectNoFailures = true) {
        const response = await this.cafienneService.put(`/registration/${tenant.name}/enable`, user);
        return checkResponse(response, 'Enabling the tenant ' + tenant.name + ' succeeded unexpectedly', expectNoFailures);
    }

    async getDisabledTenants(user: User, expectNoFailures = true) {
        throw new Error('Not yet implemented in the server side')
    }

    /**
     * Return a list of the current owners of the tenant. Can only be invoked by users that are owner of the tenant.
     * @param user Must be a tenant owner
     * @param tenant 
     * @param expectNoFailures 
     */
    async getTenantOwners(user: User, tenant: Tenant, expectNoFailures = true) {
        const response = await this.cafienneService.get(`/registration/${tenant.name}/owners`, user);
        const msg = `GetTenantOwners is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        return <Promise<Array<TenantUser>>> checkJSONResponse(response, msg, expectNoFailures);
    }

    /**
     * Add a tenant owner.
     * @param user Must be a tenant owner
     * @param tenant 
     * @param newOwner User id of the owner to be added
     * @param expectNoFailures 
     */
    async addTenantOwner(user: User, tenant: Tenant, newOwner: string, expectNoFailures = true) {
        const response = await this.cafienneService.put(`/registration/${tenant.name}/owners/${newOwner}`, user);
        return checkResponse(response, `Adding ${newOwner} as owner to tenant ${tenant.name} succeeded unexpectedly`, expectNoFailures);
    }

    /**
     * Remove the tenant owner.
     * @param user Must be a tenant owner
     * @param tenant 
     * @param formerOwner User id of the owner to be removed
     * @param expectNoFailures 
     */
    async removeTenantOwner(user: User, tenant: Tenant, formerOwner: string, expectNoFailures = true) {
        const response = await this.cafienneService.delete(`/registration/${tenant.name}/owners/${formerOwner}`, user);
        return checkResponse(response, `Removing ${formerOwner} as owner to tenant ${tenant.name} succeeded unexpectedly`, expectNoFailures);
    }

    /**
     * Returns a list of the tenant users
     * @param user Must be a valid user in the tenant
     * @param tenant 
     * @param expectNoFailures 
     */
    async getTenantUsers(user: User, tenant: Tenant, expectNoFailures = true) {
        const response = await this.cafienneService.get(`/registration/${tenant.name}/users`, user);
        const msg = `GetTenantUsers is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        await checkResponse(response, msg, expectNoFailures);
        if (expectNoFailures) {
            const json = await response.json();
            return <Array<TenantUser>>json;    
        } else {
            return response;
        }
    }

    /**
     * Retrieve information about a specific tenant user
     * @param user Must be a tenant user
     * @param tenant 
     * @param tenantUserId 
     * @param expectNoFailures 
     */
    async getTenantUser(user: User, tenant: Tenant, tenantUserId: string, expectNoFailures = true) {
        const response = await this.cafienneService.get(`/registration/${tenant.name}/users/${tenantUserId}`, user);
        const msg = `GetTenantUser(${tenantUserId}) is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        const json = await checkJSONResponse(response, msg, expectNoFailures);
        return <TenantUser>json;
    }

    /**
     * Add a user to the tenant
     * @param user Must be a tenant owner
     * @param tenant 
     * @param newTenantUser 
     * @param expectNoFailures 
     */
    async addTenantUser(user: User, tenant: Tenant, newTenantUser: TenantUser, expectNoFailures = true) {
        const response = await this.cafienneService.post(`/registration/${tenant.name}/users`, user, newTenantUser);
        const msg = `AddTenantUser is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        return checkResponse(response, msg, expectNoFailures);
    }

    /**
     * Disable the tenant user
     * @param user Must be a tenant owner
     * @param tenant 
     * @param tenantUserId Id of the user to be disabled
     * @param expectNoFailures 
     */
    async disableTenantUser(user: User, tenant: Tenant, tenantUserId: string, expectNoFailures = true) {
        const response = await this.cafienneService.put(`/registration/${tenant.name}/users/${tenantUserId}/disable`, user);
        const msg = `Disable tenant user is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        return checkResponse(response, msg, expectNoFailures);

    }

    /**
     * Enable the tenant user (e.g., after it has been disabled)
     * @param user Must be a tenant owner
     * @param tenant 
     * @param tenantUserId 
     * @param expectNoFailures 
     */
    async enableTenantUser(user: User, tenant: Tenant, tenantUserId: string, expectNoFailures = true) {
        const response = await this.cafienneService.put(`/registration/${tenant.name}/users/${tenantUserId}/enable`, user);
        const msg = `Enable tenant user is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        return checkResponse(response, msg, expectNoFailures);
    }

    /**
     * Add a role to the tenant user with the specified id.
     * @param user Must be a tenant owner
     * @param tenant 
     * @param tenantUserId User to which the role will be added
     * @param newRole Name of the new role
     * @param expectNoFailures 
     */
    async addTenantUserRole(user: User, tenant: Tenant, tenantUserId: string, newRole: string, expectNoFailures = true) {
        const response = await this.cafienneService.put(`/registration/${tenant.name}/users/${tenantUserId}/roles/${newRole}`, user);
        const msg = `Adding role ${newRole} to user ${tenantUserId} is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        return checkResponse(response, msg, expectNoFailures);
    }

    /**
     * Remove a role from the tenant user with the specified id.
     * @param user Must be a tenant owner
     * @param tenant 
     * @param tenantUserId User to which the role will be added
     * @param formerRole Name of the role to be removed
     * @param expectNoFailures 
     */
    async removeTenantUserRole(user: User, tenant: Tenant, tenantUserId: string, formerRole: string, expectNoFailures = true) {
        const response = await this.cafienneService.put(`/registration/${tenant.name}/users/${tenantUserId}/roles/${formerRole}`, user);
        const msg = `Removing role ${formerRole} from user ${tenantUserId} is not expected to succeed for user ${user.id} in tenant ${tenant.name}`;
        return checkResponse(response, msg, expectNoFailures);
    }

    /**
     * Fetches all information the case engine has on this user.
     * @param user 
     */
    async getUserInformation(user: User): Promise<UserInformation> {
        const url = '/registration/user-information';
        const json = await this.cafienneService.get(url, user).then(checkJSONResponse);
        return <UserInformation>json;
    }

}
