'use strict';

import Definitions from '../../../../cmmn/definitions/definitions';
import State from '../../../../cmmn/state';
import Transition from '../../../../cmmn/transition';
import CaseMigrationService, { DefinitionMigration } from '../../../../service/case/casemigrationservice';
import CasePlanService from '../../../../service/case/caseplanservice';
import CaseService from '../../../../service/case/caseservice';
import TestCase from '../../../../test/testcase';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';

const base_definition = Definitions.Migration_RepeatingTask_v0;
const definitionMigrated = Definitions.Migration_RepeatingTask_v1;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestReactivationMigration extends TestCase {
    tasksFound: Array<string> = [];
    async onPrepareTest() {
        await worldwideTenant.create();
        await base_definition.deploy(user, tenant);
        await definitionMigrated.deploy(user, tenant);
    }

    async run() {
        const inputs = {
            Unspecified: {
                Next: 1
            }
        };

        const startCase = {
            tenant,
            definition: base_definition,
            inputs
        };

        const migratedDefinition = new DefinitionMigration(definitionMigrated);
        const stageName = 'Test Reactivation';
        const reactivateTrigger = 'Reactivate Stage';


        const stageChecker = async (expectedState: State) => {
            await CaseService.getCase(user, caseInstance).then(newCase => {
                const stage = newCase.findItem(stageName);
                if (!stage) {
                    throw new Error(`Cannot find stage ${stageName}`)
                }
                if (!expectedState.is(stage.currentState)) {
                    throw new Error(`Expected ${stageName} to be in state '${expectedState}', but it is in state '${stage.currentState}'`);
                }
            })    
        }

        // Now start running the script

        const caseInstance = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));
        this.addIdentifier(caseInstance);
        
        await CasePlanService.makePlanItemTransition(user, caseInstance, stageName, Transition.Fault);
        // Now ensure the stage is in Failed state.
        await stageChecker(State.Failed);

        const triggerReactivate = caseInstance.findItem(reactivateTrigger);
        if (! triggerReactivate) {
            throw new Error(`Cannot find user event listener ${reactivateTrigger}`)
        }

        // Migrate caseInstance1, and then complete the task in case1
        await CaseMigrationService.migrateDefinition(user, caseInstance, migratedDefinition);

        await CasePlanService.makePlanItemTransition(user, caseInstance, reactivateTrigger, Transition.Occur);

        // Now ensure the stage is in Failed state.
        await stageChecker(State.Active);
    }
}