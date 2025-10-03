import CaseTeamUser from "./caseteamuser";
import User from "../../user";
import CMMNBaseClass from "../cmmnbaseclass";
import CaseTeamGroup from "./caseteamgroup";
import CaseTeamTenantRole from "./caseteamtenantrole";

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

    find(user: User) {
        return this.users.find(member => member.userId === user.id);
    }
}