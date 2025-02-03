'use strict';

import Case from "../../../../src/cmmn/case";
import Definitions from "../../../definitions/definitions";
import State from "../../../../src/cmmn/state";
import Transition from "../../../../src/cmmn/transition";
import CaseFileService from "../../../../src/service/case/casefileservice";
import CasePlanService from "../../../../src/service/case/caseplanservice";
import CaseService from "../../../../src/service/case/caseservice";
import TaskService from "../../../../src/service/task/taskservice";
import CaseAssertions from "../../../../src/test/caseassertions/caseassertions";
import TestCase from "../../../../src/test/testcase";
import WorldWideTestTenant from "../../../../src/tests/setup/worldwidetesttenant";
import SimpleDataMock from "./simpledatamock";

const definition = Definitions.FaultHandlingSubCase;
const parentCasedefinition = Definitions.FaultHandlingParentCase;

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

const mock = new SimpleDataMock();

export default class TestFaultBubbling extends TestCase {
    private caseInstance!: Case;
    private subCaseInstance!: Case;

    async onPrepareTest() {
        await mock.start();
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
        await parentCasedefinition.deploy(user, tenant);
    }

    async run() {
        await this.createCaseInstance();
        await this.runTopDownReactivation();

        await this.createCaseInstance();
        await this.runBottomUpReactivation();

        await this.createCaseInstance();
        await this.runMiddleReactivation();
    }

    async createCaseInstance() {
        const startCase = { tenant, definition: parentCasedefinition, inputs: { data: mock.error_data }, debug: true };
        const caseInstance = this.caseInstance = await CaseService.startCase(user, startCase).then(id => {
            this.addIdentifier(id);
            return id;
        }).then(id => CaseService.getCase(user, id));

        const caseTree = CaseAssertions.from(user, caseInstance);
        caseTree.assertPlanItemState('Required Milestone', State.Available);
        caseTree.assertPlanItemState('faulthandling_subcase', State.Failed);

        const subCaseTree = caseTree.assertSubCase('faulthandling_subcase');
        subCaseTree.assertPlanItemState('Task Failed', State.Completed);
        subCaseTree.assertPlanItemState('Call with Fault Handling', State.Failed);
        subCaseTree.assertPlanItemState('Failure Handling[0]', State.Active);

        await caseTree.runAssertions();

        if (!subCaseTree.caseInstance) {
            throw new Error(`Missing sub case - but that's not expected at all, as the assertions succeeded...`);
        }

        this.subCaseInstance = subCaseTree.caseInstance;
        const subCaseId = subCaseTree.id;
        if (!subCaseId) {
            throw new Error(`Missing sub case id - but that's not expected at all, as the assertions succeeded...`);
        }
        this.addIdentifier(subCaseId);

        // Update the data to make the webservice respond with success
        await this.updateCaseFile(caseInstance);
    }

    async updateCaseFile(caseInstance: Case) {
        // Update the data to make the webservice respond with success
        await CaseFileService.updateCaseFileItem(user, caseInstance, 'data', mock.success_data);
    }

    async runTopDownReactivation() {
        // Now reactivate the case plan in the top level case
        await CasePlanService.makePlanItemTransition(user, this.caseInstance, this.caseInstance.plan.id, Transition.Reactivate);

        // Top level case should now have an Active case task (because 1 task is still Active in the subcase)
        const caseTree = CaseAssertions.from(user, this.caseInstance);
        caseTree.assertPlanItemState('faulthandling_subcase', State.Active);

        const subCaseTree = caseTree.assertSubCase('faulthandling_subcase');
        subCaseTree.assertPlanItemState('Task Failed', State.Completed);
        subCaseTree.assertPlanItemState('Call without Fault Handling', State.Completed);
        subCaseTree.assertPlanItemState('Call with Fault Handling[0]', State.Completed);
        subCaseTree.assertPlanItemState('Failure Handling[0]', State.Terminated);
        await caseTree.runAssertions();

        // Completing the active Task in the subcase should make the CaseTask in the parent case go to Completed.
        await TaskService.completeTask(user, subCaseTree.findItem('Task'));

        caseTree.assertPlanItemState('faulthandling_subcase', State.Completed);
        await caseTree.runAssertions();
    }

    async runBottomUpReactivation() {
        // Bottom up reactivation needs the case file to be up-to-date in the subcase. During creation it is only updated in the main case
        await this.updateCaseFile(this.subCaseInstance);

        // Now reactivate the first failed task
        const callWithFaultHandling = this.subCaseInstance.findItem('Call with Fault Handling');
        await CasePlanService.makePlanItemTransition(user, this.subCaseInstance, callWithFaultHandling.id, Transition.Reactivate);

        // Top level case should still have an Failed case task
        const caseTree = CaseAssertions.from(user, this.caseInstance);
        caseTree.assertPlanItemState('faulthandling_subcase', State.Failed);

        // Reactivating the first failed task should result in Completed
        const subCaseTree = caseTree.assertSubCase('faulthandling_subcase');
        subCaseTree.assertPlanItemState('Task Failed', State.Completed);
        subCaseTree.assertPlanItemState('Call without Fault Handling', State.Failed);
        subCaseTree.assertPlanItemState('Call with Fault Handling', State.Completed);
        subCaseTree.assertPlanItemState('Failure Handling[0]', State.Terminated);
        await caseTree.runAssertions();

        // Complete the Task should still have the sub case in Failed state.
        await TaskService.completeTask(user, subCaseTree.findItem('Task'));
        subCaseTree.assertPlanItemState('Task', State.Completed);
        subCaseTree.assertPlanItemState('Call without Fault Handling', State.Failed);
        subCaseTree.assertPlanItemState('Stage Without Fault Handling', State.Failed);
        await caseTree.runAssertions();

        // Now reactivate the other failed task
        const callWithoutFaultHandling = this.subCaseInstance.findItem('Call without Fault Handling');
        await CasePlanService.makePlanItemTransition(user, this.subCaseInstance, callWithoutFaultHandling.id, Transition.Reactivate);

        // Top level CaseTask should now go to completed, as all elements in the sub case now should be completed
        caseTree.assertPlanItemState('faulthandling_subcase', State.Completed);
        subCaseTree.assertPlanItemState('Call without Fault Handling', State.Completed);
        subCaseTree.assertPlanItemState('Stage Without Fault Handling', State.Completed);
        await caseTree.runAssertions();
    }

    async runMiddleReactivation() {
        // Bottom up reactivation needs the case file to be up-to-date in the subcase. During creation it is only updated in the main case
        await this.updateCaseFile(this.subCaseInstance);

        // Now reactivate the first failed stage
        const callWithFaultHandling = this.subCaseInstance.findItem('Stage With Fault Handling');
        await CasePlanService.makePlanItemTransition(user, this.subCaseInstance, callWithFaultHandling.id, Transition.Reactivate);

        // Top level case should still have an Failed case task
        const caseTree = CaseAssertions.from(user, this.caseInstance);
        caseTree.assertPlanItemState('faulthandling_subcase', State.Failed);

        // Reactivating the first failed stage should result in Completed
        const subCaseTree = caseTree.assertSubCase('faulthandling_subcase');
        subCaseTree.assertPlanItemState('Task Failed', State.Completed);
        subCaseTree.assertPlanItemState('Call without Fault Handling', State.Failed);
        subCaseTree.assertPlanItemState('Call with Fault Handling', State.Completed);
        subCaseTree.assertPlanItemState('Failure Handling[0]', State.Terminated);
        await caseTree.runAssertions();

        // Complete the Task should still have the sub case in Failed state.
        await TaskService.completeTask(user, subCaseTree.findItem('Task'));
        subCaseTree.assertPlanItemState('Task', State.Completed);
        subCaseTree.assertPlanItemState('Call without Fault Handling', State.Failed);
        subCaseTree.assertPlanItemState('Stage Without Fault Handling', State.Failed);
        await caseTree.runAssertions();

        // Now reactivate the case plan of the subcase
        await CasePlanService.makePlanItemTransition(user, this.subCaseInstance, this.subCaseInstance.plan.id, Transition.Reactivate);

        // Top level CaseTask should now go to completed, as all elements in the sub case now should be completed
        caseTree.assertPlanItemState('faulthandling_subcase', State.Completed);
        subCaseTree.assertPlanItemState('Call without Fault Handling', State.Completed);
        subCaseTree.assertPlanItemState('Stage Without Fault Handling', State.Completed);
        await caseTree.runAssertions();
    }
}
