import User from "../framework/user";
import TenantService from "../framework/service/tenant/tenantservice";
import Tenant from "../framework/tenant/tenant";
import TenantUser from "../framework/tenant/tenantuser";
import TestCase from "../framework/test/testcase";

const platformAdmin = new User('admin');

const tenantService = new TenantService();

export default class TestTenantRegistration extends TestCase {
    constructor() {
        super('Tenant Registration');
    }

    /**
     * @override
     */
    async run() {
        const guid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const tenantName = 'test-tenant' + guid;

        const tenantOwner1 = new User('tenant-owner1');
        const tenantOwner2 = new User('tenant-owner2');
        const tenantOwner3 = new User('tenant-owner3');
        const tenant1 = new Tenant(tenantName, [new TenantUser(tenantOwner1.id),new TenantUser(tenantOwner2.id), new TenantUser(tenantOwner3.id)]);

        await platformAdmin.login();

        // Creating tenant as tenantOwner should fail.
        await tenantService.createTenant(tenantOwner1, tenant1, true);

        // Creating tenant as platformOwner should succeed.
        await tenantService.createTenant(platformAdmin, tenant1);

        // Creating tenant again should fail
        await tenantService.createTenant(platformAdmin, tenant1, true)

        // Getting tenant owners as platformOwner should fail.
        await tenantService.getTenantOwners(platformAdmin, tenant1, true);

        console.log("Waiting 200 milliseconds after tenant creation before logging in the owner")
        const [arr] = await Promise.all([
            new Promise(resolve => setTimeout(resolve, 200))
        ]);
        console.log("Done with tenant creation and waiting")    

        await tenantOwner1.login();

        tenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
            console.log('Tenant owners: ', JSON.stringify(owners))
        });
    }
}