import User from "../framework/user";
import TenantUser from "../framework/tenant/tenantuser";
import Tenant from "../framework/tenant/tenant";
import { ServerSideProcessing, SomeTime } from "../framework/test/time";
import PlatformService from "../framework/service/platform/platformservice";

const platformService = new PlatformService();

/**
 * Simple test tenant to avoid duplicate code
 */
export default class WorldWideTestTenant {
    sender = new TenantUser('sending-user', ['Sender'], 'sender', 'sender@senders.com');
    receiver = new TenantUser('receiving-user', ['Receiver'], 'receiver', 'receiver@receivers.com')
    tenant: Tenant = new Tenant(this.name, []);

    constructor(public readonly name: string = 'World-Wide-Test-Tenant', public platformAdmin: User = new User('admin')) {

    }

    /**
     * Creates the tenant, and logs in for sender user and receiver user.
     */
    async create() {
        this.tenant.owners = [this.sender, this.receiver];
        await this.platformAdmin.login();
        const response = await platformService.createTenant(this.platformAdmin, this.tenant);
        if (response.status === 204) {
            await ServerSideProcessing('Giving server time to handle tenant creation');
        } else {
        }
        try {
            await this.sender.login();
        } catch (error) {
            await ServerSideProcessing('Giving server even more time to handle the tenant creation');
            await this.sender.login();
        }
        await this.receiver.login();
    }
}