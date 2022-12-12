'use strict';

import { assertCasePlan, ServerSideProcessing, SomeTime } from '@cafienne/typescript-client';
import Case from '@cafienne/typescript-client/cmmn/case';
import State from '@cafienne/typescript-client/cmmn/state';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import StartCase from '@cafienne/typescript-client/service/case/startcase';
import TestCase from '@cafienne/typescript-client/test/testcase';
import User from '@cafienne/typescript-client/user';
import ArchiveService from '../../../framework/archiving/archiveservice';
import WorldWideTestTenant from '../../worldwidetesttenant';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

//*/
const definition = 'complexcase.xml';
/*/
const definition = 'helloworld.xml';
//*/

export default class TestArchiveCase extends TestCase {
  async onPrepareTest() {
    await worldwideTenant.create();
    await RepositoryService.validateAndDeploy(user, definition, tenant);
  }

  async run() {
    // await ArchiveService.restoreCase(user, 'ed0d977b_c2a3_4eac_a609_72fa1c475732');
    // return;

    const inputs = {
      Greeting: {
        Message: 'Hello there',
        From: user.id
      }
    };
    const startCase = { tenant, definition, debug: true } as StartCase;

    const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));

    // print('', JSON.stringify(caseInstance, undefined, 2))
    // return;
   
    await checkCaseAvailability(user, caseInstance);



    await SomeTime(1000, 'Giving engine time to fill QueryDB');

    console.log(">>>>>>>> DELETING Case " + caseInstance.id);

    await ArchiveService.archiveCase(user, caseInstance);

    // Note: yet to decide whether we support retrieving the case to find out it is in state "Archived" or not.
    //  Assumption: it is not possible. Second, commented statement below assumes it _is possible.
    await CaseService.getCase(user, caseInstance, 404);
    // await CaseService.getCase(user, caseInstance).then(caseInstance => print('', JSON.stringify(caseInstance, undefined, 2)));

    
    await SomeTime(10000, 'Giving engine time to archive the case');


    startCase.caseInstanceId = caseInstance.id;
    await CaseService.startCase(user, startCase, 400);

    await CaseService.getDiscretionaryItems(user, caseInstance, 404);

    await ArchiveService.restoreCase(user, caseInstance);
  }
}

async function checkCaseAvailability(user: User, caseId: string|Case, indent: string = '') {
  print(indent, `=== Checking active state of case ${caseId}`)
  const caseInstance = await assertCasePlan(user, caseId, State.Active) as Case;
  print(indent, ` case "${caseInstance.caseName}" has ${caseInstance.planitems.length} plan items`)

  const caseTasks = caseInstance.planitems.filter(item => item.type === 'CaseTask');

  print(indent, ` found ${caseTasks.length} sub cases`)

  for (const subCase of caseTasks) {
    await checkCaseAvailability(user, subCase.id, indent + '  ')
  }
  // await caseTasks.forEach(async subCase => await checkCaseAvailability(user, subCase.id, indent + ' '));


  const processTasks = caseInstance.planitems.filter(item => item.type === 'ProcessTask');
  print(indent, ` found ${processTasks.length} sub processes ${processTasks.map(p => p.id).join(', ')}`)
  // processTasks.forEach(subCase => checkCaseAvailability(user, subCase.id));

  return caseInstance;
}

function print(indent: string, msg: string) {
  console.log(indent + msg)
}
