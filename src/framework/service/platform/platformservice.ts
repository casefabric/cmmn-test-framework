import User from '../../user';
import CafienneService from '../cafienneservice';
import Tenant from '../../tenant/tenant';
import UserInformation from '../../tenant/userinformation';
import Config from '../../../config';
import { checkResponse, checkJSONResponse } from '../response';


/**
 * Connection to the /registration APIs of Cafienne
 */
export default class PlatformService {
    cafienneService = new CafienneService();

    /**
     * Creates the tenant on behalf of the user. User must be a platform owner.
     * @param user
     * @param tenant 
     * @param expectNoFailures 
     */
    async createTenant(user: User, tenant: Tenant, expectNoFailures: boolean | number = true) {
        if (Config.PlatformService.log) console.log(`Creating Tenant ${tenant.name}`);
        const response = await this.cafienneService.post('/platform', user, tenant);
        if (response.status === 400) {
            // Tenant already exists.
            if (Config.PlatformService.log) console.log(`Tenant ${tenant.name} already exists.'`)
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
    async disableTenant(user: User, tenant: Tenant, expectNoFailures: boolean | number = true) {
        const response = await this.cafienneService.put(`/platform/${tenant.name}/disable`, user);
        return checkResponse(response, 'Disabling the tenant ' + tenant.name + ' was not expected to succeed', expectNoFailures);
    }

    /**
     * Enable a tenant.
     * @param user Must be a platform owner
     * @param tenant 
     * @param expectNoFailures 
     */
    async enableTenant(user: User, tenant: Tenant, expectNoFailures: boolean | number = true) {
        const response = await this.cafienneService.put(`/platform/${tenant.name}/enable`, user);
        return checkResponse(response, 'Enabling the tenant ' + tenant.name + ' succeeded unexpectedly', expectNoFailures);
    }

    async getDisabledTenants(user: User, expectNoFailures: boolean | number = true) {
        throw new Error('Not yet implemented in the server side')
    }

    /**
     * Fetches all information the case engine has on this user.
     * @param user 
     */
    async getUserInformation(user: User): Promise<UserInformation> {
        const url = '/platform/user';
        const json = await this.cafienneService.get(url, user).then(checkJSONResponse);
        return <UserInformation>json;
    }

    /**
     * Returns a json with the platform health
     */
    async getHealth() {
        const url = '/health';
        const json = await this.cafienneService.get(url, undefined).then(response => response.asJSON());
        console.log("JSON: " + json)
        return json;
    }

    /**
     * Returns a json with the platform version
     */
    async getVersion() {
        const url = '/version';
        const json = await this.cafienneService.get(url, undefined).then(checkJSONResponse);
        return json;
    }
}
