
'use strict';

import Definitions from '../../../cmmn/definitions/definitions';
import CaseService from '../../../service/case/caseservice';
import TestCase from '../../../test/testcase';
import WorldWideTestTenant from '../../setup/worldwidetesttenant';
import TaskService from '../../../service/task/taskservice';
import CaseMigrationService, { DefinitionMigration } from '../../../service/case/casemigrationservice';
import Case from '../../../cmmn/case';
import CaseFileService from '../../../service/case/casefileservice';

const definition = Definitions.RepeatCaseFileCreation;
const parentDefinition = Definitions.Parent;
const parentDefinition1 = Definitions.Parent1;
const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;
const tenant = worldwideTenant.name;

export default class TestRepeatingTaskOutput extends TestCase {
    lineReaderEnabled = true;
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(user, tenant);
        await parentDefinition.deploy(user, tenant);
        await parentDefinition1.deploy(user, tenant);
    }

    async run() {
        const startCase = { tenant, definition };
        const caseInstance = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));
        this.addIdentifier(caseInstance);


        await CaseService.getCase(user, caseInstance).then(instance => instance.toConsole(true));

        // this.readLine("Press enter to migrate the case definition");

        // await CaseMigrationService.migrateDefinition(user, caseInstance, new DefinitionMigration(Definitions.Parent1));


        await this.printTasks(caseInstance);

        await this.testAdditionalTaskCompletion(caseInstance);
    }

    async printTasks(caseInstance: Case) {
        const tasks = await TaskService.getCaseTasks(user, caseInstance);
        const elementTasks = tasks.filter(task => task.taskName === 'Input has individual taskitem elements');
        elementTasks.forEach((task, index) => {
            const input = JSON.stringify(task.input.In, undefined, 2);
            console.log(`Task[${index}] has input ` + input.substring(2, input.length - 2));
        });

        await CaseFileService.getCaseFile(user, caseInstance).then(file => {
            const taskOutput: any[] = file.TopLevel.TaskOutput;
            const items: any[] = taskOutput.filter(o => o.taskitems).map(o => o.taskitems);
            const i: number[] = items.reduce((accumulator, value) => accumulator.concat(value), []);
            console.log("\nFile", i);
        });

    }

    async testAdditionalTaskCompletion(caseInstance: Case) {
        const task = caseInstance.findItem('Output has array of taskitems');
        const taskOutput = {
            Out: [{
                taskitems: [{ item: 3.1 }, { item: 3.2 }],
                metadata: {
                    description: "not much in here"
                }
            }, {
                taskitems: [{ item: 4.1 }, { item: 4.2 }],
                metadata: {
                    description: "quite something in here"
                }
            }]
        };
        await TaskService.completeTask(user, task, taskOutput);
        await this.printTasks(caseInstance);
    }
}
