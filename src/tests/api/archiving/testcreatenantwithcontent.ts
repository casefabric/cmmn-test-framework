'use strict';

import { SomeTime } from '@cafienne/typescript-client';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import TenantService from '@cafienne/typescript-client/service/tenant/tenantservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';

const tenant = "abcde";
const wrapper = new WorldWideTestTenant(tenant);
const user = wrapper.sender;
const definition = 'complexcase.xml';

export default class TestCreateTenantWithContent extends TestCase {
  isDefaultTest: boolean = false;

  async onPrepareTest() {
    await wrapper.create();
    await RepositoryService.validateAndDeploy(user, definition, tenant);
  }

  async run() {
    await TenantService.getTenantOwners(user, tenant).then(owners => console.log(`Found ${owners.length} tenant owners`));

    const inputs = {
      Greeting: {
        Message: 'Hello there',
        From: user.id
      }
    };

    const startCase = { tenant, definition, inputs, debug: true };

    // let count = 250;
    let count = 5;
    console.log(`>>>>>>>> CREATING ${count} CASES`);
    const cases = [];
    const now = new Date();
    while (count-- > 0) {

      const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
      cases.push(caseInstance);

      console.log(">>>>>>>> Create Case ID:\t" + caseInstance.id);
    }

    const casesCreated = new Date();

    await SomeTime(1000, "Check existence of tenant " + tenant);


    cases.forEach(async caseInstance => {

      console.log("Check existence of case " + caseInstance);

      await CaseService.getDiscretionaryItems(user, caseInstance);
    });

    const casesRetrieved = new Date();

    console.log(`Case creation took ${casesCreated.valueOf() - now.valueOf()}`)

  }
}