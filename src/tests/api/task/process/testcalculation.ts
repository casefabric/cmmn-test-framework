'use strict';

import CaseService from '@cafienne/typescript-client/service/case/caseservice';
import TestCase from '@cafienne/typescript-client/test/testcase';
import WorldWideTestTenant from '../../../worldwidetesttenant';
import RepositoryService from '@cafienne/typescript-client/service/case/repositoryservice';
import { assertPlanItem } from '@cafienne/typescript-client/test/caseassertions/plan';
import assertCaseFileContent from '@cafienne/typescript-client/test/caseassertions/file';
import DebugService from '@cafienne/typescript-client/service/case/debugservice';
import CaseFileService from '@cafienne/typescript-client/service/case/casefileservice';
import State from '@cafienne/typescript-client/cmmn/state';

const definition = 'calculation.xml';

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestCalculation extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await RepositoryService.validateAndDeploy(user, definition, tenant);
    }

    async run() {
        await this.runStep(2);
        await this.runStep(1);
    }

    async runStep(nr: number) {
        const inputs = {
            Root: {
                input1: {
                    description: 'This is first input parameter',
                    nr
                },
                input2: [{
                    message: 'i think i exist',
                    name: 'discard \'r',
                    filterOut: 1
                }, {
                    message: 'i think i exist as well',
                    name: 'wishful thought',
                    filterOut: 7
                }, {
                    message: 'i think i do not exist',
                    name: 'zom bee',
                    filterOut: 0
                }, {
                    thought: 'is a thought a message?',
                    name: 'philosopher',
                    filterOut: 0
                }],
            }
        }
        const startCase = { tenant, definition, inputs };
        const caseInstance = await CaseService.startCase(user, startCase);

        const calculationTask = 'CalculationTask';

        const taskId = await CaseService.getCase(user, caseInstance).then(v => v.planitems.find(i => i.name === calculationTask)?.id);
        if (!taskId) {
            throw new Error(`Expecting a task with name ${calculationTask} to be available in the case, but it was not found`);
        }

        try {
            await assertPlanItem(user, caseInstance, calculationTask, 0, State.Completed);
        } catch (notFoundError) {
            // If the test fails after 10 calls, get the events for the task and see if we can print any logging info
            await DebugService.getParsedEvents(caseInstance.id, user).then(events => {
                // console.log("Found events " + JSON.stringify(events, undefined, 2));
                console.log(`Found ${events.length} events, trying to print debug event`);
                const debugEvent = events.filter((e: any) => e.type === 'DebugEvent');
                console.log("Debug event " + JSON.stringify(debugEvent[0].content.messages, undefined, 2));
            });

            throw notFoundError;
        }

        await CaseFileService.getCaseFile(user, caseInstance).then(file => {
            const expectedNumOfYElements = 3;
            if (file.Output1.y.length !== expectedNumOfYElements) {
                console.log(`Case File: ${JSON.stringify(file, undefined, 2)}`);
                throw new Error(`Expecting output 1 to have ${expectedNumOfYElements} y elements, but found ${file.Output1.y.length}`)
            }
            const expectedOutput4 = nr === 1;
            if (file.Output4 !== expectedOutput4) {
                console.log(`Case File: ${JSON.stringify(file, undefined, 2)}`);
                throw new Error(`Expecting Output4 to be ${expectedOutput4} for nr ${nr}, but found ${file.Output4}`)
            }
        });

        await assertCaseFileContent(user, caseInstance, "Output4", nr === 1);


        console.log(`\nCase ID:\t${caseInstance.id}`);
    }
}

