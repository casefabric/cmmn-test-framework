import PlatformService from "../../../src/service/platform/platformservice";
import Tenant from "../../../src/tenant/tenant";
import TenantUser from "../../../src/tenant/tenantuser";
import User, { admin } from "../../../src/user";
import { asyncForEach } from "../../../src/util/util";

/**
 * Simple test tenant to avoid duplicate code
 */
export default class AnonymousWorld {
    tenant: Tenant = new Tenant(this.name, this.members);

    constructor(public readonly name: string, public members: Array<TenantUser>, public platformAdmin: User = admin) {
    }

    /**
     * Creates the tenant, and logs in for sender user and receiver user.
     */
    async create() {
        await this.platformAdmin.login();
        await PlatformService.createTenant(this.platformAdmin, this.tenant);
        await asyncForEach(this.members, async member => await member.login());
    }
}