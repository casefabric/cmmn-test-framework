'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import State from '../../../cmmn/state';
import CaseService from '../../../service/case/caseservice';
import StorageService from '../../../service/storage/storageservice';
import CaseEvents from '../../../service/storage/caseevents';
import TestCase from '../../../test/testcase';
import { PollUntilSuccess, SomeTime } from '../../../test/time';
import WorldWideTestTenant from '../../worldwidetesttenant';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;
const definition = Definitions.ComplexCase;

export default class TestDeleteCase extends TestCase {
  isDefaultTest = false;

  async onPrepareTest() {
    await worldwideTenant.create();
    await definition.deploy(user, tenant);
  }

  async run() {
    const startCase = { tenant, definition };

    const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
    this.addIdentifier(caseInstance);
    const caseHierarchy = CaseEvents.from(user, caseInstance);
    await caseHierarchy.load();

    // The process task deep down in complexcase needs time to fail. We should await that.
    caseHierarchy.findProcessTask('GetList')?.assertState(State.Failed);

    console.log(">>>>>>>> DELETING Case " + caseInstance.id);

    await StorageService.deleteCase(user, caseInstance);

    await SomeTime(1000);

    await CaseService.getDiscretionaryItems(user, caseInstance, 404);

    await caseHierarchy.assertDeleted();
  }
}
