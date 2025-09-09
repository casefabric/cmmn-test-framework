'use strict';

import Definitions from '../../../../cmmn/definitions/definitions';
import CaseTeam from '../../../../cmmn/team/caseteam';
import { CaseOwner } from '../../../../cmmn/team/caseteamuser';
import CaseMigrationService, { DefinitionMigration } from '../../../../service/case/casemigrationservice';
import CaseService from '../../../../service/case/caseservice';
import TestCase from '../../../../test/testcase';
import WorldWideTestTenant from '../../../setup/worldwidetesttenant';

const base_definition = Definitions.Migration_EntryCriteria_v0;
const definitionMigrated = Definitions.Migration_EntryCriteria_v1;
const worldwideTenant = new WorldWideTestTenant();
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestEntryCriteriaMigration extends TestCase {
    async onPrepareTest(): Promise<any> {
        await worldwideTenant.create();
        await base_definition.deploy(user, tenant);
        await definitionMigrated.deploy(user, tenant);
    }

    async run() {
        
        const inputs = {};

        const caseTeam = new CaseTeam([
            new CaseOwner(user, []), new CaseOwner("suzy", [])
        ]);

        const startCase = {
            tenant,
            definition: base_definition,
            inputs,
            caseTeam
        };

        if (base_definition.isDeployed) {
            console.log("Case definition v0 deployed");
        } else {
            console.error("Case definition v0 NOT deployed");
        }

        if (definitionMigrated.isDeployed) {
            console.log("Case definition v1 deployed");
        } else {
            console.error("Case definition v1 NOT deployed");
        }

        const migratedDefinition = new DefinitionMigration(definitionMigrated);

        const caseBefore = await CaseService.startCase(user, startCase).then(instance => CaseService.getCase(user, instance));

        this.addIdentifier(caseBefore);

        // Migrate
        const caseAfter = await CaseMigrationService.migrateDefinition(user, caseBefore, migratedDefinition).then(() => CaseService.getCase(user, caseBefore));

        const printer = (item: any) => `${item.type}[name = ${item.name} | index = ${item.index} | id = ${item.id} | state = ${item.currentState}]`;

        console.log(`Found ${caseBefore.planitems.length} plan items before:\n- ${caseBefore.planitems.map(printer).join('\n- ')}`);
        console.log(`\nFound ${caseAfter.planitems.length} plan items after:\n- ${caseAfter.planitems.map(printer).join('\n- ')}`);

        const repeatingStageName = 'repeating stage'

        const repeatingStagesBefore = caseBefore.planitems.filter(item => item.name === repeatingStageName);
        const repeatingStagesAfter = caseAfter.planitems.filter(item => item.name === repeatingStageName);

        if (repeatingStagesBefore.length !== 1) {
            throw new Error(`Expected to find 1 repeating stage before migration, but found ${repeatingStagesBefore.length}`);
        }
        if (repeatingStagesAfter.length !== 1) {
            throw new Error(`Expected to find 1 repeating stage after migration, but found ${repeatingStagesAfter.length}`);
        }
    }
}