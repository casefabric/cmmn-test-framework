'use strict';

import User from '../../../framework/user'
import CaseService from '../../../framework/service/case/caseservice';
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

export default class TestDebugMode extends TestCase {
    constructor() {
        super('Test Debug API');
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
        const startCaseInput = {
            Greeting: {
                Message: 'Can you debug?',
                From: sendingUser.id
            }
        };
        const startCaseInDebugMode = { tenant: tenantName, definition: 'helloworld.xml', inputs: startCaseInput, debug: true};

        await sendingUser.login();

        // This should include a "DebugEnabled" event
        let debugCase = await caseService.startCase(startCaseInDebugMode, sendingUser);
        debugCase = await caseService.getCase(debugCase, sendingUser);

        // This should result in "DebugDisabled" event
        await caseService.changeDebugMode(debugCase, sendingUser, false);
        debugCase = await caseService.getCase(debugCase, sendingUser);

        // This should result in one more "DebugEnabled" event
        await caseService.changeDebugMode(debugCase, sendingUser, true);
        debugCase = await caseService.getCase(debugCase, sendingUser);

        // TODO: we can also query the events to see if they are indeed present.
    }
}
