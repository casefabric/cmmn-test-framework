import { checkResponse } from "@cafienne/typescript-client";
import Case from "@cafienne/typescript-client/cmmn/case";
import Config from "@cafienne/typescript-client/config";
import logger from "@cafienne/typescript-client/logger";
import CafienneService from "@cafienne/typescript-client/service/cafienneservice";
import Tenant from "@cafienne/typescript-client/tenant/tenant";
import User from "@cafienne/typescript-client/user";

/**
 * Connection to the /storage APIs of Cafienne
 */
export default class StorageService {
    /**
     * Deletes the case on behalf of the user. User must be a tenant owner.
     * @param user
     * @param caseInstance 
     * @param expectedStatusCode 
     */
    static async archiveCase(user: User, caseInstance: Case | string, expectedStatusCode: number = 202, errorMsg = `ArchiveCase is not expected to succeed for user ${user} on case ${caseInstance}`) {
        if (Config.PlatformService.log) logger.debug(`Archiving case ${caseInstance}`);
        const response = await CafienneService.put(`/storage/case/${caseInstance}/archive`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    /**
     * Deletes the case on behalf of the user. User must be a tenant owner.
     * @param user
     * @param caseInstance 
     * @param expectedStatusCode 
     */
     static async restoreCase(user: User, caseInstance: Case | string, expectedStatusCode: number = 202, errorMsg = `RestoreCase is not expected to succeed for user ${user} on case ${caseInstance}`) {
        if (Config.PlatformService.log) logger.debug(`Restoring case ${caseInstance}`);
        const response = await CafienneService.put(`/storage/case/${caseInstance}/restore`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    /**
     * Deletes the case on behalf of the user. User must be a tenant owner.
     * @param user
     * @param caseInstance 
     * @param expectedStatusCode 
     */
     static async deleteCase(user: User, caseInstance: Case | string, expectedStatusCode: number = 202, errorMsg = `DeleteCase is not expected to succeed for user ${user} on case ${caseInstance}`) {
        if (Config.PlatformService.log) logger.debug(`Deleting case ${caseInstance}`);
        const response = await CafienneService.delete(`/storage/case/${caseInstance}`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

    /**
     * Deletes the tenant on behalf of the user. User must be a tenant owner.
     * @param user
     * @param tenant 
     * @param expectedStatusCode 
     */
     static async deleteTenant(user: User, tenant: Tenant | string, expectedStatusCode: number = 202, errorMsg = `DeleteTenant is not expected to succeed for user ${user} on tenant ${tenant}`) {
        if (Config.PlatformService.log) logger.debug(`Deleting Tenant ${tenant}`);
        const response = await CafienneService.delete(`/storage/tenant/${tenant}`, user);
        return checkResponse(response, errorMsg, expectedStatusCode);
    }

}
