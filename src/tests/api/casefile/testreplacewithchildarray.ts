'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import CaseFileService from '../../../service/case/casefileservice';
import CaseService from '../../../service/case/caseservice';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';
import TaskService from '../../../service/task/taskservice';
import PlanItem from '../../../cmmn/planitem';
import Case from '../../../cmmn/case';

const definition = Definitions.CaseFile;
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestReplaceWithChildArray extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const startCase = { tenant, definition };
        const caseInstance = await CaseService.startCase(user, startCase).then(ci => CaseService.getCase(user, ci));

        this.addIdentifier(caseInstance);

        await this.completeAddChildTask(0, caseInstance);
        const replaceCaseFile = {
            RootCaseFileItem: {
                RootProperty1: "string",
                ChildArray: []
            }
        };

        await this.completeReplaceArrayTask(0, caseInstance);

        await this.completeAddChildTask(1, caseInstance);

        await this.completeReplaceArrayTask(1, caseInstance);

        await this.completeAddChildTask(2, caseInstance);

        await CaseFileService.getCaseFile(user, caseInstance).then(file => {
            console.log("File: ", JSON.stringify(file, undefined, 2));
        });
    }


    async completeAddChildTask(index: number, caseInstance: Case) {
        const childArray = [{
            ChildName: `child-${index}`,
            ChildAge: index
        }]
        await CaseService.getCase(user, caseInstance).then(async caseInstance => {
            const simpleInOutTask = caseInstance.findItem(`Add Child Task[${index}]`);
            console.log("Adding object to Child Array attempt number ", (index + 1));
            await TaskService.completeTask(user, simpleInOutTask, { Out: childArray });
            await CaseFileService.getCaseFile(user, caseInstance).then(file => {
                console.log("File: ", JSON.stringify(file, undefined, 2));
            });
        });
    }

    async completeReplaceArrayTask(index: number, caseInstance: Case) {
        const replaceChildArray = {
            ChildArray: []
        }
        await CaseService.getCase(user, caseInstance).then(async caseInstance => {
            const simpleInOutTask = caseInstance.findItem(`Replace Array Task[${index}]`);
            console.log("Replacing Child Array attempt number ", (index + 1));
            await TaskService.completeTask(user, simpleInOutTask, { Out: replaceChildArray });
            await CaseFileService.getCaseFile(user, caseInstance).then(file => {
                console.log("File: ", JSON.stringify(file, undefined, 2));
            });
        });
    }
}
