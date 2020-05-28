import User from "../user";

export default class RoleBinding {
    /**
     * 
     * @param user Either a String or a User, holding the user id of the case team member
     * @param roles Set of roles that the user has within this case team; if not given, then the roles of the user are used (if any)
     */
    constructor(public caseRole: string, public tenantRoles: string[]) {
    }
}