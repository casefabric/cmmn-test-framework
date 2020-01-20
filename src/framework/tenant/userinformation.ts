import TenantUser from "./tenantuser";

export default interface UserInformation {
    userId: string;
    tenants: Array<TenantUser>;
}