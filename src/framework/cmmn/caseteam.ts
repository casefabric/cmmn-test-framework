import CaseTeamMember from "./caseteammember";

/**
 * Simple CaseTeam wrapper class.
 * Each case instance has it's own team.
 */
export default class CaseTeam {
    constructor(public members: CaseTeamMember[]) {}
}