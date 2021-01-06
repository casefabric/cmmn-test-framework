import User from "../../user";
import Case from "../../cmmn/case";
import CafienneService from "../cafienneservice";
import { checkJSONResponse } from "../response";

export default class CaseMigrationService {
    /**
     * Get the history of all plan items in the case
     * @param Case 
     * @param user 
     */
    static async migrateDefinition(user: User, Case: Case, migration: DefinitionMigration, expectedStatusCode: number = 200): Promise<any> {
        const response = await CafienneService.post(`/cases/${Case.id}/migrate-definition`, user, migration);
        const msg = `MigrateDefinition is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode);
    }
}

export class DefinitionMigration {
    constructor(public newDefinition: string) {
    }
}
