'use strict';

import Case from '../../../cmmn/case';
import Definitions from '../../../cmmn/definitions/definitions';
import State from '../../../cmmn/state';
import CaseTeam from '../../../cmmn/team/caseteam';
import CaseTeamGroup, { GroupRoleMapping } from '../../../cmmn/team/caseteamgroup';
import { CaseOwner } from '../../../cmmn/team/caseteamuser';
import CaseService from '../../../service/case/caseservice';
import CaseTeamService from '../../../service/case/caseteamservice';
import ConsentGroup from '../../../service/consentgroup/consentgroup';
import { ConsentGroupOwner } from '../../../service/consentgroup/consentgroupmember';
import ConsentGroupService from '../../../service/consentgroup/consentgroupservice';
import CaseEvents from '../../../service/storage/caseevents';
import ConsentGroupEvents from '../../../service/storage/consentgroupevents';
import StorageService from '../../../service/storage/storageservice';
import TenantEvents from '../../../service/storage/tenantevents';
import TenantService from '../../../service/tenant/tenantservice';
import TestCase from '../../../test/testcase';
import { PollUntilSuccess, SomeTime } from '../../../test/time';
import Util from '../../../test/util';
import WorldWideTestTenant from '../../worldwidetesttenant';

const tenant = Util.generateId('TestTenantWithContent_');
const worldwideTenant = new WorldWideTestTenant(tenant);
const user = worldwideTenant.sender;
const definition = Definitions.ComplexCase;

export default class TestDeleteTenantWithContent extends TestCase {
  isDefaultTest = false;
  // lineReaderEnabled = true;

  private otherTenants: Array<string> = Util.generateIds(2, 'other_tenant_');
  private otherCases: Array<Case> = [];
  private tenantCases: Array<CaseEvents> = [];
  private tenantGroups: Array<string> = Util.generateIds(3, 'temp_group_');
  private groupOwner = new ConsentGroupOwner(user.id, ['OwnerRole', 'GroupRole']); // Sender
  private groupTemplate = new ConsentGroup([this.groupOwner]);

  async onPrepareTest() {
    await worldwideTenant.create();
    await definition.deploy(user, tenant);
    this.addIdentifier(tenant);
  }

  async run() {
    await this.createOtherTenants();
    await this.createGroups();
    await this.createCasesInOtherTenants();

    await this.createTenantCases();
    const caseHierarchy = this.tenantCases[0];
    await caseHierarchy.load();

    // The process task deep down in complexcase needs time to fail. We should await that - but only if there is such a process task
    caseHierarchy.findProcessTask('GetList')?.assertState(State.Failed);

    await caseHierarchy.loadEventHierarchy();
    console.log("Total event count on first case: " + caseHierarchy.totalEventCount);

    this.readLine(`Press enter to delete tenant ${tenant} with ${this.tenantCases.length} case instances`);

    // Deleting the tenant should fail, because the groups are still in use by cases in other tenants
    await StorageService.deleteTenant(user, tenant, 400);

    // Now remove those groups from those cases, and try again.
    await this.removeConsentGroupsFromCasesOutsideTenant();
    await StorageService.deleteTenant(user, tenant);

    // Lets poll the engine until the tenant is succesfully deleted
    await PollUntilSuccess(async () => {
      await TenantService.getTenantOwners(user, tenant, 404, 'It should not be possible to retrieve tenant owners when the tenant is deleted');
    }, `Checking existence of tenant ${tenant}`);

    // Then the cases also must have been deleted, let's try on the first one ...
    await PollUntilSuccess(async () => {
      await CaseService.getDiscretionaryItems(user, caseHierarchy.id, 404, 'It should not be possible to retrieve discretionary items of the case');
    }, `Check existence of case ${caseHierarchy.id}`);

    // And do the same verification on the last consent group.
    await PollUntilSuccess(async () => {
      await ConsentGroupService.getGroup(user, this.tenantGroups[2], 404);
    }, `Check existence of consent group ${this.tenantGroups[2]}`);

    // Now verify that our case hierarchy has no events left in the event journal.
    await caseHierarchy.loadEventHierarchy();
    console.log("Total event count of first case in the tenant (expecting 0 events): " + caseHierarchy.totalEventCount);
    if (caseHierarchy.totalEventCount > 0) {
      throw new Error(`Did not expect to find any events in the case, but found ${caseHierarchy.totalEventCount}:\n${caseHierarchy.printEvents()}`)
    }

    const tenantStorage = new TenantEvents(user, tenant);
    await tenantStorage.loadEvents();
    console.log("Total event count of the tenant (expecting 0 events): " + tenantStorage.totalEventCount);
    if (tenantStorage.totalEventCount > 0) {
      throw new Error(`Did not expect to find any events in the tenant, but found ${tenantStorage.totalEventCount}:\n${tenantStorage.printEvents()}`)
    }

    const groupStorage = new ConsentGroupEvents(user, this.tenantGroups[0]);
    await groupStorage.loadEvents();
    console.log("Total event count of the first group in the tenant (expecting 0 events): " + groupStorage.totalEventCount);
    if (tenantStorage.totalEventCount > 0) {
      throw new Error(`Did not expect to find any events in the group, but found ${groupStorage.totalEventCount}:\n${groupStorage.printEvents()}`)
    }
  }

  async createOtherTenants() {
    await Promise.all(this.otherTenants.map(async tenant => {
      await new WorldWideTestTenant(tenant).create();
      await TenantService.getTenantOwners(user, tenant);
    }));
  }

  async createGroups() {
    await Promise.all(this.tenantGroups.map(async groupId => {
      this.groupTemplate.id = groupId;
      await ConsentGroupService.createGroup(user, tenant, this.groupTemplate).then(id => this.addIdentifier(groupId)).then(id => ConsentGroupService.getGroup(user, groupId));
    }));
  }

  async createCasesInOtherTenants() {
    const startCaseCreator = async (numCases: number = 1, otherTenant: number, groupId: number, additionalGroupId: number = -1) => {
      const tenant = this.otherTenants[otherTenant];
      const caseTeam = new CaseTeam([new CaseOwner(user)], [new CaseTeamGroup(this.tenantGroups[groupId], [new GroupRoleMapping('OwnerRole', ['role'])])]);
      if (additionalGroupId > -1) caseTeam.groups.push(new CaseTeamGroup(this.tenantGroups[additionalGroupId], [new GroupRoleMapping('OwnerRole', ['role'])]))
      const promises: Array<Promise<any>> = [];
      while (numCases --) promises.push(CaseService.startCase(user, { tenant, definition, caseTeam }).then(id => CaseService.getCase(user, id)).then(cs => this.otherCases.push(cs)));
      await Promise.all(promises);
    }

    await startCaseCreator(3, 0, 1, 0);
    await startCaseCreator(7, 1, 1);
    await startCaseCreator(2, 1, 2, 1);
    await startCaseCreator(1, 1, 0, 1);
  }

  async removeConsentGroupsFromCasesOutsideTenant() {
    const groupRemover = async (caseId: string | Case) => {
      // Fetch the case team
      const caseTeam = await CaseTeamService.getCaseTeam(user, caseId);
      const groupsInCase = caseTeam.groups.map(group => group.groupId);
      await Promise.all(groupsInCase.map(async groupId => await CaseTeamService.removeGroup(user, caseId, groupId)));
      await PollUntilSuccess(async () => {
        await CaseService.getCase(user, caseId).then(caseInstance => {
          if (caseInstance.team.groups.length > 0) {
            throw new Error(`Groups are expected to vanish from the team in case ${caseId}`)
          }
        })  
      });
    }

    await Promise.all(this.otherCases.map(async caseId => await groupRemover(caseId)));
  }

  async createTenantCases() {
    const rootCases = await CaseService.getCases(user, { tenant, numberOfResults: 10000 }).then(cases => cases.filter(c => !c.parentCaseId));
    const cases = rootCases.map(caseInstance => CaseEvents.from(user, caseInstance));
    this.tenantCases.push(...cases);

    const inputs = {
      Greeting: {
        Message: 'Hello there',
        From: user.id
      }
    };
    // Also add one of the groups of the tenant to the case. This should lead validate that it is ok to delete groups if they are member of cases of the tenant to be deleted
    const caseTeam = new CaseTeam([new CaseOwner(user)], [new CaseTeamGroup(this.tenantGroups[0], [new GroupRoleMapping('OwnerRole', ['role'])])]);

    const startCase = { tenant, definition, inputs, caseTeam };
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
        this.readLine("Confirm that we create " + count + " cases of type " + file)
      }

      const definition = new Definitions(file);
      await definition.deploy(user, tenant);
      startCase.definition = definition;
    }

    while (count-- > 0) {
      const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
      this.addIdentifier(caseInstance);
      this.tenantCases.push(CaseEvents.from(user, caseInstance));
    }
  }
}
