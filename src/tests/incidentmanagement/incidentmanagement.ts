'use strict';

import Definitions from '../../cmmn/definitions/definitions';
import State from '../../cmmn/state';
import TaskState from '../../cmmn/taskstate';
import CaseTeam from '../../cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../cmmn/team/caseteamuser";
import GetMock from '../../mock/getmock';
import MockServer from '../../mock/mockserver';
import CaseService from '../../service/case/caseservice';
import TaskService from '../../service/task/taskservice';
import { assertPlanItem } from '../../test/caseassertions/plan';
import { assertTask, findTask, verifyTaskInput } from '../../test/caseassertions/task';
import TestCase from '../../test/testcase';
import WorldWideTestTenant from '../setup/worldwidetesttenant';
import IncidentContent from './incidentmanagementcontent';

const definition = Definitions.IncidentManagementForTraining;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const raiser = worldwideTenant.sender;
const solver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;

const mockPort = 17384;
const mockServer = new MockServer(mockPort);

const userMappings = new GetMock(mockServer, '/usermappings/:type', call => {
    const solver: string = "receiving-user";
    const raiser: string = "sending-user";
    const specialism = call.req.params['type'];
    let specialist = '';
    switch(specialism) {
        case "Quarterly_Statement": specialist = solver; break;
        case "Facility_Request": specialist = raiser; break;
    }
    if (!specialist) {
        call.writeHead(404, { 'Content-Type': 'text/plain' });
        call.write("There is no specialist for this type of ["+specialism+"]");
    } else {
        call.writeHead(200, { 'Content-Type': 'text/plain' });
        call.write(specialist);
    }
    call.end();
    call.setSyncMessage(`Someone asked for specialism ${specialism} and we found specialist ${specialist}`);
});

const notifyCustomer = new GetMock(mockServer, '/notifycustomer/:status', call => {
    const incidentStatus = call.req.params['status'];
    call.writeHead(200, { 'Content-Type': 'text/plain' });
    call.write("Notified Customer");
    call.end();
    call.setSyncMessage(`Notified customer on incident status ${incidentStatus}`);
})

export default class TestIncidentManagement extends TestCase {
    async onPrepareTest() {
        mockServer.start();
        await worldwideTenant.create();
        await definition.deploy(raiser, tenant);
    }

    async run() {
        const inputs = IncidentContent.inputs;
        const firstTaskInput = IncidentContent.firstTaskInput;
        const caseTeam = new CaseTeam([new CaseOwner(raiser), new CaseTeamUser(solver)]);
        const startCase = { tenant, definition, inputs, caseTeam };
        const firstTaskName = 'Verify Details';

        await this.testValidStatus(startCase, firstTaskName, firstTaskInput);

        console.log(`\n
#############################################################################
Starting another case instance of incident management to test Invalid status.
#############################################################################
                    `);

        await this.testInvalidStatus(startCase, firstTaskName, firstTaskInput);
        // In the end, stop the mock service, such that the test completes.
        mockServer.stop();

    }

    async testValidStatus(startCase: any, firstTaskName: string, firstTaskInput: any) {

        // Starts the case with raiser
        const caseInstance = await CaseService.startCase(raiser, startCase);
        this.addIdentifier(caseInstance);

        // Get case tasks
        const tasks = await TaskService.getCaseTasks(raiser, caseInstance);

        // Get Verify Details task
        const verifyDetailsTask = findTask(tasks, firstTaskName);
        verifyTaskInput(verifyDetailsTask, firstTaskInput);

        // Claim Verify Details task by raiser
        await TaskService.claimTask(raiser, verifyDetailsTask);
        await assertTask(raiser, verifyDetailsTask, 'Claim', TaskState.Assigned, raiser, raiser);

        const verifyDetailsInputs = IncidentContent.verifyDetailsInputs;

        // Complete Verify Details task by raiser
        await TaskService.completeTask(raiser, verifyDetailsTask, verifyDetailsInputs);
        await assertTask(raiser, verifyDetailsTask, 'Complete', TaskState.Completed, raiser);

        // Verify completion of Assign Specialist plan item
        await assertPlanItem(raiser, caseInstance, 'Assign Specialist', 0, State.Completed);

        // Verify completion of Assigned plan item
        await assertPlanItem(raiser, caseInstance, 'Assigned', 0, State.Completed);

        // Verify completion of first Notify Customer plan item
        await assertPlanItem(raiser, caseInstance, 'Notify Customer', 0, State.Completed);

        const secondTaskInput = IncidentContent.secondTaskInput;

        // Get case tasks
        const nextTasks = await TaskService.getCaseTasks(raiser, caseInstance);

        // Get Work on Incident task
        const workOnIncidentTask = findTask(nextTasks, 'Work on Incident');
        verifyTaskInput(workOnIncidentTask, secondTaskInput);

        // Can't claim Work on Incident task by solver as he is assigned to it
        // await TaskService.claimTask(solver, workOnIncidentTask, 400);
        await assertTask(raiser, workOnIncidentTask, 'Claim', TaskState.Assigned, solver, solver);

        const finalTaskOutput = IncidentContent.finalTaskOutput;

        // employee cannot complete a task assigned to solver
        await TaskService.completeTask(employee, workOnIncidentTask, finalTaskOutput, 404);
        await assertTask(raiser, workOnIncidentTask, 'Claim', TaskState.Assigned, solver);

        // Complete Work on Incident task by solver
        await TaskService.completeTask(solver, workOnIncidentTask, finalTaskOutput);
        await assertTask(raiser, workOnIncidentTask, 'Complete', TaskState.Completed, solver);

        // Verify completion of Complete plan item
        await assertPlanItem(raiser, caseInstance, 'Complete', 0, State.Completed);

        // Verify completion of second Notify Customer plan item
        await assertPlanItem(raiser, caseInstance, 'Notify Customer', 1, State.Completed);
    }

    async testInvalidStatus(startCase: any, firstTaskName: string, firstTaskInput: any) {

        // Starts the invalid case with raiser
        const caseInstance = await CaseService.startCase(raiser, startCase);

        // Get case tasks
        const tasks = await TaskService.getCaseTasks(raiser, caseInstance);

        // Get Verify Details task
        const verifyDetailsTask = findTask(tasks, firstTaskName);
        verifyTaskInput(verifyDetailsTask, firstTaskInput);

        // Claim Verify Details task by raiser
        await TaskService.claimTask(raiser, verifyDetailsTask);
        await assertTask(raiser, verifyDetailsTask, 'Claim', TaskState.Assigned, raiser, raiser);

        const verifyDetailsInputs = IncidentContent.verifyDetailsInputsInvalidCase;

        // Complete Verify Details task by raiser
        await TaskService.completeTask(raiser, verifyDetailsTask, verifyDetailsInputs);
        await assertTask(raiser, verifyDetailsTask, 'Complete', TaskState.Completed, raiser);

        // Verify completion of Invalid Status plan item
        await assertPlanItem(raiser, caseInstance, 'Invalid Status', 0, State.Completed);

        // Verify completion of first Notify Customer plan item
        await assertPlanItem(raiser, caseInstance, 'Notify Customer', 0, State.Completed);

        // Verify completion of Complete plan item
        await assertPlanItem(raiser, caseInstance, 'Complete', 0, State.Available);
    }
}
