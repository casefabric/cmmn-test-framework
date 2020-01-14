import User from '../user';
import CafienneService from './cafienneservice';
import Tenant from '../tenant/tenant';

export default class TenantService {
    cafienneService = new CafienneService();

    async createTenant(user: User, tenant: Tenant) {
        return this.cafienneService.post('/registration', tenant, user);
    }

    async getUserInformation(user: User) {
        const url = '/registration/user-information';
        const userInformation = await this.cafienneService.get(url, user);
        return user.setTenantInformation(userInformation);
    }

}
