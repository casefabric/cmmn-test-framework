export default interface CaseTeamMember {
    /**
     * User id of the case team member
     */
    user: string;
    /**
     * Set of roles that the user has within this case team
     */
    roles: string[];
}