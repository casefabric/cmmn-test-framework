'use strict';

import Definitions from '../../../../src/cmmn/definitions/definitions';
import CaseService from '../../../../src/service/case/caseservice';
import TestCase from '../../../../src/test/testcase';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';

const definition = Definitions.CaseWithSpace;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestTaskWithSpaces extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
            }
        };

        const startCase = { tenant, definition, inputs };

        const caseInstance = await CaseService.startCase(user, startCase).then(id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);
        console.log(`\n\nCase ID: ${caseInstance.id}\n`);

        const itemNames = caseInstance.planitems.map(item => item.name);

        const assertItem = (name: string) => {
            if (! itemNames.includes(name)) {
                throw new Error(`Cannot find the task with name "${name}"\n Found names: \n - "${itemNames.join('"\n - "')}"`);
            }
            return true;
        }

        assertItem(" Taak Met Begin Spatie");
        assertItem("Taak Met Eind Spatie ");

        console.log("Found tasks with spaces");
    }
}
