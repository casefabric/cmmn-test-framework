import User from "../framework/user";
import TenantService from "../framework/service/tenantservice";
import Tenant from "../framework/tenant/tenant";
import TenantUser from "../framework/tenant/tenantuser";
import TestCase from "../framework/test/testcase";

const tenantName = 'helloworld';
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
        console.log('Running tenant registration test');
        const guid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const tenantName = 'test-tenant' + guid;

        const tenantOwner1 = new User('tenant-owner1');
        const tenantOwner2 = new User('tenant-owner2');
        const tenantOwner3 = new User('tenant-owner3');
        const tenant1 = new Tenant(tenantName, [new TenantUser(tenantOwner1.id),new TenantUser(tenantOwner2.id), new TenantUser(tenantOwner3.id)]);

        await platformAdmin.login();
        await tenantService.createTenant(tenantOwner1, tenant1).then(response => {
            if (response.ok) {
                throw new Error('Creation of tenant succeeded unexpectedly.');
            }
        });

        await tenantService.createTenant(platformAdmin, tenant1);
        console.log('Succesfully created tenant');

        await tenantService.createTenant(platformAdmin, tenant1).then(response => {
            if (response.ok) {
                throw new Error('Second creation of tenant succeeded unexpectedly.');
            }
        });

        await tenantService.getTenantOwners(platformAdmin, tenant1, true);

        await tenantOwner1.login();

        // // For now we wait 2 seconds, since backend has no sync-option for tenant registry
        // setTimeout(() => {
        //     tenantService.getTenantOwners(tenantOwner1, tenant1).then(owners => {
        //         console.log('Tenant owners: ', JSON.stringify(owners))
        //     });
    
        // }, 2000)

    }
}