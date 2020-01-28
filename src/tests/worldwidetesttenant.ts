import User from "../framework/user";
import TenantService from "../framework/service/tenant/tenantservice";
import TenantUser from "../framework/tenant/tenantuser";
import Tenant from "../framework/tenant/tenant";
import Util from "../framework/test/util";

const tenantService = new TenantService();

/**
 * Simple test tenant to avoid duplicate code
 */
export default class WorldWideTestTenant {
    sender: User = new User('sending-user');
    receiver: User = new User('receiving-user');

    constructor(public readonly name: string = 'World-Wide-Test-Tenant', public platformAdmin: User = new User('admin')) {

    }

    async create() {
        const tenantUserSender = new TenantUser(this.sender.id, ['Sender'], 'sender', 'sender@senders.com');
        const tenantUserReceiver = new TenantUser(this.receiver.id, ['Receiver'], 'receiver', 'receiver@receivers.com');
        const owners = [tenantUserSender, tenantUserReceiver];
        const tenant = new Tenant(this.name, owners);
        await this.platformAdmin.login();
        const response = await tenantService.createTenant(this.platformAdmin, tenant);
        if (response.status !== 400) {
            const waitTime = 200;
            console.log(`Waiting ${waitTime} milliseconds after tenant creation`)
            await Util.holdYourHorses(200);
        } else {
        }
    }
}