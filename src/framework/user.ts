import TokenService from './service/platform/tokenservice';
import TenantService from './service/tenant/tenantservice';
import UserInformation from './tenant/userinformation';
import PlatformService from './service/platform/platformservice';

const tokenService = new TokenService();
const platformService = new PlatformService();

export default class User {
    /**
     * Current user token. Is available upon login of the user.
     */
    token?: string;
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

    /**
     * Login the user in 2 steps:
     * - first fetch a token from the token service,
     * - then invoke tenant service to retrieve the user information.
     * 
     * The second call fails if the user is not (yet) registered in the case system.
     */
    async login() {
        this.token = await tokenService.getToken(this);
        this.userInformation = await platformService.getUserInformation(this);
        return this;
    }
}