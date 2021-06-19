import TenantUser from "./tenantuser";

export default class UserInformation {
    constructor(
        public userId: string,
        public tenants: Array<TenantUser>
    ) { };

}