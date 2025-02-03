import User from "../../user";
import Case from "../../cmmn/case";
import CafienneService from "../cafienneservice";
import { checkJSONResponse } from "../response";
import Definition from "../../cmmn/definitions/definition";
import CaseTeam from "../../cmmn/team/caseteam";
import Trace from "../../infra/trace";

export default class CaseMigrationService {
    /**
     * Get the history of all plan items in the case
     * @param Case 
     * @param user 
     */
    static async migrateDefinition(user: User, Case: Case, migration: DefinitionMigration, expectedStatusCode: number = 200, msg = `MigrateDefinition is not expected to succeed for user ${user.id} in case ${Case.id}`, trace: Trace = new Trace()): Promise<any> {
        const response = await CafienneService.post(`/cases/${Case.id}/migrate-definition`, user, { 
            newDefinition: migration.newDefinition.toString(),
            newTeam: migration.newTeam,
        });
        return checkJSONResponse(response, msg, expectedStatusCode, undefined, trace);
    }
}

export class DefinitionMigration {
    constructor(public newDefinition: string | Definition, public newTeam?: CaseTeam) {
    }
}
