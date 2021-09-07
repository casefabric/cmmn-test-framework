import User from "../../user";

export class UpsertableConsentGroupMember extends User {
    /**
     * Simple wrapper for a ConsentGroup member.
     * It needs a userId, which must match the 'sub' inside the JWT token sent to the case engine.
     * The class User has an id, and this id is put inside the 'sub' of the token when the user logs in.
     * 
     * @param userId Typically filled from User.id.
     * @param roles Set of strings containing the names of the roles the user has within the tenant.
     * @param isOwner Optional flag to indicate that this user is a tenant owner
     */
    constructor(public userId: string, public roles?: Array<string>, public isOwner?: boolean) {
        super(userId);
    }
}

export default class ConsentGroupMember extends UpsertableConsentGroupMember {
    /**
     * Simple wrapper for a ConsentGroup member.
     * It needs a userId, which must match the 'sub' inside the JWT token sent to the case engine.
     * The class User has an id, and this id is put inside the 'sub' of the token when the user logs in.
     * 
     * @param userId Typically filled from User.id.
     * @param roles Set of strings containing the names of the roles the user has within the tenant.
     * @param isOwner Optional flag to indicate that this user is a tenant owner
     */
    constructor(public userId: string, public roles: Array<string> = [], public isOwner: boolean = false) {
        super(userId, roles, isOwner);
    }

    /**
     * Copies this user info, with overwriting the ownership with the given value
     * @param isOwner
     * @returns 
     */
    withOwnership(isOwner: boolean): ConsentGroupMember {
        return new ConsentGroupMember(this.userId, this.roles, isOwner);
    }

    /**
     * Copies this user info, with overwriting the roles with the new set
     * @param roles
     * @returns 
     */
    withRoles(...roles: Array<string>): ConsentGroupMember {
        return new ConsentGroupMember(this.userId, roles, this.isOwner);
    }

    withExtraRoles(...roles: Array<string>): ConsentGroupMember {
        return new ConsentGroupMember(this.userId, [...this.roles, ...roles], this.isOwner);
    }
}

export class ConsentGroupOwner extends ConsentGroupMember {
    constructor(public userId: string, public roles: Array<string> = []) {
        super(userId, roles, true);
    }
}