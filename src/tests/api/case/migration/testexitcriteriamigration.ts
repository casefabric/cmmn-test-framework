'use strict';

import Definitions from '../../../../cmmn/definitions/definitions';
import CaseTeam from '../../../../cmmn/team/caseteam';
import { CaseOwner } from '../../../../cmmn/team/caseteamuser';
import CaseMigrationService, { DefinitionMigration } from '../../../../service/case/casemigrationservice';
import CaseService from '../../../../service/case/caseservice';
import CasePlanService from '../../../../service/case/caseplanservice';
import TestCase from '../../../../test/testcase';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';
import State from '../../../../cmmn/state';

const definition_v0 = Definitions.Migration_ExitCriteria_v0;
const definition_v1 = Definitions.Migration_ExitCriteria_v1;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestExitCriteriaMigration extends TestCase {
    // lineReaderEnabled = true;
    async onPrepareTest(): Promise<any> {
        await worldwideTenant.create();
        await definition_v0.deploy(user, tenant);
        await definition_v1.deploy(user, tenant);
    }

    async run() {


        const startCase = {
            tenant,
            definition: definition_v0,
        };

        const migratedDefinition = new DefinitionMigration(definition_v1);

        const caseInstance = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));
        this.addIdentifier(caseInstance);

        const path = (index: number, stage: string, taskName: string) => `${stage}[${index}]/${taskName}`;
        const startOuter = (index: number) => caseInstance.findItem(path(index, 'Left', 'Start Outer'));
        const raiseClose = (index: number) => caseInstance.findItem(path(index, 'Outer', 'Inner/Raise Close'));

        caseInstance.toConsole();
        this.readLine("After first");

        await CasePlanService.raiseEvent(user, caseInstance, startOuter(0));
        await caseInstance.refresh(user);
        caseInstance.toConsole();

        this.readLine("After second");

        await CasePlanService.raiseEvent(user, caseInstance, raiseClose(0));
        await caseInstance.refresh(user);
        caseInstance.toConsole();


        await CasePlanService.raiseEvent(user, caseInstance, startOuter(1));
        await caseInstance.refresh(user);
        caseInstance.toConsole();

        // Migrate
        await CaseMigrationService.migrateDefinition(user, caseInstance, migratedDefinition);
        await caseInstance.refresh(user);


        await CasePlanService.raiseEvent(user, caseInstance, raiseClose(1));
        await caseInstance.refresh(user);
        caseInstance.toConsole();

        caseInstance.assertPlanItem('Left', 2, State.Active);
    }
}
