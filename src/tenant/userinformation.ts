import CMMNBaseClass from "../cmmn/cmmnbaseclass";
import ConsentGroupMembership from "./consentgroupmembership";
import TenantUser from "./tenantuser";

export default class UserInformation extends CMMNBaseClass {
    public userId!: string;
    public tenants!: Array<TenantUser>;
    public groups!: Array<ConsentGroupMembership>;
}
