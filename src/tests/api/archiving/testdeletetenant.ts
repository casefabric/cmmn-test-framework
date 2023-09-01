'use strict';

import StorageService from '../../../service/storage/storageservice';
import TenantService from '../../../service/tenant/tenantservice';
import TestCase from '../../../test/testcase';
import { SomeTime } from '../../../test/time';
import WorldWideTestTenant from '../../worldwidetesttenant';

export default class TestDeleteTenant extends TestCase {
  isDefaultTest = false;

  async run() {
    const tenant = "abcde";
    const wrapper = new WorldWideTestTenant(tenant);
    const user = wrapper.sender;

    console.log(`Creating tenant ${tenant}`);
    await wrapper.create();
    this.addIdentifier(tenant);
    await TenantService.getTenantOwners(user, tenant).then(owners => console.log(`Found ${owners.length} tenant owners`));

    console.log(`  Succesfully created tenant ${tenant}`);
    console.log(`>>>>>>>> DELETING TENANT ${tenant}`);

    await StorageService.deleteTenant(user, tenant);

    await SomeTime(2000, "Awaiting engine to clean all data on tenant " + tenant);

    // Check that we cannot again delete the tenant
    await StorageService.deleteTenant(user, tenant, 404);

    await SomeTime(1000, "Check existence of tenant " + tenant);

    // Check that we cannot get the tenant owners
    await TenantService.getTenantOwners(user, tenant, 404, 'It should not be possible to retrieve tenant owners when the tenant is deleted');

    await SomeTime(1000, `Trying to create the same tenant "${tenant}" again `);
    await wrapper.create();
    await TenantService.getTenantOwners(user, tenant).then(owners => console.log(`Found ${owners.length} tenant owners`));

    console.log(`>>>>>>>> DELETING TENANT ${tenant} AGAIN`);
    await StorageService.deleteTenant(user, tenant);

    await SomeTime(1000, `Giving engine some time before checking existence of tenant ${tenant}`);

    await TenantService.getTenantOwners(user, tenant, 404, 'It should not be possible to retrieve tenant owners when the tenant is deleted');
  }
}
