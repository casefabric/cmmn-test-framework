'use strict';

import Definitions from "../../../definitions/definitions";
import PlanItem from "../../../../src/cmmn/planitem";
import State from "../../../../src/cmmn/state";
import CaseFileService from "../../../../src/service/case/casefileservice";
import CasePlanService from "../../../../src/service/case/caseplanservice";
import CaseService from "../../../../src/service/case/caseservice";
import TaskService from "../../../../src/service/task/taskservice";
import { assertCasePlan, assertPlanItem } from "../../../../src/test/caseassertions/plan";
import Comparison from "../../../../src/test/comparison";
import TestCase from "../../../../src/test/testcase";
import WorldWideTestTenant from "../../../../src/tests/setup/worldwidetesttenant";

const definition = Definitions.SubCaseWithArrayOutput;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestArraySubCase extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
    }

    async run() {
        const inputs = { in: 'Just a simple message' }
        const startCase = { tenant, definition, inputs };

        // Start the parent case
        const caseInstance = await CaseService.startCase(user, startCase).then(async id => CaseService.getCase(user, id));
        this.addIdentifier(caseInstance);
        // Retrieve subcase 
        const subCasePlanItem = caseInstance.planitems.find(item => item.name === 'simpleinoutcase') as PlanItem;

        await assertPlanItem(user, caseInstance, subCasePlanItem.name, subCasePlanItem.index, State.Active);

        // Get subcase is possible by sender
        const subCaseInstance = await assertCasePlan(user, subCasePlanItem.id, State.Active);

        const numTasksToComplete = 3;
        const expectedCaseFileOutput = [];
        for (let i = 0; i < numTasksToComplete; i++) {
            const taskInstance = await assertPlanItem(user, subCaseInstance, 'Task', i, State.Active);
            const taskOutput = { Out: i };
            expectedCaseFileOutput.push(i);
            await TaskService.completeTask(user, taskInstance, taskOutput);
        }

        await CasePlanService.raiseEvent(user, subCaseInstance, 'Complete Case');
        await assertCasePlan(user, subCasePlanItem.id, State.Completed);
        await assertPlanItem(user, caseInstance, subCasePlanItem.name, subCasePlanItem.index, State.Completed);

        const caseFile = await CaseFileService.getCaseFile(user, caseInstance);
        console.log("Completed Case Task with output: " + JSON.stringify(caseFile, undefined, 2));
        const out = caseFile.out;
        if (!Comparison.sameArray(out, expectedCaseFileOutput)) {
            throw new Error(`Expecting case file output ${expectedCaseFileOutput} but found ${out}`);
        };
    }
}
