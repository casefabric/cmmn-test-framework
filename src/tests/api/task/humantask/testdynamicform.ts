'use strict';

import Definitions from '../../../../cmmn/definitions/definitions';
import CaseService from '../../../../service/case/caseservice';
import TaskService from '../../../../service/task/taskservice';
import { findTask } from '../../../../test/caseassertions/task';
import Comparison from '../../../../test/comparison';
import TestCase from '../../../../test/testcase';
import WorldWideTestTenant from '../../../worldwidetesttenant';

const definition = new Definitions('dynamictaskmodel.xml');

const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;

const firstTaskName = 'Task With Dynamic Form';
const secondTaskName = 'Second Task Has Different Form';

export default class TestDynamicForm extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await definition.deploy(sender, tenant);
    }

    async run() {
        const inputs = {
            Greeting: {
                Message: 'Hello there',
                From: sender.id,
                To: receiver.id
            }
        };
        const startCase = { tenant, definition, inputs };

        const caseInstance = await CaseService.startCase(sender, startCase);
        this.addIdentifier(caseInstance);

        const tasks = await TaskService.getCaseTasks(sender, caseInstance);
        const firstTaskModel = findTask(tasks, firstTaskName).taskModel;
        const secondTaskModel = findTask(tasks, secondTaskName).taskModel;

        // Verify the schema titles, they must match the task name
        if (firstTaskModel.schema.title !== firstTaskName) {
            throw new Error(`Task "${firstTaskName}" does not have the correct title in it's schema`);
        }
        if (secondTaskModel.schema.title !== secondTaskName) {
            throw new Error(`Task "${secondTaskName}" does not have the correct title in it's schema`);
        }

        // Now check some of the other fields
        if (firstTaskModel.schema.properties.Greeting.title !== `Dear ${receiver.id}`) {
            throw new Error(`Task "${firstTaskName}" does not have the correct title in it's Greeting`);
        }
        if (firstTaskModel.schema.properties.Greeting.title !== `Dear ${receiver.id}`) {
            throw new Error(`Task "${firstTaskName}" does not have the correct title in it's Greeting`);
        }

        const expectedFirstTaskModel = {
            schema: {
                title: 'Task With Dynamic Form',
                type: 'object',
                properties: {
                    Greeting: {
                        title: 'Dear receiving-user',
                        type: 'object',
                        properties: {
                            Message: {
                                title: 'A message from sending-user',
                                type: 'string'
                            },
                            Input: {
                                title: 'receiving-user',
                                type: 'string'
                            }
                        }
                    }
                }
            }
        };
        if (!Comparison.sameJSON(firstTaskModel, expectedFirstTaskModel, true)) {
            throw new Error(`Task "${firstTaskName}" does not have the expected schema`);
        }

        const expectedSecondTaskModel = {
            schema: {
                title: 'Second Task Has Different Form',
                type: 'object',
                properties: {
                    Greeting: {
                        title: 'Dear receiving-user',
                        type: 'object',
                        properties: {
                            Message: {
                                title: 'A message from sending-user',
                                type: 'string'
                            },
                            Input: {
                                title: 'sending-user',
                                type: 'boolean'
                            }
                        }
                    }
                }
            }
        }

        if (!Comparison.sameJSON(secondTaskModel, expectedSecondTaskModel, true)) {
            throw new Error(`Task "${secondTaskName}" does not have the expected schema`);
        }

        console.log(`\nCase ID: ${caseInstance.id}\n`);
    }
}
