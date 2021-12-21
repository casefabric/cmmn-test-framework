import User from "../../user";
import CMMNBaseClass from "../cmmnbaseclass";

export default class CaseTeamUser extends CMMNBaseClass {

    public userId: string;
    public isOwner: (boolean | undefined) = undefined;

    /**
     * Base case team member, supporting all types (tenant-user vs. tenant-role and whether case owner or not)
     * @param user Either a String or a User, holding the user id of the case team member
     * @param caseRoles Set of roles that the user has within this case team; if not given, then the roles of the user are used (if any)
     */
    constructor(user: string | User | CaseTeamUser, public caseRoles: string[] = []) {
        super();
        this.userId = user.toString();
    }

    public toString() {
        return this.userId;
    }
}

export class CaseOwner extends CaseTeamUser {

    /**
     * Create a case team member that is also owner to the case
     * @param user Either a String or a User, holding the user id of the case team member
     * @param caseRoles Set of roles that the user has within this case team; if not given, then the roles of the user are used (if any)
     */
    constructor(user: string | User | CaseTeamUser, public caseRoles: string[] = []) {
        super(user, caseRoles);
        this.isOwner = true;
    }
}
