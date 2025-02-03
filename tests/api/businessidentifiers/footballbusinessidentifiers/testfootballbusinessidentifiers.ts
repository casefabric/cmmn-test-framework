'use strict';

import Definitions from "../../../definitions/definitions";
import CaseTeam from "../../../../src/cmmn/team/caseteam";
import CaseTeamUser, { CaseOwner } from "../../../../src/cmmn/team/caseteamuser";
import CaseService from "../../../../src/service/case/caseservice";
import TaskService from "../../../../src/service/task/taskservice";
import TestCase from "../../../../src/test/testcase";
import Util from "../../../../src/test/util";
import User from "../../../../src/user";
import WorldWideTestTenant from "../../../../src/tests/setup/worldwidetesttenant";
import ClubData from "./clubdata";
import FiltersData from "./filtersdata";
import PlayerData from "./playerdata";

const footballStatsDefinition = Definitions.FootballStats;
const footballClubStatsDefinition = Definitions.FootballClubStats;

export default class TestFootballBusinessIdentifiers extends TestCase {
    footballTenant = new WorldWideTestTenant(this.tenant);
    user1 = this.footballTenant.sender;
    user2 = this.footballTenant.receiver;

    constructor(public tenant: string = Util.generateId('football')) {
        super();
    }

    async onPrepareTest() {
        await this.footballTenant.create();

        // Validate and deploy footballstats model
        await footballStatsDefinition.deploy(this.user1, this.tenant);

        // Validate and deploy footballclubstats model
        await footballClubStatsDefinition.deploy(this.user1, this.tenant);
    }

    async run() {
        const tenant = this.tenant;
        const filtersData = new FiltersData(tenant);

        console.log(`\n
###################################################################
Starting business identifier's filters test for footballstats model.
###################################################################
        `);

        // Populate the case instances with the different players
        for (const data of PlayerData.playerData) {
            // Start cases with only this.user1 in the case team
            const inputs = { "player": data };
            const caseTeam = new CaseTeam([new CaseOwner(this.user1)]);
            const definition = footballStatsDefinition;
            const startCase = { tenant, definition, inputs, caseTeam };
            await CaseService.startCase(this.user1, startCase);
        }

        // tests against all filters in testFootballStatsFilters
        for (const filter of filtersData.testFootballStatsFilters) {
            await assertGetCasesAndTasksFilter(this.user1, filter);
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
            const caseTeam = new CaseTeam([new CaseOwner(this.user1), new CaseTeamUser(this.user2)]);
            const definition = footballStatsDefinition;
            const startCase = { tenant, definition, inputs, caseTeam };
            await CaseService.startCase(this.user1, startCase);
        }

        // tests against all filters in testFootballStatsMultiUserFilters
        for (const filter of filtersData.testFootballStatsMultiUserFilters) {
            await assertGetCasesAndTasksFilter(this.user2, filter);
        }

        console.log(`\n
#########################################################################################
Starting business identifier's filters test for footballstats + footballclubstats models.
#########################################################################################
        `);

        // Populate the case instances with different club players
        for (const data of ClubData.clubData) {
            // Start FootballClub cases with only this.user1 in the case team
            const definition = footballClubStatsDefinition;
            const inputs = { "player": data };
            const caseTeam = new CaseTeam([new CaseOwner(this.user1)]);
            const startCase = { tenant, definition, inputs, caseTeam };
            await CaseService.startCase(this.user1, startCase);
        }

        // tests against all filters in testFootballStatsCombinedFilters
        for (const filter of filtersData.testFootballStatsCombinedFilters) {
            await assertGetCasesAndTasksFilter(this.user1, filter);
        }

        // tests against all filters in testFootballStatsMultiUserCombinedFilters
        for (const filter of filtersData.testFootballStatsMultiUserCombinedFilters) {
            await assertGetCasesAndTasksFilter(this.user2, filter);
        }
    }
}


/**
 * A simple assertion method for filters against getCases, and getTasks
 * @param user
 * @param input should contain filter, expectedValue, and message fields
 */
async function assertGetCasesAndTasksFilter(user: User, input: any) {
    // Asserts test filter against getCases
    await CaseService.getCases(user, input.filter).then(cases => {
        if (cases.length != input.expectedValue) {
            throw new Error(input.message + cases.length);
        }
    });

    // Asserts test filter against getTasks
    await TaskService.getTasks(user, input.filter).then(tasks => {
        if (tasks.length != input.expectedValue) {
            throw new Error(input.message + tasks.length);
        }
    });
}