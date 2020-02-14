'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseFileService from '../../../framework/service/case/casefileservice';
import Comparison from '../../../framework/test/comparison';
import Case from '../../../framework/cmmn/case';
import User from '../../../framework/user';
import { pathReader } from '../../../framework/cmmn/casefile';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

const caseFileService = new CaseFileService();

export default class TestCaseFileAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, user, tenant);
    }

    async run() {
        const greeting1 = {
            Message: 'Can you debug?',
            From: user.id
        };
        const startCaseInput = { Greeting: greeting1 };
        const startCase = { tenant, definition, inputs: startCaseInput};

        // This should include a "DebugEnabled" event
        let caseInstance = await caseService.startCase(startCase, user);
        caseInstance = await caseService.getCase(caseInstance, user);

        await caseFileService.updateCaseFileItem(caseInstance, user, 'Greeting', greeting1);
        await assertProperCaseFile(caseInstance, user, 'Greeting', greeting1)

        const greeting2 = {
            Message: 'new message',
            From: 'someone else'
        };

        await caseFileService.updateCaseFileItem(caseInstance, user, 'Greeting', greeting2);
        await assertProperCaseFile(caseInstance, user, '/Greeting', greeting2);
        await assertProperCaseFile(caseInstance, user, '/Greeting/From', 'someone else');

        const greeting3 = {
            Message: 'new message',
            From: 'new from'
        };
        await caseFileService.updateCaseFileItem(caseInstance, user, 'Greeting', greeting3);

        await assertProperCaseFile(caseInstance, user, '/Greeting', greeting3);
        await assertProperCaseFile(caseInstance, user, 'Greeting//From', greeting3.From)

        // Apparently the CasesRoute does not allow to go this deep, since Message is a property, and not a case file item.
        // await caseFileService.updateCaseFileItem(caseInstance, user, 'Greeting/Message', 'abc new', false);
    }
}

/**
 * Read the case instance's case file on behalf of the user and verify that the element at the end of the path matches the expectedContent.
 * Path can be something like /Greeting/
 * 
 * @param caseInstance 
 * @param user 
 * @param path 
 * @param expectedContent 
 */
async function assertProperCaseFile(caseInstance: Case, user: User, path: string, expectedContent: any) {
    await caseFileService.getCaseFile(caseInstance, user).then(casefile => {
        // console.log("Case File for reading path " + path, casefile.file);
        const actualCaseFileItem = pathReader(casefile.file, path);
        if (! Comparison.sameJSON(actualCaseFileItem, expectedContent)) {
            throw new Error(`Case File [${path}] is expected to match: ${JSON.stringify(expectedContent, undefined, 2)}\nActual: ${JSON.stringify(actualCaseFileItem, undefined, 2)}`);
        }
    });
}