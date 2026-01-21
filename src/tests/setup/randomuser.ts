import TenantUser from "../../tenant/tenantuser";
import Util from "../../util/util";
import User from "../../user";

export default class RandomUser extends TenantUser {
    constructor(id: string | User = Util.generateId('random_user_', 5), roles: Array<string> = []) {
        super('' + id, roles);
    }
}
