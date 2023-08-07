import { checkJSONResponse } from "@cafienne/typescript-client";
import Case from "@cafienne/typescript-client/cmmn/case";
import Definitions from "@cafienne/typescript-client/cmmn/definitions/definitions";
import CaseTeam from "@cafienne/typescript-client/cmmn/team/caseteam";
import CafienneService from "@cafienne/typescript-client/service/cafienneservice";
import CaseMigrationService, { DefinitionMigration } from "@cafienne/typescript-client/service/case/casemigrationservice";
import User from "@cafienne/typescript-client/user";

export default class NextVersion {
    static enable() {
        this.extendCaseMigrationService();        
    }

    static extendCaseMigrationService() {
        CaseMigrationService.migrateDefinition = ExtendedCaseMigrationService.migrateDefinition
    }
}

export class ExtendedCaseMigrationService extends CaseMigrationService {
    static async migrateDefinition(user: User, Case: Case, migration: ExtendedDefinitionMigration, expectedStatusCode: number = 200): Promise<any> {
        const response = await CafienneService.post(`/cases/${Case.id}/migrate-definition`, user, { 
            newDefinition: migration.newDefinition.toString(),
            newTeam: migration.newTeam,
        });
        const msg = `MigrateDefinition is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode);
    }
}

export class ExtendedDefinitionMigration extends DefinitionMigration {
    constructor(public newDefinition: string | Definitions, public newTeam?: CaseTeam) {
        super(newDefinition);
    }
}
