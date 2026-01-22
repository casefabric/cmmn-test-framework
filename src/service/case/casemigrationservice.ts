import Case from "../../cmmn/case";
import Definitions from "../../cmmn/definitions/definitions";
import CaseTeam from "../../cmmn/team/caseteam";
import User from "../../user";
import Trace from "../../util/async/trace";
import CaseEngineService from "../caseengineservice";

export default class CaseMigrationService {
    /**
     * Get the history of all plan items in the case
     * @param caseId 
     * @param user 
     */
    static async migrateDefinition(user: User, caseId: Case | string, migration: DefinitionMigration, expectedStatusCode: number = 200, msg = `MigrateDefinition is not expected to succeed for user ${user.id} in case ${caseId}`, trace: Trace = new Trace()): Promise<any> {
        const response = await CaseEngineService.post(`/cases/${caseId}/migrate-definition`, user, {
            newDefinition: migration.newDefinition.toString(),
            newTeam: migration.newTeam,
        });
        return response.validateObject(Object, msg, expectedStatusCode, trace);
    }
}

export class DefinitionMigration {
    constructor(public newDefinition: string | Definitions, public newTeam?: CaseTeam) {
    }
}
