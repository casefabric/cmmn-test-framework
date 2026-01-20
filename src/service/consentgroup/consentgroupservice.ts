import Config from '../../config';
import Trace from '../../infra/trace';
import logger from '../../logger';
import Tenant from '../../tenant/tenant';
import User from '../../user';
import CaseEngineService from '../caseengineservice';
import { checkJSONResponse, checkResponse } from '../response';
import ConsentGroup from './consentgroup';
import ConsentGroupMember from './consentgroupmember';


/**
 * Connection to the /consent-group APIs of the Case Engine
 */
export default class ConsentGroupService {
    /**
     * Creates the consent group
     * @param user 
     * @param tenant 
     * @param group 
     * @param expectedStatusCode 
     * @returns 
     */
    static async createGroup(user: User, tenant: Tenant | string, group: ConsentGroup, expectedStatusCode: number = 200, msg = `CreateConsentGroup is not expected to succeed for user ${user.id} in ${tenant}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.post(`/tenant/${tenant}/consent-groups`, user, group.toJson());
        if (response.status === 400 && expectedStatusCode === 200) {
            const responseText = await response.text();
            if (responseText === 'Consent group already exists' || responseText.indexOf('Failure while handling message CreateConsentGroup') >= 0) {
                // Tenant already exists is ok.
                if (Config.PlatformService.log) logger.debug(`Consent group ${group} already exists.'`)
                return response;
            }
        }
        return checkJSONResponse(response, msg, expectedStatusCode, undefined, trace).then(json => {
            // After getting a succesful response we silently set the group id if not available
            //  (typical use case: the server generated it instead the client passing it)
            if (!group.id && json.groupId) {
                group.id = json.groupId;
            }
        });
    }

    /**
     * Retrieve a consent group with it's members
     * @param user Must be a valid user in the group
     * @param groupId 
     * @param expectedStatusCode 
     */
    static async getGroup(user: User, groupId: ConsentGroup | string, expectedStatusCode: number = 200, msg = `GetGroup is not expected to succeed for user ${user.id} in group ${groupId}`, trace: Trace = new Trace()): Promise<ConsentGroup> {
        const response = await CaseEngineService.get(`/consent-group/${groupId}`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, ConsentGroup, trace);
    }

    /**
     * Replaces the consent group
     * @param user 
     * @param tenant 
     * @param group 
     * @param expectedStatusCode 
     * @returns 
     */
    static async replaceGroup(user: User, group: ConsentGroup, expectedStatusCode: number = 202, msg = `ReplaceConsentGroup is not expected to succeed for user ${user.id} in ${group}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.post(`/consent-group/${group}`, user, group.toJson());
        return checkResponse(response, msg, expectedStatusCode, trace);
    }

    /**
     * Retrieve information about a specific user in the group
     * @param user Must be a group user
     * @param groupId 
     * @param userId User or Id of the user to retrieve the information for 
     * @param expectedStatusCode 
     */
    static async getGroupMember(user: User, groupId: ConsentGroup | string, userId: User | string, expectedStatusCode: number = 200, msg = `GetGroupMember(${userId}) is not expected to succeed for user ${user.id} in group ${groupId}`, trace: Trace = new Trace()): Promise<ConsentGroupMember> {
        const response = await CaseEngineService.get(`/consent-group/${groupId}/members/${userId}`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, ConsentGroupMember, trace);
    }

    /**
     * Add or replace a user in the group
     * @param user Must be a group owner
     * @param groupId Group in which to add/replace the member.
     * @param newUser The new user information that will be updated
     * @param expectedStatusCode 
     */
    static async setGroupMember(user: User, groupId: ConsentGroup | string, newUser: ConsentGroupMember, expectedStatusCode: number = 202, msg = `SetGroupMember is not expected to succeed for user ${user.id} in consent group ${groupId}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.post(`/consent-group/${groupId}/members`, user, newUser.toJson());
        return checkResponse(response, msg, expectedStatusCode, trace);
    }

    /**
     * 
     * @param user Must be a group owner
     * @param groupId Group to remove the member from
     * @param userId User or id of user to be removed from the group.
     * @param expectedStatusCode 
     * @returns 
     */
    static async removeGroupMember(user: User, groupId: ConsentGroup | string, userId: User | string, expectedStatusCode: number = 202, msg = `RemoveGroupMember ${userId} from group ${groupId} is not expected to succeed for user ${user.id}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.delete(`/consent-group/${groupId}/members/${userId}`, user);
        return checkResponse(response, msg, expectedStatusCode, trace);
    }
}
