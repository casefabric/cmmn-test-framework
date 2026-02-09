'use strict';

import Definitions from '../../../src/cmmn/definitions/definitions';
import CaseService from '../../../src/service/case/caseservice';
import CaseEvents from '../../../src/service/storage/caseevents';
import StorageService from '../../../src/service/storage/storageservice';
import TestCase from '../../../src/test/testcase';
import { SomeTime } from '../../../src/test/time';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;
const definition = Definitions.HelloWorld;

export default class TestDeleteHelloworld extends TestCase {
  isDefaultTest = false;

  async onPrepareTest() {
    await worldwideTenant.create();
    await definition.deploy(user, tenant);
  }

  async run() {
    const startCase = { tenant, definition, debug: true }; // Also generate a DebugEvent and ensure it get's deleted as well
    const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
    this.addIdentifier(caseInstance);
    const caseHierarchy = CaseEvents.from(user, caseInstance);
    await caseHierarchy.load();

    console.log(">>>>>>>> DELETING Case " + caseInstance.id);

    await StorageService.deleteCase(user, caseInstance);

    await SomeTime(1000);

    await CaseService.getDiscretionaryItems(user, caseInstance, 404);

    await caseHierarchy.assertDeleted();
  }
}
