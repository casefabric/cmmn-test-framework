'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import RequestService from '../../../service/anonymous/requestservice';
import CaseService from '../../../service/case/caseservice';
import TenantUser, { TenantOwner } from '../../../tenant/tenantuser';
import TestCase from '../../../test/testcase';
import AnonymousWorld from './anonymousworld';

const definition = Definitions.HelloWorld;

const suzy = new TenantOwner('suzy', ['Receiver'], 'receiver', 'receiver@receivers.com')
const lana = new TenantUser('lana', ['Sender'], 'sender', 'sender@senders.com');

const anonymousWorld = new AnonymousWorld('anonymous-world', [suzy, lana]);
const anonymousWorldWithoutLana = new AnonymousWorld('anonymous-world-without-lana', [suzy]);

const tenant = anonymousWorld.tenant;

export default class TestNoAnonymousStartCase extends TestCase {
    inputs = {
        Greeting: {
            Message: 'Hello there',
            From: 'who would know, I am anonymous'
        }
    };


    async onPrepareTest() {
        await anonymousWorld.create();
        await anonymousWorldWithoutLana.create();
        await definition.deploy(suzy, tenant);
    }

    async run() {
        // Default instance, pointing to helloworld
        await this.createCase('', 405);
    }

    async createCase(path: string, expectedStatusCode: number = 200, lanaHasAccess: number = 200) {
        // Default instance, pointing to helloworld
        const caseInstance = await RequestService.requestCase(path, this.inputs, undefined, undefined, expectedStatusCode);

        if (expectedStatusCode === 200) {
            console.log(`\nCase id\t${caseInstance.id}`);
            this.addIdentifier(caseInstance);

            await CaseService.getCase(suzy, caseInstance).then(caze => {
                console.log(`Case is created by user '${caze.createdBy}'`);
            });

            console.log(`Checking whether lana has access - expecting response code ${lanaHasAccess}`);
            await CaseService.getCase(lana, caseInstance, lanaHasAccess);

        } else {
            console.log('Failed to create case instance, as expected');
        }

        return caseInstance;
    }
}