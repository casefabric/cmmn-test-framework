import ConsentGroup from "../service/consentgroup/consentgroup";
import CMMNBaseClass from "./cmmnbaseclass";

export default class CaseTeamGroup extends CMMNBaseClass {
    public groupId: string;

    /**
     * Base case team member, supporting all types (tenant-user vs. tenant-role and whether case owner or not)
     * @param user Either a String or a User, holding the user id of the case team member
     * @param roles Set of roles that the user has within this case team; if not given, then the roles of the user are used (if any)
     * @param memberType The type of member (either a 'user' or a 'role')
     * @param isOwner Whether or not the new member is also a Case Owner
     */
    constructor(group: ConsentGroup | string, public mappings: Array<GroupRoleMapping> = []) {
        super();
        this.groupId = '' + group;
    }
}

export class GroupRoleMapping {
    public isOwner: boolean = false;
    public caseRoles: Array<string> = [];
    constructor(public groupRole: string, ...caseRoleList: Array<string>) {
        this.caseRoles = caseRoleList;
    }
}

export class GroupRoleMappingWithCaseOwnership extends GroupRoleMapping {
    public isOwner: boolean = true;
    constructor(public groupRole: string, ...caseRoleList: Array<string>) {
        super(groupRole, ...caseRoleList);
    }
}
