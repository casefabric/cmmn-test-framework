'use strict';

import Definitions from '../../../src/cmmn/definitions/definitions';
import State from '../../../src/cmmn/state';
import CaseTeam from '../../../src/cmmn/team/caseteam';
import CaseTeamGroup, { GroupRoleMapping, GroupRoleMappingWithCaseOwnership } from '../../../src/cmmn/team/caseteamgroup';
import CaseTeamUser, { CaseOwner } from '../../../src/cmmn/team/caseteamuser';
import CaseService from '../../../src/service/case/caseservice';
import ConsentGroup from '../../../src/service/consentgroup/consentgroup';
import { ConsentGroupOwner } from '../../../src/service/consentgroup/consentgroupmember';
import ConsentGroupService from '../../../src/service/consentgroup/consentgroupservice';
import PlatformService from '../../../src/service/platform/platformservice';
import CaseEvents from '../../../src/service/storage/caseevents';
import StorageService from '../../../src/service/storage/storageservice';
import Tenant from '../../../src/tenant/tenant';
import { TenantOwner } from '../../../src/tenant/tenantuser';
import TestCase from '../../../src/test/testcase';
import Util from '../../../src/util/util';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const groupId = Util.generateId('group-');
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;
const definition = Definitions.HelloWorld;
const userInGroup1 = new TenantOwner(Util.generateId('user_in_group_1_'));
const userInGroup2 = new TenantOwner(Util.generateId('user_in_group_2_'));
const otherTenant = new Tenant(Util.generateId('tenant-'), [new TenantOwner(sender.id), userInGroup1, userInGroup2]);
const group1 = new ConsentGroup([new ConsentGroupOwner(userInGroup1.id, ['User1Role'])], Util.generateId('group_1_'));
const group2 = new ConsentGroup([new ConsentGroupOwner(userInGroup2.id, ['User2Role'])], Util.generateId('group_2_'));

export default class TestDeleteCaseAuthorization extends TestCase {
  isDefaultTest = false;

  
  async onPrepareTest() {
    await worldwideTenant.create();
    await worldwideTenant.platformAdmin.login();
    await PlatformService.createTenant(worldwideTenant.platformAdmin, otherTenant);
    await userInGroup1.login();
    await userInGroup2.login();
    await this.createGroups();
    await definition.deploy(sender, tenant);
  }

  async run() {
    const caseTeam = new CaseTeam([new CaseOwner(sender), new CaseTeamUser(employee)], [new CaseTeamGroup(group1, [new GroupRoleMapping('User1Role', ['ADMIN'])]), 
    new CaseTeamGroup(group2, [new GroupRoleMappingWithCaseOwnership('User2Role', [])])] )
    const startCase = { tenant, definition, caseTeam };

    const caseInstance = await CaseService.startCase(sender, startCase).then(id => CaseService.getCase(sender, id));
    // return;
    this.addIdentifier(caseInstance);
    const caseHierarchy = CaseEvents.from(sender, caseInstance);
    await caseHierarchy.load();

    // The process task deep down in complexcase needs time to fail. We should await that.
    await caseHierarchy.findProcessTask('GetList')?.assertState(State.Failed);

    console.log(">>>>>>>> DELETING Case " + caseInstance.id);

    await StorageService.deleteCase(userInGroup1, caseInstance, 401); // userInGroup1 is not allowed as he is not tenant owner and also not case owner
    await StorageService.deleteCase(employee, caseInstance, 401); // Employee should not be allowed as he is not tenant owner and also not case owner
    await StorageService.deleteCase(receiver, caseInstance, 404); // Receiver should not be allowed as he is tenant owner, but not a case owner
    // await StorageService.deleteCase(userInGroup2, caseInstance);

    // await caseHierarchy.assertDeleted();
  }

  async createGroups() {  
      // Create groups in the other tenant
      await ConsentGroupService.createGroup(userInGroup1, otherTenant.name, group1).then(id => this.addIdentifier(groupId)).then(id => ConsentGroupService.getGroup(userInGroup1, group1));
      await ConsentGroupService.createGroup(userInGroup1, otherTenant.name, group2).then(id => this.addIdentifier(groupId)).then(id => ConsentGroupService.getGroup(userInGroup2, group2));
  }
}
