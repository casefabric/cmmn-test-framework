'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';
import CaseService from '../../../service/case/caseservice';
import CaseFileService from '../../../service/case/casefileservice';

const definition = Definitions.CaseFile;
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestPropertyMultiplicity extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const caseInstance = await CaseService.startCase(user, { definition, tenant }).then(async ci => await CaseService.getCase(user, ci));
        this.addIdentifier(caseInstance);

        const propertiesObject = {
            singleString: 'abc',
            multiString: ['abc', 'def', 13],
            singleNumber: 18,
            multiNumber: [123, 456]
        }

        // Creating properties with primitive values as list should work. 
        await CaseFileService.createCaseFileItem(user, caseInstance, 'PropertiesObject', propertiesObject);

        // It should not be possible to add individual items in a array property
        await CaseFileService.updateCaseFileItem(user, caseInstance, 'PropertiesObject', { multiNumber: 123 }, 400);

        // Verify that array contents is also validated against expected type
        await CaseFileService.updateCaseFileItem(user, caseInstance, 'PropertiesObject', { multiNumber: [1, 'b', 3, 'd'] }, 400);
    }
}
