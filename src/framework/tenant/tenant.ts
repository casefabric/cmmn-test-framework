import TenantUser from "./tenantuser";

export default class Tenant {
    /**
     * Simple wrapper class for Tenant.
     * @param name Name (and id) of the tenant.
     * @param users List of Tenant Users in the tenant.
     */
    constructor(public name: string, public users: TenantUser[]) { }

    /**
     * Returns the tenant users that are owner.
     */
    getOwners() {
        return this.users.filter(user => user.isOwner);
    }
}