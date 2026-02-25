'use strict';

import Definitions from '../../cmmn/definitions/definitions';
import State from '../../cmmn/state';
import { taskPrinter } from '../../cmmn/task';
import TaskState from '../../cmmn/taskstate';
import CaseTeam from '../../cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../cmmn/team/caseteamuser";
import Config from '../../config';
import CaseFileService from '../../service/case/casefileservice';
import CaseService from '../../service/case/caseservice';
import CaseTeamService from '../../service/case/caseteamservice';
import OBO_HEADER from '../../service/oboheader';
import TokenService from '../../service/platform/tokenservice';
import TaskService from '../../service/task/taskservice';
import { assertCasePlan } from '../../test/caseassertions/plan';
import { assertTask, findTask } from '../../test/caseassertions/task';
import TestCase from '../../test/testcase';
import User from '../../user';
import WorldWideTestTenant from '../setup/worldwidetesttenant';

const definition = Definitions.HelloWorld;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const employee = worldwideTenant.employee;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const systemUser = new User('system');

const hook = new OBO_HEADER();

export default class TestClientApp extends TestCase {
    isDefaultTest = false;
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(sender, tenant);
        hook.register();
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: sender.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(employee), new CaseTeamUser(sender), new CaseTeamUser(receiver)]);
        const startCase = { tenant, definition, inputs, caseTeam, debug: true };
        const caseInstance = await CaseService.startCase(sender, startCase).then(async cid => await CaseService.getCase(sender, cid));
        this.addIdentifier(caseInstance);

        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };

        const token = {
            client_id: 'client',
            iss: Config.TokenService.issuer,
            iat: Math.floor(Date.now() / 1000),
            // Set token to expire in 1 hour
            exp: Math.floor(Date.now() / 1000) + (60 * 60),
            sub: "this must match the value of the user-id-claim in the token",
        }

        await systemUser.login();
        await TokenService.fetchToken(token).then(fetchedToken => {
            console.log('Fetched token: ' + fetchedToken);
            systemUser.token = fetchedToken;
        });

        // Set the OBO header to 'abc' makes the work done on behalf of that user id.
        hook.value = systemUser.id;

        // Test that setting case team is allowed, and verify that sender no longer has access
        //  Then slowly expand the case team until sender has access again.
        await CaseTeamService.setCaseTeam(systemUser, caseInstance, new CaseTeam([new CaseOwner(employee)]));
        await CaseService.getCase(sender, caseInstance, 404); // Sender no longer has access
        await CaseService.getCase(employee, caseInstance).then(c => { // Check that employee still has access, and that modifiedBy is set to system user
            if (c.modifiedBy !== systemUser.id) {
                throw new Error(`Expected modifiedBy to be '${systemUser.id}' but found '${c.modifiedBy}' instead`);
            }
        });
        await CaseTeamService.setUser(systemUser, caseInstance, new CaseTeamUser(receiver));
        await CaseService.getCase(sender, caseInstance, 404);
        await CaseTeamService.setUser(systemUser, caseInstance, new CaseTeamUser(sender));
        await CaseService.getCase(sender, caseInstance);       

        // Doing queries as systemUser is not allowed
        await CaseService.getCase(systemUser, caseInstance, 404);
        await TaskService.getCaseTasks(systemUser, caseInstance, false, 404);

        // Check that we are allowed to update the case file.
        //  First print it with a regular user, then update it with the system user, and print it again to verify the update.
        await CaseFileService.getCaseFile(employee, caseInstance).then(caseFile => console.log('Case file BEFORE: ' + JSON.stringify(caseFile, undefined, 2)));
        await CaseFileService.updateCaseFileItem(systemUser, caseInstance, 'Greeting', { Message: "Hi there" });
        await CaseFileService.getCaseFile(employee, caseInstance).then(caseFile => console.log('\n\nCase file AFTER: ' + JSON.stringify(caseFile, undefined, 2)));

        // Now check that the system user cannot Claim a task, but is allowed to Complete that task.
        const taskName = 'Receive Greeting and Send response';
        const tasks = await TaskService.getCaseTasks(sender, caseInstance);
        const receiveGreetingTask = findTask(tasks, taskName);

        // Test that we cannot Claim the task with receiver on behalf of the system account, because ClaimTask is not allowed by the app
        hook.value = receiver.id;
        await TaskService.claimTask(systemUser, receiveGreetingTask, 401);
        await TaskService.claimTask(receiver, receiveGreetingTask);
        await assertTask(sender, receiveGreetingTask, 'Claim', TaskState.Assigned, receiver);

        // Test that we can put the name of the user in the OBO header, and that the task completion is done on behalf of that user.
        hook.value = receiver.id;
        await TaskService.completeTask(systemUser, receiveGreetingTask, taskOutput);
        await assertTask(sender, receiveGreetingTask, 'Complete', TaskState.Completed, receiver);

        const responseTaskName = 'Read response';
        const nextTasks = await TaskService.getCaseTasks(sender, caseInstance).then(taskPrinter);
        const readResponseTask = findTask(nextTasks, responseTaskName);
        if (readResponseTask.assignee !== sender.id) {
            throw new Error('Expecting task to be assigned to sending user, but found ' + readResponseTask.assignee + ' instead');
        }
        await TaskService.completeTask(sender, readResponseTask);
        await assertTask(sender, readResponseTask, 'Complete', TaskState.Completed, sender, sender, sender);

        await assertCasePlan(sender, caseInstance, State.Completed);
    }
}
