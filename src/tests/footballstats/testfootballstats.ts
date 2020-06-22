'use strict';

import RepositoryService from "../../framework/service/case/repositoryservice";
import CaseService from "../../framework/service/case/caseservice";
import WorldWideTestTenant from "../worldwidetesttenant";
import TestCase from "../../framework/test/testcase";
import CaseTeam from "../../framework/cmmn/caseteam";
import CaseTeamMember, { CaseOwner } from "../../framework/cmmn/caseteammember";
import Case from "../../framework/cmmn/case";
import CaseFileService from "../../framework/service/case/casefileservice";
import PlayerData from "./playerdata";
import User from "../../framework/user";
import StartCase from "../../framework/service/case/startcase";

const repositoryService = new RepositoryService();
const caseService = new CaseService();
const caseFileService = new CaseFileService();
const tenantName = 'football' + Math.random().toString(36).substring(2, 15);
const worldwideTenant = new WorldWideTestTenant(tenantName);
const definition = 'footballstats.xml';
const tenant = worldwideTenant.name;
const user1 = worldwideTenant.sender;
const user2 = worldwideTenant.receiver;

export default class TestFootballStats extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, user1, tenant);
    }

    async run() {
        const caseTeam1 = new CaseTeam([new CaseOwner(user1)]);
        const startCase1 = { tenant, definition, debug: true, caseTeam: caseTeam1 };
        
        const caseTeam2 = new CaseTeam([new CaseOwner(user1), new CaseTeamMember(user2)]);
        const startCase2 = { tenant, definition, debug: true, caseTeam: caseTeam2 };

        // Populate the case instances with different players
        await this.startCase(startCase1, user1, PlayerData.lewandowski.stats);
        await this.startCase(startCase1, user1, PlayerData.kimmich.stats);
        await this.startCase(startCase1, user1, PlayerData.robben.stats);
        await this.startCase(startCase1, user1, PlayerData.messi.stats);
        await this.startCase(startCase1, user1, PlayerData.ronaldo.stats);
        await this.startCase(startCase1, user1, PlayerData.robinVanPersie.stats);
        await this.startCase(startCase1, user1, PlayerData.ribery.stats);
        await this.startCase(startCase1, user1, PlayerData.neuer.stats);
        await this.startCase(startCase1, user1, PlayerData.rashford.stats);
        await this.startCase(startCase1, user1, PlayerData.iniesta.stats);
        await this.startCase(startCase1, user1, PlayerData.goretzka.stats);
        await this.startCase(startCase2, user1, PlayerData.pirlo.stats);
        await this.startCase(startCase2, user1, PlayerData.maradona.stats);
        await this.startCase(startCase2, user1, PlayerData.lahm.stats);
        await this.startCase(startCase2, user1, PlayerData.modric.stats);
        await this.startCase(startCase2, user1, PlayerData.davies.stats);

        // A test method which asserts different filters
        await this.testFilters(user1, user2);
    }

    /**
     * A simple method which starts a case
     * @param startCase 
     * @param user 
     * @param stats 
     */
    async startCase(startCase: StartCase, user: User, stats: any) {
        const caseInstance = await caseService.startCase(startCase, user) as Case;
        await caseService.getCase(caseInstance, user);

        // Create stats case file item
        await caseFileService.createCaseFileItem(caseInstance, user, 'stats', stats);
    }

    async testFilters(user1: User, user2: User) {
        // According to user1, there should be 5 retired players
        await caseService.getCases(user1, { tenant: tenantName, identifiers: 'isRetired=true' }).then(cases =>{
            if(cases.length != 5) {
                throw new Error('There should be 5 retired players; but found ' + cases.length);
            }
        });
        // According to user2, there should be 3 retired players
        await caseService.getCases(user2, { tenant: tenantName, identifiers: 'isRetired=true' }).then(cases =>{
            if(cases.length != 3) {
                throw new Error('There should be 3 retired players; but found ' + cases.length);
            }
        });
        await caseService.getCases(user1, { tenant: tenantName, identifiers: 'country!=Netherlands' }).then(cases =>{
            if(cases.length != 14) {
                throw new Error('There should be 14 non-Netherlands players; but found ' + cases.length);
            }
        });
        await caseService.getCases(user1, { tenant: tenantName, identifiers: 'foot=Left' }).then(cases =>{
            if(cases.length != 5) {
                throw new Error('There should be 5 left foot players; but found ' + cases.length);
            }
        });
        await caseService.getCases(user1, { tenant: tenantName, identifiers: 'isRetired!=true, foot=Left' }).then(cases =>{
            if(cases.length != 2) {
                throw new Error('There should be 2 left foot players who are not retired; but found ' + cases.length);
            }
        });
        await caseService.getCases(user1, { tenant: tenantName, identifiers: 'isRetired=true, country=Netherlands' }).then(cases =>{
            if(cases.length != 2) {
                throw new Error('There should be 2 retired Netherlands players; but found ' + cases.length);
            }
        });
        // According to user1, there should be 2 left foot Argentina players
        await caseService.getCases(user1, { tenant: tenantName, identifiers: 'foot!=Right, country=Argentina' }).then(cases =>{
            if(cases.length != 2) {
                throw new Error('There should be 2 left foot Argentina players; but found ' + cases.length);
            }
        });
        // According to user2, there should be 1 left foot Argentina player
        await caseService.getCases(user2, { tenant: tenantName, identifiers: 'foot!=Right, country=Argentina' }).then(cases =>{
            if(cases.length != 1) {
                throw new Error('There should be 1 left foot Argentina player; but found ' + cases.length);
            }
        });
        // According to user1, there should be 1 right foot England player
        await caseService.getCases(user1, { tenant: tenantName, identifiers: 'isRetired!=true, country=England, foot=Right' }).then(cases =>{
            if(cases.length != 1) {
                throw new Error('There should be 1 right foot England player; but found ' + cases.length);
            }
        });
        // According to user2, there should be no right foot England player
        await caseService.getCases(user2, { tenant: tenantName, identifiers: 'isRetired!=true, country=England, foot=Right' }).then(cases =>{
            if(cases.length != 0) {
                throw new Error('There should be no right foot England player; but found ' + cases.length);
            }
        });
    }
}