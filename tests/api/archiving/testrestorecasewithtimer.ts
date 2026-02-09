'use strict';

import Definitions from '../../../src/cmmn/definitions/definitions';
import State from '../../../src/cmmn/state';
import CaseService from '../../../src/service/case/caseservice';
import StorageService from '../../../src/service/storage/storageservice';
import { assertPlanItem } from '../../../src/test/caseassertions/plan';
import TestCase from '../../../src/test/testcase';
import { PollUntilSuccess, SomeTime } from '../../../src/test/time';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;
const definition = Definitions.Timer;

export default class TestRestoreCaseWithTimer extends TestCase {
  isDefaultTest = false;

  async onPrepareTest() {
    await worldwideTenant.create();
    await definition.deploy(user, tenant);
  }

  async run() {
    const inputs = { duration: { value: 'PT8S' } };
    const startCase = { tenant, definition, inputs };

    const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));

    this.addIdentifier(caseInstance);

    await assertPlanItem(user, caseInstance, 'Task', -1, State.Available);

    await StorageService.archiveCase(user, caseInstance);

    await SomeTime(1000, `Awaiting archival of timer case ${caseInstance}`);

    await CaseService.getDiscretionaryItems(user, caseInstance, 404);

    await StorageService.restoreCase(user, caseInstance);

    await SomeTime(1000, `Awaiting restore of timer case ${caseInstance}`);

    await PollUntilSuccess(async () => {
      await CaseService.getDiscretionaryItems(user, caseInstance);
    }, `Check existence of case ${caseInstance}`);

    await SomeTime(3000, `Giving timer some room to occur before checking it went off`);

    await assertPlanItem(user, caseInstance, 'Task', -1, State.Active);
  }
}
