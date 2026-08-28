'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import CaseFileService from '../../../service/case/casefileservice';
import CaseService from '../../../service/case/caseservice';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';
import assertCaseFileContent from '../../../test/caseassertions/file';

const definition = Definitions.CaseParameter;
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestCaseParameterAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        await this.createCase();
    }

    async createCase() {
        const inputs = {
            RootCaseFileItem: {
                ChildArray: []
            }
        }
        const startCase = { tenant, definition, inputs };
        const caseInstance = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));
        this.addIdentifier(caseInstance);
        caseInstance.toConsole(true);
        assertCaseFileContent(user, caseInstance, 'RootCaseFileItem/ChildArray', []);
    }
}
