'use strict';

import RepositoryService from "../../framework/service/case/repositoryservice";
import CaseService from "../../framework/service/case/caseservice";
import WorldWideTestTenant from "../worldwidetesttenant";
import TestCase from "../../framework/test/testcase";
import CaseTeam from "../../framework/cmmn/caseteam";
import { CaseOwner } from "../../framework/cmmn/caseteammember";
import Case from "../../framework/cmmn/case";
import CaseFileService from "../../framework/service/case/casefileservice";
import PlayerData from "./playerdata";
import User from "../../framework/user";

const repositoryService = new RepositoryService();
const caseService = new CaseService();
const caseFileService = new CaseFileService();
const tenantName = 'football' + Math.random().toString(36).substring(2, 15);
const worldwideTenant = new WorldWideTestTenant(tenantName);
const definition = 'footballstats.xml';
const tenant = worldwideTenant.name;
const user = worldwideTenant.sender;

export default class TestFootballStats extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(definition, user, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([new CaseOwner(user)]);
        const startCase = { tenant, definition, debug: true, caseTeam };

        // Populate the case instances with different players
        await this.startCase(startCase, user, PlayerData.lewandowski.stats);
        await this.startCase(startCase, user, PlayerData.kimmich.stats);
        await this.startCase(startCase, user, PlayerData.robben.stats);
        await this.startCase(startCase, user, PlayerData.messi.stats);
        await this.startCase(startCase, user, PlayerData.ronaldo.stats);
        await this.startCase(startCase, user, PlayerData.robinVanPersie.stats);
        await this.startCase(startCase, user, PlayerData.ribery.stats);
        await this.startCase(startCase, user, PlayerData.neuer.stats);
        await this.startCase(startCase, user, PlayerData.rashford.stats);
        await this.startCase(startCase, user, PlayerData.iniesta.stats);
        await this.startCase(startCase, user, PlayerData.goretzka.stats);
        await this.startCase(startCase, user, PlayerData.pirlo.stats);
        await this.startCase(startCase, user, PlayerData.maradona.stats);
        await this.startCase(startCase, user, PlayerData.lahm.stats);
        await this.startCase(startCase, user, PlayerData.modric.stats);
        await this.startCase(startCase, user, PlayerData.davies.stats);

        // A test method which asserts different filters
        await this.testFilters(user);
    }

    /**
     * A simple method which starts a case
     * @param startCase 
     * @param user 
     * @param stats 
     */
    async startCase(startCase: any, user: User, stats: any) {
        const caseInstance = await caseService.startCase(startCase, user) as Case;
        await caseService.getCase(caseInstance, user);

        // Create stats case file item
        await caseFileService.createCaseFileItem(caseInstance, user, 'stats', stats);
    }

    async testFilters(user: User) {
        await caseService.getCases(user, { tenant: tenantName, identifiers: 'isRetired=true' }).then(cases =>{
            if(cases.length != 5) {
                throw new Error('There should be 5 retired players; but found ' + cases.length);
            }
        });
        await caseService.getCases(user, { tenant: tenantName, identifiers: 'country!=Netherlands' }).then(cases =>{
            if(cases.length != 14) {
                throw new Error('There should be 14 non-Netherlands players; but found ' + cases.length);
            }
        });
        await caseService.getCases(user, { tenant: tenantName, identifiers: 'foot=Left' }).then(cases =>{
            if(cases.length != 5) {
                throw new Error('There should be 5 left foot players; but found ' + cases.length);
            }
        });
        await caseService.getCases(user, { tenant: tenantName, identifiers: 'isRetired!=true, foot=Left' }).then(cases =>{
            if(cases.length != 2) {
                throw new Error('There should be 2 left foot players who are not retired; but found ' + cases.length);
            }
        });
        await caseService.getCases(user, { tenant: tenantName, identifiers: 'isRetired=true, country=Netherlands' }).then(cases =>{
            if(cases.length != 2) {
                throw new Error('There should be 2 retired Netherlands players; but found ' + cases.length);
            }
        });
        await caseService.getCases(user, { tenant: tenantName, identifiers: 'foot!=Right, country=Argentina' }).then(cases =>{
            if(cases.length != 2) {
                throw new Error('There should be 2 left foot Argentina players; but found ' + cases.length);
            }
        });
        await caseService.getCases(user, { tenant: tenantName, identifiers: 'isRetired!=true, country=England, foot=Right' }).then(cases =>{
            if(cases.length != 1) {
                throw new Error('There should be 1 right foot England player; but found ' + cases.length);
            }
        });
    }
}