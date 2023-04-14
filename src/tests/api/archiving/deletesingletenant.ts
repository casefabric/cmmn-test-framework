'use strict';

import StorageService from '@cafienne/typescript-client/service/storage/storageservice';
import TenantService from '@cafienne/typescript-client/service/tenant/tenantservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import User from '@cafienne/typescript-client/user';

export default class DeleteSingleTenant extends TestCase {
  isDefaultTest = false;
  lineReaderEnabled = true;


  async run() {
    const input = this.readLine(`\n\nEnter tenant and optional user (leave blank to cancel script): `);
    if (! input || input.trim().length == 0) {
      console.log('\nTenant not entered, cancelling script');
      return;
    }
    
    const strings = input.split(' ');
    const tenant = strings[0];
    const userId = strings.length > 1 ? strings[1] : "sending-user";
    const user = new User(userId);

    this.readLine(`\nPress enter to delete tenant ${tenant} (user '${user}' should be tenant owner)`);

    await user.login();

    await StorageService.deleteTenant(user, tenant);

    this.readLine(`\nTenant deletion is initiated. Press enter to fetch it and assure it is deleted`);


    await TenantService.getTenantOwners(user, tenant, 404, 'It should not be possible to retrieve tenant owners when the tenant is deleted');
  }
}
