
//Wrapper for the AddTeam Command

interface TeamMember {
  subject: string;
  roles: Array<string>;
}
export default interface TeamRequestDetails {
  /**
   * Title of the board to create
   */
  team: Array<TeamMember>;
  /**
   * Optional id for the board to create.
   * If not specified, the server will create one.
   */
  boardId: string;
}
