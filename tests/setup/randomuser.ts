import TenantUser from "../../src/tenant/tenantuser";
import Util from "../../src/util/util";
import User from "../../src/user";

export default class RandomUser extends TenantUser {
    constructor(id: string | User = Util.generateId('random_user_', 5), roles: Array<string> = []) {
        super('' + id, roles);
    }
}
