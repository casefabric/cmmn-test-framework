'use strict';

import CaseService from "../../../service/case/caseservice";
import RepositoryService from "../../../service/case/repositoryservice";
import TestCase from "../../../test/testcase";
import WorldWideTestTenant from "../../worldwidetesttenant";

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
        this.addIdentifier(caseInstance);

        console.log(`Main case id: ${caseInstance.id}`);
    }
}