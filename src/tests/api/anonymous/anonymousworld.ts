import User from "../../../framework/user";
import TenantUser, { TenantOwner } from "../../../framework/tenant/tenantuser";
import Tenant from "../../../framework/tenant/tenant";
import PlatformService from "../../../framework/service/platform/platformservice";

const platformService = new PlatformService();

/**
 * Simple test tenant to avoid duplicate code
 */
export default class AnonymousWorld {
    tenant: Tenant = new Tenant(this.name, this.members);

    constructor(public readonly name: string, public members: Array<TenantUser>, public platformAdmin: User = new User('admin')) {
    }

    /**
     * Creates the tenant, and logs in for sender user and receiver user.
     */
    async create() {
        await this.platformAdmin.login();
        await platformService.createTenant(this.platformAdmin, this.tenant);
        this.members.forEach(async member => await member.login());
    }
}