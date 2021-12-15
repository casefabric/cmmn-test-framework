import Config from '../../../config';
import logger from '../../logger';
import User from '../../user';
import CafienneService from '../cafienneservice';
import { checkJSONResponse, checkResponse } from '../response';
import ConsentGroup from './consentgroup';
import ConsentGroupMember from './consentgroupmember';


/**
 * Connection to the /consent-group APIs of Cafienne
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
    static async createGroup(user: User, group: ConsentGroup, expectedStatusCode: number = 200) {
        const tenant = group.tenant;
        if (! tenant) {
            throw new Error('Creating a Consent Group can only be done if the tenant property is filled.');
        }

        const response = await CafienneService.post(`/consent-group/${tenant}`, user, group.toJson());
        if (response.status === 400 && expectedStatusCode === 200) {
            const msg = await response.text();
            if (msg === 'Consent group already exists') {
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
     * Retrieve a consent group with it's members
     * @param user Must be a valid user in the group
     * @param groupId 
     * @param expectedStatusCode 
     */
     static async getGroup(user: User, groupId: ConsentGroup | string, expectedStatusCode: number = 200): Promise<ConsentGroup> {
        const response = await CafienneService.get(`/consent-group/${groupId}`, user);
        const msg = `GetGroup is not expected to succeed for user ${user.id} in group ${groupId}`;
        return checkJSONResponse(response, msg, expectedStatusCode, ConsentGroup);
    }

    /**
     * Retrieve information about a specific user in the group
     * @param user Must be a group user
     * @param groupId 
     * @param userId User or Id of the user to retrieve the information for 
     * @param expectedStatusCode 
     */
    static async getGroupMember(user: User, groupId: ConsentGroup | string, userId: User | string, expectedStatusCode: number = 200): Promise<ConsentGroupMember> {
        const response = await CafienneService.get(`/consent-group/${groupId}/members/${userId}`, user);
        const msg = `GetGroupMember(${userId}) is not expected to succeed for user ${user.id} in group ${groupId}`;
        return checkJSONResponse(response, msg, expectedStatusCode, ConsentGroupMember);
    }

    /**
     * Add or replace a user in the group
     * @param user Must be a group owner
     * @param groupId Group in which to add/replace the member.
     * @param newUser The new user information that will be updated
     * @param expectedStatusCode 
     */
    static async setGroupMember(user: User, groupId: ConsentGroup | string, newUser: ConsentGroupMember, expectedStatusCode: number = 202) {
        const response = await CafienneService.post(`/consent-group/${groupId}/members`, user, newUser.toJson());
        const msg = `SetGroupMember is not expected to succeed for user ${user.id} in consent group ${groupId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * 
     * @param user Must be a group owner
     * @param groupId Group to remove the member from
     * @param userId User or id of user to be removed from the group.
     * @param expectedStatusCode 
     * @returns 
     */
    static async removeGroupMember(user: User, groupId: ConsentGroup | string, userId: User | string, expectedStatusCode: number = 202) {
        const response = await CafienneService.delete(`/consent-group/${groupId}/members/${userId}`, user);
        const msg = `RemoveGroupMember ${userId} from group ${groupId} is not expected to succeed for user ${user.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }
}
