import User from "../user";

export default class CaseTeamMember {
    member: MemberKey;

    /**
     * 
     * @param user Either a String or a User, holding the user id of the case team member
     * @param memberType The type of member (either a 'user' or a 'role')
     * @param roles Set of roles that the user has within this case team; if not given, then the roles of the user are used (if any)
     */
    constructor(user?: any, memberType?: string, public isOwner?: boolean, public caseRoles: string[] = []) {
        const memberId = user instanceof User ? user.id : user;
        this.member = new MemberKey(memberId, memberType);
    }
}

export class MemberKey {
    constructor(public id: string, public type: string = 'user'){}
}