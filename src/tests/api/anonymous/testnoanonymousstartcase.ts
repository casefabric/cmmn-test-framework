'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeamMember, { CaseOwner } from '../../../framework/cmmn/caseteammember';
import CaseTeam from '../../../framework/cmmn/caseteam';
import Case from '../../../framework/cmmn/case';
import TenantUser, { TenantOwner } from '../../../framework/tenant/tenantuser';
import Tenant from '../../../framework/tenant/tenant';
import User from '../../../framework/user';
import RequestService from '../../../framework/service/anonymous/requestservice';
import AnonymousWorld from './anonymousworld';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';

const caseService = new CaseService();
const requestService = new RequestService();


const suzy = new TenantOwner('suzy', ['Receiver'], 'receiver', 'receiver@receivers.com')
const lana = new TenantUser('lana', ['Sender'], 'sender', 'sender@senders.com');

const anonymousWorld = new AnonymousWorld('anonymous-world', [suzy, lana]);
const anonymousWorldWithoutLana = new AnonymousWorld('anonymous-world-without-lana', [suzy]);

const tenant = anonymousWorld.tenant;

export default class TestNoAnonymousStartCase extends TestCase {
    isDefaultTest = false;
    inputs = {
        Greeting: {
            Message: 'Hello there',
            From: 'who would know, I am anonymous'
        }
    };


    async onPrepareTest() {
        await anonymousWorld.create();
        await anonymousWorldWithoutLana.create();
        await repositoryService.validateAndDeploy(suzy, definition, tenant);
    }

    async run() {
        // Default instance, pointing to helloworld
        await this.createCase('', 405);
    }

    async createCase(path: string, expectedStatusCode: number = 200, lanaHasAccess: number = 200) {
        // Default instance, pointing to helloworld
        const caseInstance = await requestService.requestCase(path, this.inputs, undefined, undefined, expectedStatusCode) as Case;

        if (expectedStatusCode === 200) {
            console.log(`\nCase id\t${caseInstance.id}`);

            await caseService.getCase(suzy, caseInstance).then(caze => {
                console.log(`Case is created by user '${caze.createdBy}'`);
            });

            console.log(`Checking whether lana has access - expecting response code ${lanaHasAccess}`);
            await caseService.getCase(lana, caseInstance, lanaHasAccess);

        } else {
            console.log('Failed to create case instance, as expected');
        }

        return caseInstance;
    }
}