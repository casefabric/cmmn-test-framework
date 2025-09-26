'use strict';

import Definitions from '../../../../cmmn/definitions/definitions';
import State from '../../../../cmmn/state';
import CaseMigrationService, { DefinitionMigration } from '../../../../service/case/casemigrationservice';
import CasePlanService from '../../../../service/case/caseplanservice';
import CaseService from '../../../../service/case/caseservice';
import { assertPlanItem } from '../../../../test/caseassertions/plan';
import TestCase from '../../../../test/testcase';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';

const base_definition = Definitions.Migration_OnParts_v0;
const definitionMigrated = Definitions.Migration_OnParts_v1;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestOnPartMigration extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await base_definition.deploy(user, tenant);
        await definitionMigrated.deploy(user, tenant);
    }

    async run() {
        const startCase = { 
            tenant, 
            definition: base_definition,
        };
        const migratedDefinition = new DefinitionMigration(definitionMigrated);

        // Now start running the script

        const caseInstance = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));
        this.addIdentifier(caseInstance);

        caseInstance.toConsole();

        const u1 = caseInstance.planitems.find(i => i.name === 'UserEvent1');
        const u2 = caseInstance.planitems.find(i => i.name === 'UserEvent2');
        const u3 = caseInstance.planitems.find(i => i.name === 'UserEvent3');

        if (!u1) throw new Error("Could not find UserEvent1");
        if (!u2) throw new Error("Could not find UserEvent2");

        await assertPlanItem(user, caseInstance, "Task", 0, State.Available);

        await CasePlanService.raiseEvent(user, caseInstance, u1!.id);
        await CasePlanService.raiseEvent(user, caseInstance, u2!.id);

        await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole());

        await assertPlanItem(user, caseInstance, "Task", 0, State.Available);

        console.log("Migrating case now");
        await CaseMigrationService.migrateDefinition(user, caseInstance, migratedDefinition).then(() => CaseService.getCase(user, caseInstance));

        await CaseService.getCase(user, caseInstance).then(caseInstance => caseInstance.toConsole());

        await assertPlanItem(user, caseInstance, "Task", 0, State.Active);

    }

}