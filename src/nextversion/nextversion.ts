import { checkJSONResponse, checkResponse } from "@cafienne/typescript-client";
import Config from "@cafienne/typescript-client/config";
import logger from "@cafienne/typescript-client/logger";
import CafienneService from "@cafienne/typescript-client/service/cafienneservice";
import ConsentGroup from "@cafienne/typescript-client/service/consentgroup/consentgroup";
import ConsentGroupService from "@cafienne/typescript-client/service/consentgroup/consentgroupservice";
import Tenant from "@cafienne/typescript-client/tenant/tenant";
import User from "@cafienne/typescript-client/user";

export default class NextVersion {
    static enable() {
        this.extendConsentGroupService();        
    }

    static extendConsentGroupService() {
        ConsentGroupService.createGroup = ExtendedConsentGroupService.createGroup
    }
}

export class ExtendedConsentGroupService extends ConsentGroupService {
    /**
     * Creates the consent group
     * @param user 
     * @param tenant 
     * @param group 
     * @param expectedStatusCode 
     * @returns 
     */
     static async createGroup(user: User, tenant: Tenant | string, group: ConsentGroup, expectedStatusCode: number = 200) {
        const response = await CafienneService.post(`/tenant/${tenant}/consent-groups`, user, group.toJson());
        if (response.status === 400 && expectedStatusCode === 200) {
            const msg = await response.text();
            if (msg === 'Consent group already exists' || msg.indexOf('Failure while handling message CreateConsentGroup') >= 0) {
                // Tenant already exists is ok.
                if (Config.PlatformService.log) logger.debug(`Consent group ${group} already exists.'`)
                return response;
            }
        }
        const msg = `CreateConsentGroup is not expected to succeed for user ${user.id} in ${tenant}`;
        return checkJSONResponse(response, msg, expectedStatusCode).then(json => {
            // After getting a succesful response we silently set the group id if not available
            //  (typical use case: the server generated it instead the client passing it)
            if (! group.id && json.groupId) {
                group.id = json.groupId;
            }
        });
    }

    /**
     * Replaces the consent group
     * @param user 
     * @param tenant 
     * @param group 
     * @param expectedStatusCode 
     * @returns 
     */
     static async replaceGroup(user: User, group: ConsentGroup, expectedStatusCode: number = 202) {
        const response = await CafienneService.post(`/consent-group/${group}`, user, group.toJson());
        const msg = `ReplaceConsentGroup is not expected to succeed for user ${user.id} in ${group}`;
        return checkResponse(response, msg, expectedStatusCode);
    }
}