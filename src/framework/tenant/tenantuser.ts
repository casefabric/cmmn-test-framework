import User from "../user";

export default class TenantUser extends User {
    /**
     * Simple wrapper for a TenantUser object.
     * It needs a userId, which must match the 'sub' inside the JWT token sent to the case engine.
     * The class User has an id, and this id is put inside the 'sub' of the token when the user logs in.
     * 
     * @param userId Typically filled from User.id.
     * @param roles Set of strings containing the names of the roles the user has within the tenant.
     * @param name Optional name for the user inside the tenant.
     * @param email Optional email for the user inside the tenant.
     */
    constructor(public userId: string, public roles: Array<string> = [], public name?: string, public email?: string) {
        super(userId);
     }
}