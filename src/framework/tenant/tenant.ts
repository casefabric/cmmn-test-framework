import TenantUser from "./tenantuser";

export default class Tenant {
    /**
     * Simple wrapper class for Tenant.
     * @param name Name (and id) of the tenant.
     * @param owners List of Tenant Users that are owner of the tenant.
     */
    constructor(public name: string, public owners: TenantUser[]) { }
}