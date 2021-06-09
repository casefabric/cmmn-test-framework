'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseFileService from '../../../framework/service/case/casefileservice';
import { assertCaseFileContent } from '../../../framework/test/assertions';
import Case from '../../../framework/cmmn/case';
import Util from '../../../framework/test/util';
import { SomeTime } from '../../../framework/test/time';
import DebugService from '../../../framework/service/case/debugservice';

const repositoryService = new RepositoryService();
const definition = 'casefile.xml';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

const caseFileService = new CaseFileService();

export default class TestCaseFileArrayAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        await this.createChildArray();
    }

    async createEmptyCase(): Promise<Case> {
        const startCase = { tenant, definition };
        const caseInstance = await caseService.startCase(user, startCase) as Case;
        return caseInstance;
    }

    async createChildArray(): Promise<Case> {
        this.logTestName("createChildArray");
        const caseInstance = await this.createEmptyCase();
        const initialCaseFile = { RootCaseFileItem: {}};

        await caseFileService.createCaseFile(user, caseInstance, initialCaseFile);
        await assertCaseFileContent(user, caseInstance, '', initialCaseFile);

        const ChildArray  = [{
            ChildName: "child0",
            ChildAge: 0
        }, {
            ChildName: "child1",
            ChildAge: 1
        }, {
            ChildName: "child2",
            ChildAge: 2
        }];

        const path = 'RootCaseFileItem/ChildArray';

        await caseFileService.createCaseFileItem(user, caseInstance, path, ChildArray);

        // Force the case to be removed from memory and then recovered. This causes cafienne engine issue https://github.com/cafienne/cafienne-engine/issues/235
        await new DebugService().forceRecovery(user, caseInstance.id);

        await caseFileService.updateCaseFileItem(user, caseInstance, path, ChildArray);

        const pathChild1 = 'RootCaseFileItem/ChildArray[1]';
        await caseFileService.deleteCaseFileItem(user, caseInstance, pathChild1);

        const newChildren: Array<any> = ChildArray;
        newChildren[1] = null;
        await assertCaseFileContent(user, caseInstance, path, newChildren);

        return caseInstance;
    }


    logTestName(name: string) {
        console.log(`\n=============== CASE FILE API TEST ${name}`);
    }

}
