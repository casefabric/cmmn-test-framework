'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TaskService from '../../../framework/service/task/taskservice';
import TestCase from '../../../framework/test/testcase';
import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseTeam from '../../../framework/cmmn/caseteam';
import CaseTeamMember, { CaseOwner } from '../../../framework/cmmn/caseteammember';
import CaseFileService from '../../../framework/service/case/casefileservice';
import Case from '../../../framework/cmmn/case';

const repositoryService = new RepositoryService();
const definition = 'helloworld.xml';

const caseService = new CaseService();
const taskService = new TaskService();
const caseFileService = new CaseFileService();
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const employee = worldwideTenant.employee;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

export default class TestBusinessIdentifiers extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, sender, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: null,
                To: sender.id,
                From: sender.id
            }
        };
        const caseTeam = new CaseTeam([new CaseOwner(employee), new CaseTeamMember(sender), new CaseTeamMember(receiver)]);
        
        const startCase = { tenant, definition, inputs, caseTeam, debug: true };
        // const startCase = { tenant, definition, inputs, caseInstanceId: 'Ueè' };
        // const startCase = { tenant, definition, inputs, caseInstanceId: tenant };
        const taskOutput = {
            Response: {
                Message: 'Toedeledoki',
            }
        };

        let caseInstance = await caseService.startCase(startCase, sender) as Case;
        caseInstance = await caseService.getCase(caseInstance, sender);
        await caseFileService.updateCaseFileItem(caseInstance, sender, "Greeting", {Message:""});

        await caseService.getCases(sender, { identifiers: 'Message=' }).then(cases =>{
            console.log("Found " +cases.length +" cases for Message filter")
        });

        const helloFilter = { identifiers: 'Message=hello' };
        const toFilter = { identifiers: `To=${sender.id}` };
        const combinedFilter = { identifiers: `Message=hello,To=${sender.id}` };
        const lengthBeforeUpdate = await caseService.getCases(sender, { identifiers: 'Message=hello' }).then(cases =>{
            console.log("Found " +cases.length +" cases for hello filter")
            return cases.length
        });

        await taskService.getTasks(sender, helloFilter).then(tasks => {
            console.log(`Found ${tasks.length} tasks for hello filter`)
        })

        await caseFileService.updateCaseFileItem(caseInstance, sender, "Greeting", {Message:"hello"});

        console.log("\n==================\n\tUpdated case file structure\n======================\n")

        await caseService.getCases(sender, helloFilter).then(cases =>{
            console.log(`Found ${cases.length} cases for second hello filter`)
            if (lengthBeforeUpdate != cases.length - 1) {
                throw new Error(`Expected to find ${lengthBeforeUpdate + 1} cases after update, but found ${cases.length} instead`);
            }
        });

        console.log("==================\n\tRunning various task filters:\n")

        await taskService.getTasks(sender, helloFilter).then(tasks => {
            console.log(`Found ${tasks.length} tasks for second hello filter on tasks`)
        });

        await taskService.getTasks(sender, toFilter).then(tasks => {
            console.log(`Found ${tasks.length} tasks for 'to' filter on tasks`)
        });

        await taskService.getTasks(sender, combinedFilter).then(tasks => {
            console.log(`Found ${tasks.length} tasks for combination filter on tasks`)
        });

        console.log("==================\n\tRunning various case filters:\n")
        await caseService.getCases(sender, helloFilter).then(cases =>{
            console.log(`Found ${cases.length} cases for second hello filter on cases`)
        });

        await caseService.getCases(sender, toFilter).then(cases =>{
            console.log(`Found ${cases.length} cases for 'to' filter on cases`)
        });

        await caseService.getCases(sender, combinedFilter).then(cases =>{
            console.log(`Found ${cases.length} cases for combination filter on cases`)
        });

        // TODO: add testing for deleting the case file item; now business identifiers must be cleared, hence less results should come.
        // await caseFileService.deleteCaseFileItem(caseInstance, sender, "Greeting");

        console.log("CI: "+ caseInstance.id)
        return;
    }
}