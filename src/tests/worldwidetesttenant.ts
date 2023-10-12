import User from "../user";
import TenantUser, { TenantOwner } from "../tenant/tenantuser";
import Tenant from "../tenant/tenant";
import PlatformService from "../service/platform/platformservice";
import TenantService from "../service/tenant/tenantservice";

/**
 * Simple test tenant to avoid duplicate code
 */
export default class WorldWideTestTenant {
    private wrapper: TenantWrapper;
    get sender() {
        return this.wrapper.sender;
    }
    get receiver() {
        return this.wrapper.receiver;
    }
    get employee() {
        return this.wrapper.employee;
    }
    get tenant(): Tenant {
        return this.wrapper.tenant;
    }

    constructor(public readonly name: string = 'World-Wide-Test-Tenant', public platformAdmin: User = new User('admin')) {
        this.wrapper = TenantWrapper.get(name, platformAdmin);
    }

    /**
     * Creates the tenant, and logs in for sender user and receiver user.
     */
    async create() {
        await this.wrapper.create();
    }

    /**
     * Resets and clears any cached information on the creation of this tenant.
     * This is typically invoked from the StorageService upon successfull tenant deletion.
     * @param tenant 
     */
    static reset(tenant: Tenant | string) {
        TenantWrapper.reset(tenant);
    }
}

class TenantWrapper {
    private static wrappers: Array<TenantWrapper> = [];

    static get(name: string, platformAdmin: User): TenantWrapper {
        const existingWrapper = this.wrappers.find(wrapper => wrapper.name === name);
        if (existingWrapper) {
            return existingWrapper;
        } else {
            const newWrapper = new TenantWrapper(name, platformAdmin);
            this.wrappers.push(newWrapper);
            return newWrapper;
        }
    }

    static reset(tenant: Tenant | string) {
        const existingWrapper = this.wrappers.find(wrapper => wrapper.name === '' + tenant);
        if (existingWrapper) {
            existingWrapper.resetCreationState();
        }
    }

    sender = new TenantOwner('sending-user', ['Sender'], 'sender', 'sender@senders.com');
    receiver = new TenantOwner('receiving-user', ['Receiver'], 'receiver', 'receiver@receivers.com');
    employee = new TenantUser('employee', ['Employee'], 'another employee', 'without any email address');
    tenant: Tenant = new Tenant(this.name, [this.sender, this.receiver, this.employee]);
    private created: boolean = false;
    private creating: boolean = false;
    private waiters: Array<Function> = [];

    constructor(public readonly name: string, public platformAdmin: User) { }

    resetCreationState() {
        this.created = false;
        this.creating = false;
    }

    /**
     * Creates the tenant, and logs in for sender user and receiver user.
     */
    async create() {
        if (this.created) {
            if (!this.sender.token) {
                await this.sender.login();

            }
            await TenantService.getTenantOwners(this.sender, this.tenant);
        } else if (this.creating) {
            // Start waiting until the other calls are done
            await new Promise((resolve, reject) => this.waiters.push(resolve));
        } else {
            this.creating = true;
            await this.platformAdmin.login();
            await PlatformService.createTenant(this.platformAdmin, this.tenant);
            await this.sender.login();
            await this.receiver.login();
            await this.employee.login();
            this.created = true;
            this.waiters.forEach(waiter => waiter());
        }
    }
}
