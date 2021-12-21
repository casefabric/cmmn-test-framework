'use strict';

import RepositoryService from "../../../../framework/service/case/repositoryservice";
import CaseService from "../../../../framework/service/case/caseservice";
import TaskService from "../../../../framework/service/task/taskservice";
import WorldWideTestTenant from "../../../worldwidetesttenant";
import TestCase from "../../../../framework/test/testcase";
import { assertCasePlan, assertPlanItem } from "../../../../framework/test/caseassertions/plan";
import CaseFileService from "../../../../framework/service/case/casefileservice";
import PlanItem from "../../../../framework/cmmn/planitem";
import CasePlanService from "../../../../framework/service/case/caseplanservice";
import Comparison from "../../../../framework/test/comparison";

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

        await assertPlanItem(user, caseInstance, subCasePlanItem.name, subCasePlanItem.index, 'Active');

        // Get subcase is possible by sender
        const subCaseInstance = await assertCasePlan(user, subCasePlanItem.id, 'Active');

        const numTasksToComplete = 3;
        const expectedCaseFileOutput = [];
        for (let i = 0; i < numTasksToComplete; i++) {
            const taskInstance = await assertPlanItem(user, subCaseInstance, 'Task', i, 'Active');
            const taskOutput = { Out: i };
            expectedCaseFileOutput.push(i);
            await TaskService.completeTask(user, taskInstance, taskOutput);
        }

        await CasePlanService.raiseEvent(user, subCaseInstance, 'Complete Case');
        await assertCasePlan(user, subCasePlanItem.id, 'Completed');
        await assertPlanItem(user, caseInstance, subCasePlanItem.name, subCasePlanItem.index, 'Completed');

        const caseFile = await CaseFileService.getCaseFile(user, caseInstance);
        console.log("Completed Case Task with output: " + JSON.stringify(caseFile, undefined, 2));
        const out = caseFile.out;
        if (! Comparison.sameArray(out, expectedCaseFileOutput)) {
            throw new Error(`Expecting case file output ${expectedCaseFileOutput} but found ${out}`);
        };
    }
}