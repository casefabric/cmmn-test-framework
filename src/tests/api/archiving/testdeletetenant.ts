'use strict';

import StorageService from '../../../service/storage/storageservice';
import TenantEvents from '../../../service/storage/tenantevents';
import TenantService from '../../../service/tenant/tenantservice';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';

export default class TestDeleteTenant extends TestCase {
  isDefaultTest = false;

  async run() {
    const tenant = "abcde";
    const worldwideTenant = new WorldWideTestTenant(tenant);
    const user = worldwideTenant.sender;

    console.log(`Creating tenant ${tenant}`);
    await worldwideTenant.create();
    this.addIdentifier(tenant);
    await TenantService.getTenantOwners(user, tenant).then(owners => console.log(`Found ${owners.length} tenant owners`));
    const tenantEvents = new TenantEvents(user, tenant);
    await tenantEvents.loadEvents();    

    console.log(`  Succesfully created tenant ${tenant}, resulting in ${tenantEvents.totalEventCount} events`);
    console.log(`>>>>>>>> DELETING TENANT ${tenant}`);

    await StorageService.deleteTenant(user, tenant);

    await tenantEvents.assertDeleted();

    // Check that we cannot again delete the tenant
    await StorageService.deleteTenant(user, tenant, 404);

    // Check that we cannot get the tenant owners
    await TenantService.getTenantOwners(user, tenant, 404, 'It should not be possible to retrieve tenant owners when the tenant is deleted');

    // await SomeTime(1000, `Trying to create the same tenant "${tenant}" again `);
    await worldwideTenant.create();
    await TenantService.getTenantOwners(user, tenant).then(owners => console.log(`Found ${owners.length} tenant owners`));

    console.log(`>>>>>>>> DELETING TENANT ${tenant} AGAIN`);
    await StorageService.deleteTenant(user, tenant);

    await tenantEvents.assertDeleted();

    await TenantService.getTenantOwners(user, tenant, 404, 'It should not be possible to retrieve tenant owners when the tenant is deleted');
  }
}
