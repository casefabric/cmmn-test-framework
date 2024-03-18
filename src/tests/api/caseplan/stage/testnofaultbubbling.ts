'use strict';

import Definitions from "../../../../cmmn/definitions/definitions";
import State from "../../../../cmmn/state";
import Transition from "../../../../cmmn/transition";
import CaseFileService from "../../../../service/case/casefileservice";
import CasePlanService from "../../../../service/case/caseplanservice";
import CaseService from "../../../../service/case/caseservice";
import Path from "../../../../service/case/path";
import TaskService from "../../../../service/task/taskservice";
import CaseAssertions from "../../../../test/caseassertions/caseassertions";
import TestCase from "../../../../test/testcase";
import WorldWideTestTenant from "../../../setup/worldwidetesttenant";
import SimpleDataMock from "./simpledatamock";

const definition = Definitions.FaultHandlingSubCase;
const parentCasedefinition = Definitions.FaultHandlingParentCase;

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const mock = new SimpleDataMock();

export default class TestNoFaultBubbling extends TestCase {
    public isDefaultTest: boolean = false;

    async onPrepareTest() {
        await mock.start();
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
        await parentCasedefinition.deploy(user, tenant);
    }

    async run() {
        const startCase = { tenant, definition: parentCasedefinition, inputs: { data: mock.error_data }, debug: true };
        const caseInstance = await CaseService.startCase(user, startCase).then(id => {
            this.addIdentifier(id);
            return id;
        }).then(id => CaseService.getCase(user, id));
        caseInstance.planitems.forEach(item => {
            console.log(`- ${item.type}[${item.name}.${item.index}] | state = ${item.currentState} | transition = ${item.transition}`);
        });

        const caseTree = CaseAssertions.from(user, caseInstance);
        caseTree.assertPlanItemState('Required Milestone', State.Available);
        caseTree.assertPlanItemState('faulthandling_subcase', State.Active);

        const subCaseTree = caseTree.assertSubCase('faulthandling_subcase');
        subCaseTree.assertPlanItemState('Task Failed', State.Completed);
        subCaseTree.assertPlanItemState('Stage Without Fault Handling/Task', State.Active);
        subCaseTree.assertPlanItemState('Stage Without Fault Handling/Call without Fault Handling', State.Failed);
        subCaseTree.assertPlanItemState('Call with Fault Handling', State.Failed);
        subCaseTree.assertPlanItemState('Failure Handling[0]', State.Active);

        await caseTree.runAssertions();

        if (!subCaseTree.caseInstance) {
            throw new Error(`Missing sub case - but that's not expected at all, as the assertions succeeded...`);
        }

        const subCaseId = subCaseTree.id;
        if (!subCaseId) {
            throw new Error(`Missing sub case id - but that's not expected at all, as the assertions succeeded...`);
        }
        this.addIdentifier(subCaseId);
        const path = new Path('/Stage With Fault Handling/Failure Handling/Retry[0]/Try again');
        const tryAgain = subCaseTree.findItem(path);

        // Triggering the event on the "reactivate-criterion" to try again should lead to one more failure.
        await CasePlanService.raiseEvent(user, subCaseId, '' + tryAgain.id);
        subCaseTree.assertPlanItemState('Failure Handling[0]', State.Completed); // First failure handling is triggered and should complete
        subCaseTree.assertPlanItemState('Failure Handling[1]', State.Active); // and a new instance should have been created
        await caseTree.runAssertions();

        // Update the data to make the webservice respond with success
        await CaseFileService.updateCaseFileItem(user, caseInstance, 'data', mock.success_data);

        // Now reactivate the case plan in the top level case - it should not have any effect
        await CasePlanService.makePlanItemTransition(user, caseInstance, caseInstance.plan.id, Transition.Reactivate, 304);

        // NOTE: Because the pure CMMN fault "handling" situation does not have the CaseTask in Failed state, the sub case is not reactivated.
        //  Therefore, also the case file in the subcase is not being reactivated, 
        //  and a call to reactivate the "Call with Fault Handling" will fail, unless we update the case file in the subcase.

        // Top level case should now have an Active case task
        caseTree.assertPlanItemState('faulthandling_subcase', State.Active);
        subCaseTree.assertPlanItemState('Call without Fault Handling', State.Failed);
        subCaseTree.assertPlanItemState('Call with Fault Handling[0]', State.Failed);
        subCaseTree.assertPlanItemState('Failure Handling[1]', State.Active);
        await caseTree.runAssertions();

        // Completing the Task should make its Stage go to Completed state, even though the process task is still in Failed state.
        //  The case plan is still "Active"
        const task = subCaseTree.findItem('Task');
        await TaskService.completeTask(user, task);

        subCaseTree.assertPlanItemState('Stage Without Fault Handling/Task', State.Completed);
        subCaseTree.assertPlanItemState('Stage Without Fault Handling/Call without Fault Handling', State.Failed);
        subCaseTree.assertPlanItemState('Stage Without Fault Handling', State.Completed);
        await caseTree.runAssertions();

        // Now reactivate the other failed task (the one with error handling). This should complete the sub case.
        const failingTask = subCaseTree.findItem('Call with Fault Handling');
        await CasePlanService.makePlanItemTransition(user, subCaseId, failingTask.id, Transition.Reactivate);

        // Verify that reactivating the "Call with Fault Handling" still is failed (because as mentioned above the case file of the subcase is not updated)
        subCaseTree.assertPlanItemState('Call without Fault Handling', State.Failed);
        subCaseTree.assertPlanItemState('Call with Fault Handling[0]', State.Failed);
        subCaseTree.assertPlanItemState('Failure Handling[1]', State.Active);
        caseTree.assertPlanItemState('faulthandling_subcase', State.Active);
        await caseTree.runAssertions();

        // Let's also update the file of the subcase, and then try again to reactivate the call with fault handling
        await CaseFileService.updateCaseFileItem(user, subCaseId, 'data', mock.success_data);
        await CasePlanService.makePlanItemTransition(user, subCaseId, failingTask.id, Transition.Reactivate);

        // Verify that reactivating the "Call with Fault Handling" now completed, and also the case now has completed, 
        //  and therefore also the CaseTask in the main case should become completed.
        subCaseTree.assertPlanItemState('Call without Fault Handling', State.Failed);
        subCaseTree.assertPlanItemState('Call with Fault Handling[0]', State.Completed);
        subCaseTree.assertPlanItemState('Failure Handling[1]', State.Terminated);
        caseTree.assertPlanItemState('faulthandling_subcase', State.Completed);
        await caseTree.runAssertions();
    }
}
