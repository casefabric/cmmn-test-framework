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
const user = new User('sending-user');

const tenantService = new TenantService();
const caseService = new CaseService();

export default class TestUsersCaseAPI extends TestCase {
    constructor() {
        super('Test API /cases/user');
    }

    async onPrepareTest() {
        const sendingTenantUser = new TenantUser(user.id, ['Sender'], 'sender', 'sender@senders.com');
        const owners = [sendingTenantUser];
        const tenant = new Tenant(tenantName, owners);
        await platformAdmin.login();
        await tenantService.createTenant(platformAdmin, tenant);
    }

    async run() {
        await user.login();

        const allMyCases = await caseService.getUserCases(user, { numberOfResults: 10000 });

        const myCompletedCases = await caseService.getUserCases(user, { state: 'Completed', tenant: tenantName, numberOfResults: 10000 });
        const myActiveCases = await caseService.getUserCases(user, { state: 'Active', tenant: tenantName, numberOfResults: 10000 });

        console.log("All my cases: ", allMyCases.length);
        console.log("My completed cases: ", myCompletedCases.length);
        console.log("My active cases: ", myActiveCases.length);
    }
}
