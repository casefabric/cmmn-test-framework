'use strict';

import { assertCasePlan, SomeTime } from '@cafienne/typescript-client';
import Case from '@cafienne/typescript-client/cmmn/case';
import State from '@cafienne/typescript-client/cmmn/state';
import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import User from '@cafienne/typescript-client/user';
import ArchiveService from '../../../framework/archiving/archiveservice';
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
   
    await checkCaseAvailability(user, caseInstance);

    await SomeTime(1000, 'Giving engine time to fill QueryDB');

    console.log(">>>>>>>> DELETING Case " + caseInstance.id);

    await ArchiveService.deleteCase(user, caseInstance);

    await CaseService.getDiscretionaryItems(user, caseInstance, 404);
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
}

function print(indent: string, msg: string) {
  console.log(indent + msg)
}
