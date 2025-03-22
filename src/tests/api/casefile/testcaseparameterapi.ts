'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import CaseFileService from '../../../service/case/casefileservice';
import CaseService from '../../../service/case/caseservice';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';

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
        const caseInstance = await CaseService.startCase(user, startCase);
        this.addIdentifier(caseInstance);
        await CaseFileService.getCaseFile(user, caseInstance).then(file => {
            console.log("File: ", JSON.stringify(file, undefined, 2));
        });
    }
}
