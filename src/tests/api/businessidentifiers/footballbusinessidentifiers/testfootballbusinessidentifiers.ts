'use strict';

import CaseService from "../../../../framework/service/case/caseservice";
import WorldWideTestTenant from "../../../worldwidetesttenant";
import TestCase from "../../../../framework/test/testcase";
import User from "../../../../framework/user";
import TaskService from "../../../../framework/service/task/taskservice";
import RepositoryService from "../../../../framework/service/case/repositoryservice";
import CaseFileService from "../../../../framework/service/case/casefileservice";
import StartCase from "../../../../framework/service/case/startcase";
import Case from "../../../../framework/cmmn/case";
import CaseTeamMember, { CaseOwner } from "../../../../framework/cmmn/caseteammember";
import CaseTeam from "../../../../framework/cmmn/caseteam";
import PlayerData from "./playerdata";
import ClubData from "./clubdata";
import FiltersData from "./filtersdata";

const caseService = new CaseService();
const taskService = new TaskService();
const caseFileService = new CaseFileService();
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
            await this.assertGetCasesAndTasksFilter(user1, filter);
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
            await this.assertGetCasesAndTasksFilter(user2, filter);
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
            await this.assertGetCasesAndTasksFilter(user1, filter);
        }

        // tests against all filters in testFootballStatsMultiUserCombinedFilters
        for (const filter of filtersData.testFootballStatsMultiUserCombinedFilters) {
            await this.assertGetCasesAndTasksFilter(user2, filter);
        }
    }

    /**
     * A simple assertion method against getCases, and getTasks
     * @param user
     * @param input
     */
    async assertGetCasesAndTasksFilter(user: User, input: any) {
        // Asserts test filter against getCases
        await caseService.getCases(user, input.filter).then(cases => {
            if (cases.length != input.expectedValue) {
                throw new Error(input.message + cases.length);
            }
        });

        // Asserts test filter against getTasks
        await taskService.getTasks(user, input.filter).then(tasks => {
            if (tasks.length != input.expectedValue) {
                throw new Error(input.message + tasks.length);
            }
        });
    }
}