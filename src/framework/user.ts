import TokenService from './service/tokenservice';
import CafienneService from './service/cafienneservice';
import TenantService from './service/tenantservice';

export default class User {
    id: string;
    token: string;
    tenantInformation: any;

    tenantService = new TenantService();
    cafienneService = new CafienneService();
    tokenService = new TokenService();
    
    constructor(id: string) {
        this.id = id;
        this.token = '';
    }

    async login() {
        await this.tokenService.getToken(this);
        await this.tenantService.getUserInformation(this);
        return this;
    }

    async setToken(token: string) {
        console.log("Token: " + token);
        this.token = token;
        return this;
    }

    setTenantInformation(userInformation: any) {
        this.tenantInformation = userInformation;
        console.log("Tenant info: " , this.tenantInformation);
        return this;
    }
}