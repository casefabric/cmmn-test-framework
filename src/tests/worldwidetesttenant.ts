import User from "../framework/user";
import TenantUser, { TenantOwner } from "../framework/tenant/tenantuser";
import Tenant from "../framework/tenant/tenant";
import PlatformService from "../framework/service/platform/platformservice";

const platformService = new PlatformService();

/**
 * Simple test tenant to avoid duplicate code
 */
export default class WorldWideTestTenant {
    sender = new TenantOwner('sending-user', ['Sender'], 'sender', 'sender@senders.com');
    receiver = new TenantOwner('receiving-user', ['Receiver'], 'receiver', 'receiver@receivers.com')
    employee = new TenantUser('employee', ['Employee'], 'another employee', 'without any email address');
    tenant: Tenant = new Tenant(this.name, [this.sender, this.receiver, this.employee]);

    constructor(public readonly name: string = 'World-Wide-Test-Tenant', public platformAdmin: User = new User('admin')) {

    }

    /**
     * Creates the tenant, and logs in for sender user and receiver user.
     */
    async create() {
        await this.platformAdmin.login();
        await platformService.createTenant(this.platformAdmin, this.tenant);
        await this.sender.login();
        await this.receiver.login();
        await this.employee.login();
    }
}