import TenantUser from "./tenantuser";

export default class Tenant {
    name: string;
    owners: TenantUser[];

    constructor(name: string, owners: TenantUser[]) {
        this.name = name;
        this.owners = owners;
    }
}