import User from '../../user';
import CafienneService, { mustBeValidJSON } from '../cafienneservice';
import Tenant from '../../tenant/tenant';
import UserInformation from '../../tenant/userinformation';

export default class TenantService {
    cafienneService = new CafienneService();

    async createTenant(user: User, tenant: Tenant) {
        const response = await this.cafienneService.post('/registration', user, tenant);
        if (!response.ok) {
            if (response.status === 400) {
                console.log('Tenant ' + tenant.name + ' already exists.')
            } else {
                const reason = await response.text();
                console.log('Creation of tenant failed. Reason: ' + response.status + ' ' + response.statusText + ' : ' + reason);
            }
        }
        return response;
    }

    async getTenantOwners(user: User, tenant: Tenant, expectedToFail = false) {
        const url = '/registration/' + tenant.name + '/owners';
        const response = await this.cafienneService.get(url, user);
        if (response.ok) {
            if (expectedToFail) {
                throw new Error('GetTenantOwners is not expected to succeed for user ' + user.id + ' in tenant ' + tenant.name);
            }
            const json = mustBeValidJSON(response);
            return json;
        } else {
            const text = await response.text();
            return text;
        }
    }

    /**
     * Fetches all information the case engine has on this user.
     * @param user 
     */
    async getUserInformation(user: User): Promise<UserInformation> {
        const url = '/registration/user-information';
        const userInformation = await this.cafienneService.getJson(url, user);
        return <UserInformation> userInformation;
    }

}
