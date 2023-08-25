'use strict';

import { PollUntilSuccess, SomeTime } from '@cafienne/typescript-client';
import State from '@cafienne/typescript-client/cmmn/state';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import StorageService from '@cafienne/typescript-client/service/storage/storageservice';
import CaseHierarchy from '@cafienne/typescript-client/test/casehierarchy';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;
const definition = 'helloworld.xml';


export default class TestDeleteHelloworld extends TestCase {
  isDefaultTest = false;

  async onPrepareTest() {
    await worldwideTenant.create();
    await RepositoryService.validateAndDeploy(user, definition, tenant);
  }

  async run() {

    const inputs = {
      Greeting: {
        Message: 'Hello there',
        From: user.id
      }
    };
    const startCase = { tenant, definition, debug: true };

    const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
    this.addIdentifier(caseInstance);
    const caseHierarchy = CaseHierarchy.from(user, caseInstance);
    await caseHierarchy.load();

    console.log(">>>>>>>> DELETING Case " + caseInstance.id);

    await StorageService.deleteCase(user, caseInstance);

    await SomeTime(1000);

    await CaseService.getDiscretionaryItems(user, caseInstance, 404);

    await PollUntilSuccess(async () => {
      // Now verify that our case hierarchy has no events left in the event journal.
      await caseHierarchy.loadEventHierarchy();
      console.log("\n\nTotal event count: " + caseHierarchy.totalEventCount);
      if (caseHierarchy.totalEventCount > 0) {
        throw new Error(`Did not expect to find any events in the case, but found ${caseHierarchy.totalEventCount}:\n${caseHierarchy.printEvents()}`)
      }

    });
  }
}
