import User from "../../user";
import { addType } from "../../util/json";
import CMMNBaseClass from "../cmmnbaseclass";
import Util from '../../util/util';
import CaseTeamGroup from "./caseteamgroup";
import CaseTeamTenantRole, { CaseOwnerTenantRole } from "./caseteamtenantrole";
import CaseTeamUser, { CaseOwner } from "./caseteamuser";

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
        if (this.users) this.users.forEach(user => addType(user, user.isOwner ? CaseOwner : CaseTeamUser));
        if (this.groups) this.groups.forEach(group => addType(group, CaseTeamGroup));
        if (this.tenantRoles) this.tenantRoles.forEach(role => addType(role, role.isOwner ? CaseOwnerTenantRole : CaseTeamTenantRole));
    }

    find(user: User) {
        return this.users.find(member => member.userId === user.id);
    }
}