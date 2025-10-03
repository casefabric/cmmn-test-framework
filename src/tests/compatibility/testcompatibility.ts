'use strict';

import Definitions from '../../cmmn/definitions/definitions';
import PlanItem from '../../cmmn/planitem';
import State from '../../cmmn/state';
import TaskState from '../../cmmn/taskstate';
import CaseTeam from '../../cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from '../../cmmn/team/caseteamuser';
import CaseFileService from '../../service/case/casefileservice';
import CasePlanService from '../../service/case/caseplanservice';
import CaseService from '../../service/case/caseservice';
import CaseTeamService from '../../service/case/caseteamservice';
import DebugService from '../../service/case/debugservice';
import RepositoryService from '../../service/case/repositoryservice';
import TaskService from '../../service/task/taskservice';
import { assertCasePlan } from '../../test/caseassertions/plan';
import { assertTask, findTask, verifyTaskInput } from '../../test/caseassertions/task';
import TestCase from '../../test/testcase';
import { SomeTime } from '../../test/time';
import WorldWideTestTenant from '../setup/worldwidetesttenant';

const definition = Definitions.Compatibility;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const employee = worldwideTenant.employee;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const inputs = {
    Greeting: {
        Message: 'Hello there',
        From: sender.id
    }
};
const taskOutput = {
    Response: {
        Message: 'Toedeledoki',
    }
};
const staticRootCaseId = 'UniqueCompatibilityCaseInstance';

export default class TestCompatibility extends TestCase {
    isDefaultTest: boolean = false;

    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(sender, tenant);
    }

    async run() {
        // First test recovery with dynamic creation.
        await this.runFlow('dynamic-case-id', true);
        // Now test recovery on existing static id.
        await this.runFlow(staticRootCaseId, false);
    }

    async runFlow(rootCaseId: string, runCompatibility: boolean) {
        this.addIdentifier(rootCaseId);
        // If we can find the case to be existing, then we will check compatibility.
        //  Otherwise just create the instance.
        try {
            // First check to see if the case already exists.
            await CaseService.getCase(sender, rootCaseId);
            await this.checkCompatibility(rootCaseId);
        } catch (error) {
            // Creating the initial test case also forcefully removes them from memory.
            await this.createInitialTestCaseWithEvents(rootCaseId);
            if (runCompatibility) {
                // Only run the compatiblity when requeste
                await this.checkCompatibility(rootCaseId);
            }
        }
    }

    async checkCompatibility(rootCaseId: string) {
        const caseInstance = await this.findSubCase(rootCaseId);

        const responseTaskName = 'Read response';
        const nextTasks = await TaskService.getCaseTasks(sender, caseInstance);
        const readResponseTask = findTask(nextTasks, responseTaskName);
        if (readResponseTask.assignee !== sender.id) {
            throw new Error('Expecting task to be assigned to sending user');
        }
        await TaskService.completeTask(sender, readResponseTask);
        await assertTask(sender, readResponseTask, 'Complete', TaskState.Completed, sender, sender, sender);

        // Closing the read-response task should recover the parent case
        await assertCasePlan(sender, caseInstance, State.Completed);

        // Now it should be possible to retrieve root case id again.
        await CaseService.getDiscretionaryItems(sender, rootCaseId);      

        // Close test to shut down all children. That should lead to numerous events again. Not sure how to check that. Getting model events and counting them?
        await CasePlanService.raiseEvent(sender, rootCaseId, 'Close Test');
    }

    async findSubCase(rootCaseId: string) {
        const rootCase = await CaseService.getCase(sender, rootCaseId);
        const subCase = rootCase.planitems.find(p => p.name === "HelloWorld");
        if (!subCase) {
            throw new Error('Cannot find the sub case');
        }
        this.addIdentifier(subCase.id);

        return await assertCasePlan(sender, subCase.id);
    }

    async createInitialTestCaseWithEvents(rootCaseId: string) {
        const caseTeam = new CaseTeam([new CaseOwner(sender), new CaseTeamUser(receiver)]);
        const startCase = { tenant, definition, inputs, caseInstanceId: rootCaseId, caseTeam, debug: true };

        await CaseService.startCase(sender, startCase);

        const caseInstance = await this.findSubCase(rootCaseId);

        // Change the greeting
        await CaseFileService.updateCaseFileItem(sender, caseInstance, 'Greeting', Object.assign({ ...inputs.Greeting, Message: 'hello here', }));

        // Change the case team
        await CaseTeamService.setUser(sender, caseInstance, new CaseTeamUser(employee));
        await CaseTeamService.removeUser(sender, caseInstance, new CaseTeamUser(employee));
        
        
        const taskName = 'Receive Greeting and Send response';
        const planItem = caseInstance.planitems.find((p: PlanItem) => p.name === taskName);
        if (!planItem) {
            throw new Error('Cannot find plan item ' + taskName);
        }

        const tasks = await TaskService.getCaseTasks(sender, caseInstance);
        const receiveGreetingTask = findTask(tasks, taskName);
        verifyTaskInput(receiveGreetingTask, inputs)

        await TaskService.claimTask(receiver, receiveGreetingTask);
        await assertTask(sender, receiveGreetingTask, 'Claim', TaskState.Assigned, receiver);

        await TaskService.delegateTask(receiver, receiveGreetingTask, sender);
        await assertTask(sender, receiveGreetingTask, 'Delegate', TaskState.Delegated, sender);

        await TaskService.saveTaskOutput(sender, receiveGreetingTask, { Response: { Message : 'Temporary task output'}});

        await TaskService.revokeTask(sender, receiveGreetingTask);
        await assertTask(sender, receiveGreetingTask, 'Revoke', TaskState.Assigned, receiver);

        await TaskService.completeTask(receiver, receiveGreetingTask, taskOutput);
        await assertTask(sender, receiveGreetingTask, 'Complete', TaskState.Completed, receiver);

        // Replace the greeting
        await CaseFileService.replaceCaseFileItem(sender, caseInstance, 'Greeting', { Message: 'Awaiting your response...', });

        // Delete the greeting, should include that business identifier is removed
        await CaseFileService.deleteCaseFileItem(sender, caseInstance, 'Greeting');

        await DebugService.forceRecovery(sender, caseInstance);
        await DebugService.forceRecovery(sender, rootCaseId);

        await SomeTime(1000, 'Forcefully removed the cases from memory')
    }
}
