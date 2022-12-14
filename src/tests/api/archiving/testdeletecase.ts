'use strict';

import { assertCasePlan, PollUntilSuccess, SomeTime } from '@cafienne/typescript-client';
import Case from '@cafienne/typescript-client/cmmn/case';
import State from '@cafienne/typescript-client/cmmn/state';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import User from '@cafienne/typescript-client/user';
import StorageService from '../../../framework/archiving/storageservice';
import CaseHierarchy from '../../../nextversion/casehierarchy';
import WorldWideTestTenant from '../../worldwidetesttenant';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;
const definition = 'complexcase.xml';


export default class TestDeleteCase extends TestCase {
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
    const caseHierarchy = CaseHierarchy.from(user, caseInstance);
    await caseHierarchy.load();

    // The process task deep down in complexcase needs time to fail. We should await that.
    caseHierarchy.findProcessTask('GetList')?.assertState(State.Failed);

    console.log(">>>>>>>> DELETING Case " + caseInstance.id);

    await StorageService.deleteCase(user, caseInstance);

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
