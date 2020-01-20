'use strict';

import User from '../../../framework/user'
import CaseService from '../../../framework/service/case/caseservice';
import TaskService from '../../../framework/service/task/taskservice';
import Tenant from '../../../framework/tenant/tenant';
import TenantUser from '../../../framework/tenant/tenantuser';
import TenantService from '../../../framework/service/tenant/tenantservice';
import TestCase from '../../../framework/test/testcase';

const tenantName = 'helloworld';
const platformAdmin = new User('admin');
const sendingUser = new User('sending-user');
const receivingUser = new User('receiving-user');

const tenantService = new TenantService();
const caseService = new CaseService();

export default class TestStatsAPI extends TestCase {
    constructor() {
        super('Test statistics API');
    }

    async onPrepareTest() {
        const sendingTenantUser = new TenantUser(sendingUser.id, ['Sender'], 'sender', 'sender@senders.com');
        const receivingTenantUser = new TenantUser(receivingUser.id, ['Receiver'], 'receiver', 'receiver@receivers.com');
        const owners = [sendingTenantUser, receivingTenantUser];
        const tenant = new Tenant(tenantName, owners);
        await platformAdmin.login();
        await tenantService.createTenant(platformAdmin, tenant);
    }

    async run() {
        await sendingUser.login();

        const allStats = await caseService.getCaseStatistics(sendingUser);

        const hwStats = await caseService.getCaseStatistics(sendingUser, { definition: 'HelloWorld', tenant: tenantName});
        
        console.log("All stats: ", allStats);
        console.log("HW stats within tenant: ", hwStats);
    }
}
