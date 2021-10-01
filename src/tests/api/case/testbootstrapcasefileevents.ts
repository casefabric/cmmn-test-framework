'use strict';

import RepositoryService from "../../../framework/service/case/repositoryservice";
import CaseService from "../../../framework/service/case/caseservice";
import WorldWideTestTenant from "../../worldwidetesttenant";
import TestCase from "../../../framework/test/testcase";
import Case from "../../../framework/cmmn/case";

const worldwideTenant = new WorldWideTestTenant();

const definition = 'bootstrap-casefile-events.xml';
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestBootstrapCaseFileEvents extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(sender, definition, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Checking whether the case decently starts',
            }, 
            OneMoreInput: {
                Message: 'One more message'
            }
        };
        
        const startCase = { tenant, definition, inputs, debug: true };
        // Sender starts the parent case
        const caseInstance = await CaseService.startCase(sender, startCase);

        console.log(`Main case id: ${caseInstance.id}`);
    }
}