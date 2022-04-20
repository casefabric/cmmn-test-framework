'use strict';

import RepositoryService from "@cafienne/typescript-client/service/case/repositoryservice";
import CaseService from "@cafienne/typescript-client/service/case/caseservice";
import TaskService from "@cafienne/typescript-client/service/task/taskservice";
import WorldWideTestTenant from "../../../worldwidetesttenant";
import TestCase from "@cafienne/typescript-client/test/testcase";
import { assertCasePlan, assertPlanItem } from "@cafienne/typescript-client/test/caseassertions/plan";
import CaseFileService from "@cafienne/typescript-client/service/case/casefileservice";
import PlanItem from "@cafienne/typescript-client/cmmn/planitem";
import CasePlanService from "@cafienne/typescript-client/service/case/caseplanservice";
import Comparison from "@cafienne/typescript-client/test/comparison";
import State from "@cafienne/typescript-client/cmmn/state";

const worldwideTenant = new WorldWideTestTenant();
const definition = 'subcasewitharrayoutput.xml';
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestArraySubCase extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const inputs = { in: 'Just a simple message' }
        const startCase = { tenant, definition, inputs };

        // Start the parent case
        const caseId = await CaseService.startCase(user, startCase);

        // Retrieve subcase 
        const caseInstance = await CaseService.getCase(user, caseId);
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
        if (! Comparison.sameArray(out, expectedCaseFileOutput)) {
            throw new Error(`Expecting case file output ${expectedCaseFileOutput} but found ${out}`);
        };
    }
}