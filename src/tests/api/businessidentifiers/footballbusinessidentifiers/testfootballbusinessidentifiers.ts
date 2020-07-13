'use strict';

import CaseService from "../../../../framework/service/case/caseservice";
import WorldWideTestTenant from "../../../worldwidetesttenant";
import TestCase from "../../../../framework/test/testcase";
import TaskService from "../../../../framework/service/task/taskservice";
import RepositoryService from "../../../../framework/service/case/repositoryservice";
import CaseTeamMember, { CaseOwner } from "../../../../framework/cmmn/caseteammember";
import CaseTeam from "../../../../framework/cmmn/caseteam";
import PlayerData from "./playerdata";
import ClubData from "./clubdata";
import FiltersData from "./filtersdata";
import { assertGetCasesAndTasksFilter } from "../../../../framework/test/assertions";

const caseService = new CaseService();
const taskService = new TaskService();
const repositoryService = new RepositoryService();
const tenantName = 'football' + Math.random().toString(36).substring(2, 15);
const worldwideTenant = new WorldWideTestTenant(tenantName);
const tenant = worldwideTenant.name;
const user1 = worldwideTenant.sender;
const user2 = worldwideTenant.receiver;
const footballStatsDefinition = 'footballstats.xml';
const footballClubStatsDefinition = 'footballclubstats.xml';


export default class TestFootballBusinessIdentifiers extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();

        // Validate and deploy footballstats model
        await repositoryService.validateAndDeploy(footballStatsDefinition, user1, tenant);

        // Validate and deploy footballclubstats model
        await repositoryService.validateAndDeploy(footballClubStatsDefinition, user1, tenant);
    }

    async run() {
        const filtersData = new FiltersData(tenant);

        console.log(`\n
###################################################################
Starting business identifier's filters test for footballstats model.
###################################################################
        `);

        // Populate the case instances with the different players
        for (const data of PlayerData.playerData) {
            // Start cases with only user1 in the case team
            const inputs = { "player": data };
            const caseTeam = new CaseTeam([new CaseOwner(user1)]);
            const definition = footballStatsDefinition;
            const startCase = { tenant, definition, inputs, caseTeam };
            await caseService.startCase(startCase, user1);
        }

        // tests against all filters in testFootballStatsFilters
        for (const filter of filtersData.testFootballStatsFilters) {
            await assertGetCasesAndTasksFilter(user1, filter);
        }

        console.log(`\n
##############################################################################
Starting business identifier's multi-user filters test for footballstats model.
##############################################################################
        `);

        // Create the case instances with different players; but also with a different case team
        for (const data of PlayerData.playerDataForMultiUserTest) {
            // Case team for testing in FootballStats model (multi-user)
            const inputs = { "player": data };
            const caseTeam = new CaseTeam([new CaseOwner(user1), new CaseTeamMember(user2)]);
            const definition = footballStatsDefinition;
            const startCase = { tenant, definition, inputs, caseTeam };
            await caseService.startCase(startCase, user1);
        }

        // tests against all filters in testFootballStatsMultiUserFilters
        for (const filter of filtersData.testFootballStatsMultiUserFilters) {
            await assertGetCasesAndTasksFilter(user2, filter);
        }

        console.log(`\n
#########################################################################################
Starting business identifier's filters test for footballstats + footballclubstats models.
#########################################################################################
        `);

        // Populate the case instances with different club players
        for (const data of ClubData.clubData) {
            // Start FootballClub cases with only user1 in the case team
            const definition = footballClubStatsDefinition;
            const inputs = { "player": data };
            const caseTeam = new CaseTeam([new CaseOwner(user1)]);
            const startCase = { tenant, definition, inputs, caseTeam };
            await caseService.startCase(startCase, user1);
        }

        // tests against all filters in testFootballStatsCombinedFilters
        for (const filter of filtersData.testFootballStatsCombinedFilters) {
            await assertGetCasesAndTasksFilter(user1, filter);
        }

        // tests against all filters in testFootballStatsMultiUserCombinedFilters
        for (const filter of filtersData.testFootballStatsMultiUserCombinedFilters) {
            await assertGetCasesAndTasksFilter(user2, filter);
        }
    }
}