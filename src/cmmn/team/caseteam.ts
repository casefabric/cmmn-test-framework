import CaseTeamUser, { CaseOwner } from "./caseteamuser";
import User from "../../user";
import CMMNBaseClass from "../cmmnbaseclass";
import CaseTeamGroup from "./caseteamgroup";
import CaseTeamTenantRole, { CaseOwnerTenantRole } from "./caseteamtenantrole";
import Util from "../../test/util";

/**
 * Simple CaseTeam wrapper class.
 * Each case instance has it's own team.
 */
export default class CaseTeam extends CMMNBaseClass {
    public caseRoles?: string[] = undefined
    public unassignedRoles?: string[] = undefined

    /**
     * 
     * @param users Members in this team
     * @param groups Consent Groups in this team
     */
    constructor(public users: CaseTeamUser[], public groups: Array<CaseTeamGroup> = [], public tenantRoles: Array<CaseTeamTenantRole> = []) { super(); }

    init_json() {
        if (this.users) this.users.forEach(user => Util.convertToTypedObject(user, user.isOwner ? CaseOwner : CaseTeamUser));
        if (this.groups) this.groups.forEach(group => Util.convertToTypedObject(group, CaseTeamGroup));
        if (this.tenantRoles) this.tenantRoles.forEach(role => Util.convertToTypedObject(role, role.isOwner ? CaseOwnerTenantRole : CaseTeamTenantRole));
    }

    find(user: User) {
        return this.users.find(member => member.userId === user.id);
    }
}