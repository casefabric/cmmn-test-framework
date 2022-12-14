'use strict';

import { assertPlanItem } from '@cafienne/typescript-client';
import State from '@cafienne/typescript-client/cmmn/state';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import StartCase from '@cafienne/typescript-client/service/case/startcase';
import StorageService from '../../../framework/archiving/storageservice';
import CaseHierarchy from '../../../nextversion/casehierarchy';
import LineReader from '../../../nextversion/linereader';
import { TestCaseExtension } from '../../../nextversion/nextversion';
import WorldWideTestTenant from '../../worldwidetesttenant';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const helloworld = 'helloworld.xml';
const complexcase = 'complexcase.xml';
export default class TestArchiveCase extends TestCaseExtension {
  // lineReaderEnabled = true;

  async onPrepareTest() {
    await worldwideTenant.create();
    await RepositoryService.validateAndDeploy(user, helloworld, tenant);
    await RepositoryService.validateAndDeploy(user, complexcase, tenant);
  }

  async run() {
    await this.test(helloworld);
    await this.test(complexcase);
  }

  async test(definition: string) {
    const startCase = { tenant, definition, debug: true } as StartCase;

    const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
    const caseHierarchy = CaseHierarchy.from(user, caseInstance);
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

    // await caseHierarchy.mustBeArchived();
    await caseHierarchy.assertArchived();
    await caseHierarchy.loadEventHierarchy();
    if (!caseHierarchy.hasArchivedHierarchy()) {
      throw new Error('The case is not fully archived')
    } else {
      console.log("Events: " + caseHierarchy.printEvents());
      this.readLine("Case is fully archived; press enter to continue assertion tests");
    }    

    // Note: yet to decide whether we support retrieving the case to find out it is in state "Archived" or not.
    //  Assumption: it is not possible. Second (commented) statement below assumes it _is possible.
    await CaseService.getCase(user, caseInstance, 404);
    // await CaseService.getCase(user, caseInstance).then(caseInstance => print('', JSON.stringify(caseInstance, undefined, 2)));


    // Now validate that it is not possible to create a new case instance with the same id as the archived case has.
    startCase.caseInstanceId = caseInstance.id;
    await CaseService.startCase(user, startCase, 400);

    await CaseService.getDiscretionaryItems(user, caseInstance, 404);

    await StorageService.restoreCase(user, caseInstance);

    await caseHierarchy.assertRestored();
  }
}
