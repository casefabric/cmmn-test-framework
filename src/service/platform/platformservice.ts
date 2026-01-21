import User from '../../user';
import CaseEngineService from '../caseengineservice';
import Tenant from '../../tenant/tenant';
import UserInformation from '../../tenant/userinformation';
import Config from '../../config';
import { checkResponse, checkJSONResponse } from '../response';
import logger from '../../logger';
import Trace from '../../util/async/trace';

/**
 * Connection to the /registration APIs of the Case Engine
 */
export default class PlatformService {
    /**
     * Creates the tenant on behalf of the user. User must be a platform owner.
     * @param user
     * @param tenant 
     * @param expectedStatusCode 
     */
    static async createTenant(user: User, tenant: Tenant, expectedStatusCode: number = 204, errorMsg = `CreateTenant is not expected to succeed for user ${user} in tenant ${tenant}`, trace: Trace = new Trace()) {
        if (Config.PlatformService.log) logger.debug(`Creating Tenant ${tenant.name}`);
        const response = await CaseEngineService.post('/platform', user, tenant.toJson());
        if (response.status === 400 && expectedStatusCode === 204) {
            const msg = await response.text();
            if (msg === 'Tenant already exists' || msg.indexOf('Failure while handling message CreateTenant') >= 0) {
                // Tenant already exists is ok.
                if (Config.PlatformService.log) logger.debug(`Tenant ${tenant.name} already exists.`)
                return response;
            }
        }
        return checkResponse(response, errorMsg, expectedStatusCode, trace);
    }

    /**
     * Disable a tenant.
     * @param user Must be a platform owner
     * @param tenant 
     * @param expectedStatusCode 
     */
    static async disableTenant(user: User, tenant: Tenant | string, expectedStatusCode: number = 204, msg = `Disabling the tenant ${tenant} was not expected to succeed`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.put(`/platform/${tenant}/disable`, user);
        return checkResponse(response, msg, expectedStatusCode, trace);
    }

    /**
     * Enable a tenant.
     * @param user Must be a platform owner
     * @param tenant 
     * @param expectedStatusCode 
     */
    static async enableTenant(user: User, tenant: Tenant | string, expectedStatusCode: number = 204, msg = `Enabling the tenant ${tenant} was not expected to succeed`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.put(`/platform/${tenant}/enable`, user);
        return checkResponse(response, msg, expectedStatusCode, trace);
    }

    getDisabledTenants(user: User, expectedStatusCode: number = 200) {
        throw new Error('Not yet implemented in the server side')
    }

    /**
     * Fetches all information the case engine has on this user.
     * Can only be invoked by the user itself.
     * @param user 
     */
    static async getUserInformation(user: User, trace: Trace = new Trace()): Promise<UserInformation> {
        const url = '/platform/user';
        const response = await CaseEngineService.get(url, user);
        return checkJSONResponse(response, 'Expected valid user information', 200, UserInformation, trace);
    }

    /**
     * Returns a json with the platform health
     */
    static async getHealth(trace: Trace = new Trace()) {
        const url = '/health';
        const response = await CaseEngineService.get(url, undefined);
        return checkJSONResponse(response, 'Expected proper health information', 200, undefined, trace);
    }

    /**
     * Returns a json with the platform version
     */
    static async getVersion(trace: Trace = new Trace()) {
        const url = '/version';
        const response = await CaseEngineService.get(url, undefined);
        return checkJSONResponse(response, 'Expected proper version information', 200, undefined, trace);
    }
}
