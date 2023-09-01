'use strict';

import CaseService from '../../../../service/case/caseservice';
import RepositoryService from '../../../../service/case/repositoryservice';
import TestCase from '../../../../test/testcase';
import WorldWideTestTenant from '../../../worldwidetesttenant';

const definition = 'casemetspatie.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestTaskWithSpaces extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
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
