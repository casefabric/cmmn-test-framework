'use strict';

import CaseService from '../../framework/service/case/caseservice';
import TaskService from '../../framework/service/task/taskservice';
import TestCase from '../../framework/test/testcase';
import WorldWideTestTenant from '../worldwidetesttenant';
import RepositoryService from '../../framework/service/case/repositoryservice';
import Comparison from '../../framework/test/comparison';
import { SomeTime, ServerSideProcessing } from '../../framework/test/time';
import Config from '../../config';
import User from '../../framework/user';
import Task from '../../framework/cmmn/task';
import StartCase from '../../framework/service/case/startcase';
import TenantUser from '../../framework/tenant/tenantuser';
import TenantService from '../../framework/service/tenant/tenantservice';
import CaseTeam from '../../framework/cmmn/caseteam';
import CaseTeamMember from '../../framework/cmmn/caseteammember';
import Case from '../../framework/cmmn/case';

const repositoryService = new RepositoryService();
const definition = 'travelrequest.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const requestor = new TenantUser('requestor', ['Requestor'], 'Hank', 'requestor@requestors.com');
const approver = new TenantUser('approver', ['Approver'], 'Gerald', 'gerald-the-approver@mostly-helpless.com');
const lana = new TenantUser('lana', ['PersonalAssistant', 'Requestor', 'Approver'], 'lana', 'lana@all-you-need-is-me.com');
const tenantService = new TenantService();

export default class TestTravelRequest extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        const platformOwner = worldwideTenant.sender;
        try {
            await tenantService.addTenantUser(platformOwner, worldwideTenant.tenant, requestor);
            await tenantService.addTenantUser(platformOwner, worldwideTenant.tenant, approver);
            await tenantService.addTenantUser(platformOwner, worldwideTenant.tenant, lana);            
        } catch (e) {
            if (!e.message.indexOf('already exists')) {
                console.log(e);
                throw e;
            }
        }

        await repositoryService.validateAndDeploy(definition, platformOwner, tenant);

        await ServerSideProcessing();
        await ServerSideProcessing("This step fails toooooo often");

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
                TravelDetails : {
                    Destination,
                    DepartureDate: '2016-09-06',
                    ReturnDate: '2016-09-08',
                    DeparturePoint: 'The Hague',
                    ReturnPoint: 'The Hague',
                    Purpose: 'Cyber Security Symposium',
                    Justification: ''
                },
                TravellerDetails:  {
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
                Transport:  {
                    ModeOfTransport: 'Shuttle'
                },
                Project : { 
                    Manager: approver.id,
                    Assistant: lana.id
                }
            }
        };
        const caseTeam = new CaseTeam([
            new CaseTeamMember(approver, 'user', true, ['Approver'])
            , new CaseTeamMember(lana, 'user', false, ['PersonalAssistant'])
            , new CaseTeamMember(requestor, 'user', false, ['Requestor'])
        ]);
        const startCase: StartCase = { tenant, definition, inputs, debug: true, caseTeam };
        const caseInstance = await caseService.startCase(startCase, requestor) as Case;
        await caseService.getCase(caseInstance, approver).then(caseInstance => {
            // console.log("CI: " + caseInstance)
        });

        const tasks = await taskService.getCaseTasks(caseInstance, approver);
        console.log("Approver tasks: ", tasks);
        const approvalTask = tasks.find(task => task.taskName === approvalTaskName);
        if (! approvalTask) {
            throw new Error('Did not receive expected task with name ' + approvalTaskName);
        }

        const approveTaskOutput = {
            Approval: {
                Status: 'approved',
                ApprovedBy: approver.name,
                ApprovalTimestamp: '2016-08-18T14:43:38Z'
            }
        };

        await taskService.completeTask(approvalTask, approver, approveTaskOutput);

        await lana.login();
        const lanasCaseTasks = await taskService.getCaseTasks(caseInstance, lana);
        const createTravelOrderTask = lanasCaseTasks.find(task => task.taskName === createTravelOrderTaskName);
        if (! createTravelOrderTask) {
            throw new Error('Did not receive expected task with name ' + createTravelOrderTaskName);
        }

        await taskService.claimTask(createTravelOrderTask, lana);
        await taskService.completeTask(createTravelOrderTask, lana);

        if (Destination === destinationUS) {
            console.log("We also need to arrange Visa and Esta");
            const requestorTasks = await taskService.getCaseTasks(caseInstance, requestor);
            const arrangeVisaTask = requestorTasks.find(task => task.taskName === arrangeVisaTaskName)
            if (! arrangeVisaTask) {
                throw new Error('Did not receive expected task with name ' + arrangeVisaTaskName);
            }
                await taskService.completeTask(arrangeVisaTask, requestor);
        }

        console.log("Completed test case travel request for case with id " + caseInstance.id);
    }
}
