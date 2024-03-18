import ConsentGroup from "../../service/consentgroup/consentgroup";
import { ConsentGroupOwner } from "../../service/consentgroup/consentgroupmember";
import ConsentGroupService from "../../service/consentgroup/consentgroupservice";
import PlatformService from "../../service/platform/platformservice";
import Tenant from "../../tenant/tenant";
import TenantUser, { TenantOwner } from "../../tenant/tenantuser";
import Util from "../../test/util";
import User from "../../user";

export default class RandomTenant extends Tenant {
    private owner?: TenantUser;
    private groups: Array<ConsentGroup> = [];

    constructor(prefix: string = 'random_tenant_', users: Array<TenantUser> = []) {
        super(Util.generateId(prefix, 5), users);
    }

    addUser<T extends TenantUser>(user: T): T {
        this.users.push(new RandomTenantUser(user));
        return user;
    }

    async create(platformOwner: User) {
        const findOwner = () => {
            const existingUser = this.users.find(u => u.id === platformOwner.id);
            if (existingUser) {
                return existingUser;
            } else {
                const newUser = new TenantOwner(platformOwner.id, []);
                this.users.push(newUser);
                return newUser;
            }
        }

        this.owner = findOwner();
        this.owner.isOwner = true;
        await this.owner.login();
        await PlatformService.createTenant(this.owner, this);
        await this.groups.forEach(async group => {
            await this.createGroup(group)
            await group.members.forEach(async member => await member.login());
        });
        await this.users.forEach(async user => await user.login());
    }

    /**
     * Add a group that is owned by at least the tenant owner.
     * @param group 
     */
    addGroup<G extends ConsentGroup>(group: G): G {
        this.groups.push(group);
        return group;
    }

    /**
     * Add a group that is owned by at least the tenant owner.
     * @param group 
     */
    async createGroup(group: ConsentGroup) {
        if (!this.owner) {
            throw new Error('Owner is not yet available for creation of group');
        }
        const groupOwner = group.members.find(m => m.id === this.owner?.id);
        if (groupOwner) {
            groupOwner.isOwner = true; // Enforce it to be a group owner
        } else {
            group.members.push(new ConsentGroupOwner(this.owner.id));
        }

        await ConsentGroupService.createGroup(this.owner, this, group);
    }
}

class RandomTenantUser extends TenantUser {
    constructor(private user: TenantUser) {
        super(user.id, user.roles);
    }

    async login() {
        await this.user.login();
        return super.login();
    }
}
