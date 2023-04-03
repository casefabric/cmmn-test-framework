
//Wrapper for the AddTeam Command

import User from "@cafienne/typescript-client/user";

export class TeamMember {
  public userId: string;
  constructor(user: User | string, public roles: Array<string> = [], public isBoardManager: boolean = false, public name: string | undefined = undefined) {
    this.userId = user.toString();
  }

  toString() {
    return this.userId;
  }
}

export class BoardManager extends TeamMember {
  constructor(user: User | string, public roles: Array<string> = [], public name: string | undefined = undefined) {
    super(user, roles, true, name);
  }
}

export default class BoardTeam {
  /**
   * 
   * @param members 
   * @param roles Roles that can be assigned to members in the team
   */
  constructor(public members: Array<TeamMember> = [], public roles: Array<string> = []) { }
}
