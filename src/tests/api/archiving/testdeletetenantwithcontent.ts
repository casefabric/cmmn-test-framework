'use strict';

import { SomeTime } from '@cafienne/typescript-client';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import TenantService from '@cafienne/typescript-client/service/tenant/tenantservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import ArchiveService from '../../../framework/archiving/archiveservice';
import WorldWideTestTenant from '../../worldwidetesttenant';


const tenant = "abcde";
const wrapper = new WorldWideTestTenant(tenant);
const user = wrapper.sender;
const definition = 'complexcase.xml';


export default class TestDeleteTenantWithContent extends TestCase {

  async onPrepareTest() {
    await wrapper.create();
    await RepositoryService.validateAndDeploy(user, definition, tenant);
  }

  async run() {
    const inputs = {
      Greeting: {
        Message: 'Hello there',
        From: user.id
      }
    };

    const startCase = { tenant, definition, inputs, debug: true };

    const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));

    console.log(">>>>>>>> Case ID:\t" + caseInstance.id);
    // return;

    await SomeTime(4000, "Giving system time to fill query db");

    console.log(">>>>>>>> DELETING TENANT");

    await ArchiveService.deleteTenant(user, tenant);

    await SomeTime(1000, "Check existence of tenant " + tenant);

    await TenantService.getTenantOwners(user, tenant, 404, 'It should not be possible to retrieve tenant owners when the tenant is deleted');

    console.log("Check existence of case " + caseInstance);

    await CaseService.getDiscretionaryItems(user, caseInstance, 404, 'It should not be possible to retrieve discretionary items of the case');

    console.log(">>>>>>>> Case ID:\t" + caseInstance.id);
  }
}