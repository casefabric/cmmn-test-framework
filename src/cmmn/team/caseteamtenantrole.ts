import CMMNBaseClass from "../cmmnbaseclass";


export default class CaseTeamTenantRole extends CMMNBaseClass {
    public isOwner: (boolean | undefined) = undefined;

    /**
     * Create a case team member linking to a tenant role
     * @param tenantRole Either a String or a User, holding the user id of the case team member
     * @param caseRoles Set of roles that the user has within this case team; if not given, then the roles of the user are used (if any)
     */
    constructor(public tenantRole: string, public caseRoles: string[] = []) {
        super();
    }

    toString() {
        return this.tenantRole;
    }
}

export class CaseOwnerTenantRole extends CaseTeamTenantRole {
    constructor(public tenantRole: string, public caseRoles: string[] = []) {
        super(tenantRole, caseRoles);
        this.isOwner = true;
    }
}
