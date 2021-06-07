'use strict';

import RepositoryService from "../../../../framework/service/case/repositoryservice";
import CaseService from "../../../../framework/service/case/caseservice";
import TaskService from "../../../../framework/service/task/taskservice";
import WorldWideTestTenant from "../../../worldwidetesttenant";
import TestCase from "../../../../framework/test/testcase";
import { findTask, assertCaseTeamMember, assertCasePlanState, assertPlanItemState, assertTask } from "../../../../framework/test/assertions";
import Case from "../../../../framework/cmmn/case";
import CaseFileService from "../../../../framework/service/case/casefileservice";
import CaseTeamMember from "../../../../framework/cmmn/caseteammember";
import PlanItem from "../../../../framework/cmmn/planitem";
import CasePlanService from "../../../../framework/service/case/caseplanservice";
import Comparison from "../../../../framework/test/comparison";

const repositoryService = new RepositoryService();
const caseService = new CaseService();
const casePlanService = new CasePlanService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const caseFileService = new CaseFileService();

const definition = 'subcasewitharrayoutput.xml';
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestArraySubCase extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        const inputs = { in: 'Just a simple message' }
        const startCase = { tenant, definition, inputs };

        // Start the parent case
        const caseId = await caseService.startCase(user, startCase) as Case;

        // Retrieve subcase 
        const caseInstance = await caseService.getCase(user, caseId);
        const subCasePlanItem = caseInstance.planitems.find(item => item.name === 'simpleinoutcase') as PlanItem;

        await assertPlanItemState(user, caseInstance, subCasePlanItem.name, subCasePlanItem.index, 'Active');

        // Get subcase is possible by sender
        const subCaseInstance = await assertCasePlanState(user, subCasePlanItem.id, 'Active');

        const numTasksToComplete = 3;
        const expectedCaseFileOutput = [];
        for (let i = 0; i < numTasksToComplete; i++) {
            const taskInstance = await assertPlanItemState(user, subCaseInstance, 'Task', i, 'Active');
            const taskOutput = { Out: i };
            expectedCaseFileOutput.push(i);
            await taskService.completeTask(user, taskInstance, taskOutput);
        }

        await casePlanService.raiseEvent(user, subCaseInstance, 'Complete Case');
        await assertCasePlanState(user, subCasePlanItem.id, 'Completed');
        await assertPlanItemState(user, caseInstance, subCasePlanItem.name, subCasePlanItem.index, 'Completed');

        const caseFile = await caseFileService.getCaseFile(user, caseInstance);
        console.log("Completed Case Task with output: " + JSON.stringify(caseFile, undefined, 2));
        const out = caseFile.out;
        if (! Comparison.sameArray(out, expectedCaseFileOutput)) {
            throw new Error(`Expecting case file output ${expectedCaseFileOutput} but found ${out}`);
        };
    }
}