'use strict';

import Definitions from '../definitions/definitions';
import CaseTeam from '../../src/cmmn/team/caseteam';
import CaseTeamUser, { CaseOwner } from "../../src/cmmn/team/caseteamuser";
import CaseService from '../../src/service/case/caseservice';
import RepositoryService from '../../src/service/case/repositoryservice';
import StartCase from '../../src/service/case/startcase';
import TaskService from '../../src/service/task/taskservice';
import TenantService from '../../src/service/tenant/tenantservice';
import TenantUser from '../../src/tenant/tenantuser';
import TestCase from '../../src/test/testcase';
import WorldWideTestTenant from '../../src/tests/setup/worldwidetesttenant';

const definition = Definitions.TravelRequest;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const requestor = new TenantUser('requestor', ['Requestor'], 'Hank', 'requestor@requestors.com');
const approver = new TenantUser('approver', ['Approver'], 'Gerald', 'gerald-the-approver@mostly-helpless.com');
const lana = new TenantUser('lana', ['PersonalAssistant', 'Requestor', 'Approver'], 'lana', 'lana@all-you-need-is-me.com');

export default class TestTravelRequest extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        const platformOwner = worldwideTenant.sender;
        try {
            await TenantService.setTenantUser(platformOwner, worldwideTenant.tenant, requestor);
            await TenantService.setTenantUser(platformOwner, worldwideTenant.tenant, approver);
            await TenantService.setTenantUser(platformOwner, worldwideTenant.tenant, lana);
        } catch (e) {
            if (e instanceof Error && e.message.indexOf('already exists') < 0) {
                console.log(e);
                throw e;
            }
        }

        await definition.deploy(platformOwner, tenant);
        await requestor.login();
        await approver.login();
    }

    async run() {
        const approvalTaskName = 'Approve Travel request';
        const createTravelOrderTaskName = 'Create Travel Order';
        const arrangeVisaTaskName = 'Arrange Visa and ESTA';

        const destinationBelgium = [{ Country: 'BE', City: 'Brussels' }];
        const destinationUS = [{ Country: 'US', City: 'Washington' }];

        // const Destination = destinationBelgium;
        const Destination = destinationUS;

        const inputs = {
            TravelRequest: {
                TravelDetails: {
                    Destination,
                    DepartureDate: '2016-09-06',
                    ReturnDate: '2016-09-08',
                    DeparturePoint: 'The Hague',
                    ReturnPoint: 'The Hague',
                    Purpose: 'Cyber Security Symposium',
                    Justification: ''
                },
                TravellerDetails: {
                    RequestDate: '2016-08-18',
                    Requestor: requestor.id,
                    Traveller: [{
                        Name: 'Mr. ' + requestor.name,
                        Email: requestor.email,
                        Nationality: 'NL',
                        PassNo: 'NLHG01'
                    }]
                },
                Meeting: {
                    StartDate: '2016-09-07',
                    EndDate: '2016-09-08',
                    DurationIncLeave: 3
                },
                Transport: {
                    ModeOfTransport: 'Shuttle'
                },
                Project: {
                    Manager: approver.id,
                    Assistant: lana.id
                }
            }
        };
        const caseTeam = new CaseTeam([
            new CaseOwner(approver, ['Approver'])
            , new CaseTeamUser(lana, ['PersonalAssistant'])
            , new CaseTeamUser(requestor, ['Requestor'])
        ]);
        const startCase: StartCase = { tenant, definition, inputs, debug: true, caseTeam };
        const caseInstance = await CaseService.startCase(requestor, startCase);
        this.addIdentifier(caseInstance);
        await CaseService.getCase(approver, caseInstance).then(caseInstance => {
            // console.log("CI: " + caseInstance)
        });

        const tasks = await TaskService.getCaseTasks(approver, caseInstance);
        console.log("Approver tasks: ", tasks);
        const approvalTask = tasks.find(task => task.taskName === approvalTaskName);
        if (!approvalTask) {
            throw new Error('Did not receive expected task with name ' + approvalTaskName);
        }

        const approveTaskOutput = {
            Approval: {
                Status: 'approved',
                ApprovedBy: approver.name,
                ApprovalTimestamp: '2016-08-18T14:43:38Z'
            }
        };

        await TaskService.completeTask(approver, approvalTask, approveTaskOutput);

        await lana.login();
        const lanasCaseTasks = await TaskService.getCaseTasks(lana, caseInstance);
        const createTravelOrderTask = lanasCaseTasks.find(task => task.taskName === createTravelOrderTaskName);
        if (!createTravelOrderTask) {
            throw new Error('Did not receive expected task with name ' + createTravelOrderTaskName);
        }

        await TaskService.claimTask(lana, createTravelOrderTask);
        await TaskService.completeTask(lana, createTravelOrderTask);

        if (Destination === destinationUS) {
            console.log("We also need to arrange Visa and Esta");
            const requestorTasks = await TaskService.getCaseTasks(requestor, caseInstance);
            const arrangeVisaTask = requestorTasks.find(task => task.taskName === arrangeVisaTaskName)
            if (!arrangeVisaTask) {
                throw new Error('Did not receive expected task with name ' + arrangeVisaTaskName);
            }
            await TaskService.completeTask(requestor, arrangeVisaTask);
        }

        console.log("Completed test case travel request for case with id " + caseInstance.id);
    }
}
