'use strict';

import { SomeTime } from '@cafienne/typescript-client';
import State from '@cafienne/typescript-client/cmmn/state';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import StorageService from '@cafienne/typescript-client/service/storage/storageservice';
import TenantService from '@cafienne/typescript-client/service/tenant/tenantservice';
import CaseHierarchy from '@cafienne/typescript-client/test/casehierarchy';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';

const tenant = "TestTenantWithContent";
const wrapper = new WorldWideTestTenant(tenant);
const user = wrapper.sender;
const definition = 'complexcase.xml';


export default class TestDeleteTenantWithContent extends TestCase {
  isDefaultTest = false;
  // lineReaderEnabled = true;

  async onPrepareTest() {
    await wrapper.create();
    await RepositoryService.validateAndDeploy(user, definition, tenant);
    this.addIdentifier(tenant);
  }

  async createCases(): Promise<Array<CaseHierarchy>> {
    const rootCases = await CaseService.getCases(user, { tenant, numberOfResults: 10000 }).then(cases => cases.filter(c => !c.parentCaseId));
    const cases = rootCases.map(caseInstance => CaseHierarchy.from(user, caseInstance));

    const inputs = {
      Greeting: {
        Message: 'Hello there',
        From: user.id
      }
    };

    const startCase = { tenant, definition, inputs, debug: true };
    const input = this.readLine(
      `\n\nTenant has ${cases.length} top level cases. Please enter the number of cases you want to be created\n` +
      'optionally with a trailing space and definition name. E.g. 1 complexcase.xml (this is the default when pressing enter)\n\n');
    let count = 1;
    let file = 'complexcase.xml';
    if (input) {
      const array = input.split(' ');
      if (array.length > 0) {
        const parsed = Number.parseInt(array[0]);
        if (Number.isInteger(parsed)) {
          count = parsed;
        }
      }
      if (array.length > 1) {
        file = array[1];

        this.readLine("Confirm that we create " + count +" cases of type " + file)
      }

      await RepositoryService.validateAndDeploy(user, file, tenant);
      startCase.definition = file;
    }

    while (count-- > 0) {
      const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
      this.addIdentifier(caseInstance);
      cases.push(CaseHierarchy.from(user, caseInstance));
    }

    return cases;
  }

  async run() {
    const newCases = await this.createCases();
    const caseHierarchy = newCases[0];
    await caseHierarchy.load();

    const currentTenantCases = await CaseService.getCases(user, { tenant, numberOfResults: 10000 });

    // The process task deep down in complexcase needs time to fail. We should await that.
    caseHierarchy.findProcessTask('GetList')?.assertState(State.Failed);

    await caseHierarchy.loadEventHierarchy();
    console.log("Total event count on first case: " + caseHierarchy.totalEventCount);

    this.readLine(`Press enter to delete tenant ${tenant} with ${currentTenantCases.length} case instances`);

    await StorageService.deleteTenant(user, tenant);

    await SomeTime(1000, "Check existence of tenant " + tenant);

    await TenantService.getTenantOwners(user, tenant, 404, 'It should not be possible to retrieve tenant owners when the tenant is deleted');

    console.log("Check existence of case " + caseHierarchy.id);

    await CaseService.getDiscretionaryItems(user, caseHierarchy.id, 404, 'It should not be possible to retrieve discretionary items of the case');

    // Now verify that our case hierarchy has no events left in the event journal.
    await caseHierarchy.loadEventHierarchy();
    console.log("\n\nTotal event count: " + caseHierarchy.totalEventCount);
    if (caseHierarchy.totalEventCount > 0) {
      throw new Error(`Did not expect to find any events in the case, but found ${caseHierarchy.totalEventCount}:\n${caseHierarchy.printEvents()}`)
    }

    console.log(">>>>>>>> Case ID:\t" + caseHierarchy.id);
  }
}