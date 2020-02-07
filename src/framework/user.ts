import TokenService from './service/platform/tokenservice';
import TenantService from './service/tenant/tenantservice';
import UserInformation from './tenant/userinformation';
import PlatformService from './service/platform/platformservice';
import Config from '../config';

const tokenService = new TokenService();
const platformService = new PlatformService();

export default class User {
    /**
     * A user without an id, i.e. id is an empty string.
     */
    static NONE = new User('');

    private token_property: string = '';
    /**
     * Information about the user as known within the case service
     * Is only available upon login of the user
     */
    userInformation?: UserInformation;

    /**
     * 
     * @param id Id of the user, with which is must be registered within the case system
     */
    constructor(public id: string) { }

    toString() {
        return this.id;
    }

    /**
     * Login the user in 2 steps:
     * - first fetch a token from the token service,
     * - then invoke tenant service to retrieve the user information.
     * 
     * The second call fails if the user is not (yet) registered in the case system.
     */
    async login() {
        await this.refreshToken();
        await this.refreshUserInformation();
        return this;
    }

    set token(newToken: string) {
        if (Config.TokenService.log) {
            if (this.token !== newToken) {
                if (!this.token) {
                    console.log(`Setting token for user ${this.id} to ${newToken}`);
                } else {
                    console.log(`Updating token for user ${this.id} to ${newToken}`);
                }
            } else {
                console.log(`New token for user ${this.id} is same as before`);
            }
        }

        this.token_property = newToken;
    }

    /**
     * Current user token. Is available upon login of the user.
     */
    get token() {
        return this.token_property;
    }

    /**
     * Clear current token of user.
     */
    clearToken() {
        if (Config.TokenService.log) {
            console.log(`Clearing token for user ${this.id}`);
        }
        this.token_property = '';
    }

    /**
     * Technical method to get/refresh a token for this user.
     */
    async refreshToken() {
        const newToken = await tokenService.getToken(this);
        this.token = newToken;
    }

    /**
     * Refresh the user information with latest from case engine.
     */
    async refreshUserInformation() {
        this.userInformation = await platformService.getUserInformation(this);
    }
}