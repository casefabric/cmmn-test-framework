import Case from "../../cmmn/case";
import Config from "../../config";
import Trace from "../../infra/trace";
import logger from "../../logger";
import Tenant from "../../tenant/tenant";
import WorldWideTestTenant from "../../tests/setup/worldwidetesttenant";
import User from "../../user";
import CaseEngineService from "../caseengineservice";
import { checkResponse } from "../response";

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
    static async archiveCase(user: User, caseInstance: Case | string, expectedStatusCode: number = 202, errorMsg = `ArchiveCase is not expected to succeed for user ${user} on case ${caseInstance}`, trace: Trace = new Trace()) {
        if (Config.PlatformService.log) logger.debug(`Archiving case ${caseInstance}`);
        const response = await CaseEngineService.put(`/storage/case/${caseInstance}/archive`, user);
        return checkResponse(response, errorMsg, expectedStatusCode, trace);
    }

    /**
     * Deletes the case on behalf of the user. User must be a tenant owner.
     * @param user
     * @param caseInstance 
     * @param expectedStatusCode 
     */
     static async restoreCase(user: User, caseInstance: Case | string, expectedStatusCode: number = 202, errorMsg = `RestoreCase is not expected to succeed for user ${user} on case ${caseInstance}`, trace: Trace = new Trace()) {
        if (Config.PlatformService.log) logger.debug(`Restoring case ${caseInstance}`);
        const response = await CaseEngineService.put(`/storage/case/${caseInstance}/restore`, user);
        return checkResponse(response, errorMsg, expectedStatusCode, trace);
    }

    /**
     * Deletes the case on behalf of the user. User must be a tenant owner.
     * @param user
     * @param caseInstance 
     * @param expectedStatusCode 
     */
     static async deleteCase(user: User, caseInstance: Case | string, expectedStatusCode: number = 202, errorMsg = `DeleteCase is not expected to succeed for user ${user} on case ${caseInstance}`, trace: Trace = new Trace()) {
        if (Config.PlatformService.log) logger.debug(`Deleting case ${caseInstance}`);
        const response = await CaseEngineService.delete(`/storage/case/${caseInstance}`, user);
        return checkResponse(response, errorMsg, expectedStatusCode, trace);
    }

    /**
     * Deletes the tenant on behalf of the user. User must be a tenant owner.
     * @param user
     * @param tenant 
     * @param expectedStatusCode 
     */
     static async deleteTenant(user: User, tenant: Tenant | string, expectedStatusCode: number = 202, errorMsg = `DeleteTenant is not expected to succeed for user ${user} on tenant ${tenant}`, trace: Trace = new Trace()) {
        if (Config.PlatformService.log) logger.debug(`Deleting Tenant ${tenant}`);
        const response = await CaseEngineService.delete(`/storage/tenant/${tenant}`, user);
        if (response.ok) {
            WorldWideTestTenant.reset(tenant);
        }
        return checkResponse(response, errorMsg, expectedStatusCode, trace);
    }

}
