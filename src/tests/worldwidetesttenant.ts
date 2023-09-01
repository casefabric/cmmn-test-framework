import User from "../user";
import TenantUser, { TenantOwner } from "../tenant/tenantuser";
import Tenant from "../tenant/tenant";
import PlatformService from "../service/platform/platformservice";

/**
 * Simple test tenant to avoid duplicate code
 */
export default class WorldWideTestTenant {
    sender = new TenantOwner('sending-user', ['Sender'], 'sender', 'sender@senders.com');
    receiver = new TenantOwner('receiving-user', ['Receiver'], 'receiver', 'receiver@receivers.com');
    employee = new TenantUser('employee', ['Employee'], 'another employee', 'without any email address');
    tenant: Tenant = new Tenant(this.name, [this.sender, this.receiver, this.employee]);

    constructor(public readonly name: string = 'World-Wide-Test-Tenant', public platformAdmin: User = new User('admin')) {
    }

    /**
     * Creates the tenant, and logs in for sender user and receiver user.
     */
    async create() {
        await this.platformAdmin.login();
        await PlatformService.createTenant(this.platformAdmin, this.tenant);
        await this.sender.login();
        await this.receiver.login();
        await this.employee.login();
    }
}