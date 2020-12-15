'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService, { readLocalFile } from '../../../framework/service/case/repositoryservice';
import CaseFileService from '../../../framework/service/case/casefileservice';
import Case from '../../../framework/cmmn/case';
import { assertPlanItemState } from '../../../framework/test/assertions';

const repositoryService = new RepositoryService();
const definition = 'fhirpath_test.xml';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

const caseFileService = new CaseFileService();

export default class TestFhirPath extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const startCase = { tenant, definition };
        const caseInstance = await caseService.startCase(user, startCase) as Case;
        const patient = JSON.parse(readLocalFile('../json/patient.json'));

        await caseFileService.createCaseFileItem(user, caseInstance, 'Patient', patient);


        console.log(`Awaiting sub case completion`);

        await assertPlanItemState(user, caseInstance, 'Patient Info Updated', 0, 'Completed', 5);

        console.log(`\nCase id:  ${caseInstance.id}`);

    }
}
