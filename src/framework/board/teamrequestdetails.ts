
//Wrapper for the AddTeam Command

export class TeamMember {
  constructor(public userId: string, public name: string|undefined, public roles: Array<string>){}

  toString() {
    return this.userId;
  }
}

export default interface TeamRequestDetails {
  /**
   * Title of the board to create
   */
  members: Array<TeamMember>;

  /**
   * Roles that can be assigned to members in the team
   */
  roles: Array<string>;
}
