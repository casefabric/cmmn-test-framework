import User from "../user";

export default class TenantUser {
    userId: string;
    roles: String[];
    name: string;
    email: string;

    constructor(user:User, roles:Array<String>, name: string, email: string) {
        this.userId = user.id;
        this.roles = roles;
        this.name = name;
        this.email = email;
    }
}