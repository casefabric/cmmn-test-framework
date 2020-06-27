import User from "../user";

export default class CaseTeamMember {
    memberId: string;
    removeRoles: string[]|undefined = undefined;

    /**
     * Base case team member, supporting all types (tenant-user vs. tenant-role and whether case owner or not)
     * @param user Either a String or a User, holding the user id of the case team member
     * @param roles Set of roles that the user has within this case team; if not given, then the roles of the user are used (if any)
     * @param memberType The type of member (either a 'user' or a 'role')
     * @param isOwner Whether or not the new member is also a Case Owner
     */
    constructor(user?: any, public caseRoles: string[] = [], public memberType: string = 'user', public isOwner: (boolean|undefined) = undefined) {
        this.memberId = user instanceof User ? user.id : user;
    }
}

export class CaseOwner extends CaseTeamMember {

    /**
     * Create a case team member that is also owner to the case
     * @param user Either a String or a User, holding the user id of the case team member
     * @param roles Set of roles that the user has within this case team; if not given, then the roles of the user are used (if any)
     * @param memberType The type of member (either a 'user' or a 'role')
     */
    constructor(user?: any, public caseRoles: string[] = [], public memberType: string = 'user') {
        super(user, caseRoles, memberType, true);
    }
}

export class TenantRoleMember extends CaseTeamMember {
    /**
     * Create a case team member linking to a tenant role
     * @param tenantRoleName Either a String or a User, holding the user id of the case team member
     * @param roles Set of roles that the user has within this case team; if not given, then the roles of the user are used (if any)
     * @param isOnwer Whether the TenantRole is a case owner or not.
     */
    constructor(tenantRoleName: string, public caseRoles: string[] = [], public isOwner: (boolean|undefined) = undefined) {
        super(tenantRoleName, caseRoles, 'role', isOwner);
    }
}