import User from '../../user';
import CafienneService from '../cafienneservice';
import Tenant from '../../tenant/tenant';
import UserInformation from '../../tenant/userinformation';
import Config from '../../../config';
import { checkResponse, checkJSONResponse } from '../response';
import logger from '../../logger';


/**
 * Connection to the /registration APIs of Cafienne
 */
export default class PlatformService {
    cafienneService = new CafienneService();

    /**
     * Creates the tenant on behalf of the user. User must be a platform owner.
     * @param user
     * @param tenant 
     * @param expectedStatusCode 
     */
    async createTenant(user: User, tenant: Tenant, expectedStatusCode: number = 204) {
        if (Config.PlatformService.log) logger.debug(`Creating Tenant ${tenant.name}`);
        const response = await this.cafienneService.post('/platform', user, tenant);
        if (response.status === 400 && expectedStatusCode === 204) {
            const msg = await response.text();
            if (msg === 'Tenant already exists') {
                // Tenant already exists is ok.
                if (Config.PlatformService.log) logger.debug(`Tenant ${tenant.name} already exists.'`)
                return response;
            }
        }
        return checkResponse(response, 'CreateTenant is not expected to succeed for user ' + user.id + ' in tenant ' + tenant.name, expectedStatusCode);
    }

    /**
     * Disable a tenant.
     * @param user Must be a platform owner
     * @param tenant 
     * @param expectedStatusCode 
     */
    async disableTenant(user: User, tenant: Tenant, expectedStatusCode: number = 204) {
        const response = await this.cafienneService.put(`/platform/${tenant.name}/disable`, user);
        return checkResponse(response, 'Disabling the tenant ' + tenant.name + ' was not expected to succeed', expectedStatusCode);
    }

    /**
     * Enable a tenant.
     * @param user Must be a platform owner
     * @param tenant 
     * @param expectedStatusCode 
     */
    async enableTenant(user: User, tenant: Tenant, expectedStatusCode: number = 204) {
        const response = await this.cafienneService.put(`/platform/${tenant.name}/enable`, user);
        return checkResponse(response, 'Enabling the tenant ' + tenant.name + ' succeeded unexpectedly', expectedStatusCode);
    }

    async getDisabledTenants(user: User, expectedStatusCode: number = 200) {
        throw new Error('Not yet implemented in the server side')
    }

    /**
     * Fetches all information the case engine has on this user.
     * Can only be invoked by the user itself.
     * @param user 
     */
    async getUserInformation(user: User): Promise<UserInformation> {
        const url = '/platform/user';
        const response = await this.cafienneService.get(url, user);
        return checkJSONResponse(response, 'Expected valid user information', 200, UserInformation);
    }

    /**
     * Returns a json with the platform health
     */
    async getHealth() {
        const url = '/health';
        const response = await this.cafienneService.get(url, undefined);
        return checkJSONResponse(response, 'Expected proper health information', 200)
    }

    /**
     * Returns a json with the platform version
     */
    async getVersion() {
        const url = '/version';
        const response = await this.cafienneService.get(url, undefined);
        return checkJSONResponse(response, 'Expected proper version information', 200)
    }
}
