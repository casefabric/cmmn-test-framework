'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import State from '../../../cmmn/state';
import CaseService from '../../../service/case/caseservice';
import StartCase from '../../../service/case/startcase';
import CaseEvents from '../../../service/storage/caseevents';
import StorageService from '../../../service/storage/storageservice';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';
import {SomeTime} from "../../../test/time";

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const helloworld = Definitions.HelloWorld;
const complexcase = Definitions.ComplexCase;

export default class TestArchiveCase extends TestCase {
  isDefaultTest = false;
  isParallelTest: boolean = false;
  // lineReaderEnabled = true;

  async onPrepareTest() {
    await worldwideTenant.create();
    await helloworld.deploy(user, tenant);
    await complexcase.deploy(user, tenant);
  }

  async run() {
    await this.test(helloworld);
    await this.test(complexcase);
  }

  async test(definition: Definitions) {
    const startCase = { tenant, definition, debug: true } as StartCase;

    const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
    this.addIdentifier(caseInstance);
    const caseHierarchy = CaseEvents.from(user, caseInstance);
    await caseHierarchy.load();

    this.readLine(`Press enter to start test loop on ${definition} with case hierarchy\n ${caseHierarchy}`);

    // The process task deep down in complexcase needs time to fail. We should await that.
    caseHierarchy.findProcessTask('GetList')?.assertState(State.Failed);

    while (true) {
      const line = this.readLine("Type p and press Enter to print event hierarchy. Press enter to archive the case ");
      if (line.indexOf('p') >= 0) {
        await caseHierarchy.loadEventHierarchy();
        console.log("Events: " + caseHierarchy.printEvents());
      } else {
        break;
      }
    }

    await StorageService.archiveCase(user, caseInstance);

    await caseHierarchy.assertArchived();
    await caseHierarchy.assertArchivedHierarchy();

    console.log("Events: " + caseHierarchy.printEvents());
    this.readLine("Case is fully archived; press enter to continue assertion tests");

    // Getting the case should not be possible, as it is archived (this tests query database removal)
    await SomeTime(5000);
    await CaseService.getCase(user, caseInstance, 404);

    // Also not possible to get the discretionary items should not be possible (this checks Case ModelActor removed from memory)
    await CaseService.getDiscretionaryItems(user, caseInstance, 404);

    // Now validate that it is not possible to create a new case instance with the same id as the archived case has.
    startCase.caseInstanceId = caseInstance.id;
    await CaseService.startCase(user, startCase, 400);

    // Now restore the case.
    await StorageService.restoreCase(user, caseInstance);

    // This asserts that the discretionary items of the case can be retrieved and that the query database is filled again
    await caseHierarchy.assertRestored();
  }
}
