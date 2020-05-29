import User from "../user";

export default class CaseTeamMember {
    memberId: string;

    /**
     * 
     * @param user Either a String or a User, holding the user id of the case team member
     * @param memberType The type of member (either a 'user' or a 'role')
     * @param roles Set of roles that the user has within this case team; if not given, then the roles of the user are used (if any)
     */
    constructor(user: any, public memberType: string = 'user', public isOwner: boolean = false, public caseRoles: string[] = []) {
        this.memberId = user instanceof User ? user.id : user;
    }
}