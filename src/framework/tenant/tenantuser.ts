import User from "../user";


export class UpsertableTenantUser extends User {
    /**
     * Simple wrapper for a TenantUser object.
     * It needs a userId, which must match the 'sub' inside the JWT token sent to the case engine.
     * The class User has an id, and this id is put inside the 'sub' of the token when the user logs in.
     * 
     * @param userId Typically filled from User.id.
     * @param roles Set of strings containing the names of the roles the user has within the tenant.
     * @param name Optional name for the user inside the tenant.
     * @param email Optional email for the user inside the tenant.
     * @param isOwner Optional flag to indicate that this user is a tenant owner
     * @param enabled Optional flag to indicate that the user account must be enabled/disabled
     * @param tenant Optional tenant name; is returned in server responses and can be used in expressions
     */
    constructor(public userId: string, public roles?: Array<string>, public name?: string, public email?: string, public isOwner?: boolean, public enabled?: boolean, public tenant?: string) {
        super(userId);
     }
}

export default class TenantUser extends UpsertableTenantUser {
    /**
     * Simple wrapper for a TenantUser object.
     * It needs a userId, which must match the 'sub' inside the JWT token sent to the case engine.
     * The class User has an id, and this id is put inside the 'sub' of the token when the user logs in.
     * 
     * @param userId Typically filled from User.id.
     * @param roles Set of strings containing the names of the roles the user has within the tenant.
     * @param name Optional name for the user inside the tenant.
     * @param email Optional email for the user inside the tenant.
     * @param isOwner Optional flag to indicate that this user is a tenant owner
     * @param enabled Optional flag to indicate that the user account must be enabled/disabled
     * @param tenant Optional tenant name; is returned in server responses and can be used in expressions
     */
    constructor(public userId: string, public roles: Array<string> = [], public name?: string, public email?: string, public isOwner: boolean = false, public enabled: boolean = true) {
        super(userId, roles, name, email, isOwner, enabled);
     }
}

export class TenantOwner extends TenantUser {
    constructor(public userId: string, public roles: Array<string> = [], public name?: string, public email?: string, public enabled: boolean = true) {
        super(userId, roles, name, email, true, enabled);
    }
}
