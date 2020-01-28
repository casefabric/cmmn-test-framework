import fs from 'fs';
import { DOMParser } from 'xmldom';
import CafienneService from '../cafienneservice';
import DeployCase from './command/repository/deploycase';
import TaskService from '../task/taskservice';
import Config from '../../../config';
import User from '../../user';
import { checkResponse, checkJSONResponse } from '../response';
import Comparison from '../../test/comparison';

const FileSystem = fs;
const cafienneService = new CafienneService();

export default class RepositoryService {
    /**
     * Deploy a case model
     * @param command 
     * @param user 
     */
    async deployCase(command: DeployCase, user: User, expectNoFailures: boolean = true) {
        if (!user) {
            throw new Error('User must be specified');
        }
        const tenantQueryParameter = command.tenant ? 'tenant=' + command.tenant : '';
        // Hmmm... Duplicate '/repository/repository/' is needed currently...
        const url = `/repository/repository/deploy/${command.modelName}?${tenantQueryParameter}`;
        const response = await cafienneService.postXML(url, user, command.definition);
        return checkResponse(response, 'Deployment of case ' + command.modelName + ' failed', expectNoFailures);
    }

    /**
     * Loads a case definition from the server
     * @param fileName 
     * @param user 
     * @param tenant 
     */
    async loadCaseDefinition(fileName: string, user: User, tenant: string) {
        const modelName = fileName.endsWith('.xml') ? fileName.substring(0, fileName.length - 4) : fileName;

        const xml = await cafienneService.getXml(`/repository/load/${modelName}?tenant=${tenant}`, user);
        return xml;
    }

    /**
     * Fetch cases for the user (optionally within the tenant)
     * @param tenant 
     * @param user 
     */
    async listCaseDefinitions(user: User, tenant: string = '') {
        const json = await cafienneService.get('/repository/list?tenant=' + tenant, user).then(checkJSONResponse);
        if (Config.RepositoryService.log) {
            console.log('Cases deployed in the server: ' + JSON.stringify(json, undefined, 2))
        }
        return json;
    }

    /**
     * Invokes the validation API
     * @param definition 
     */
    async validateCaseDefinition(definition: Document, user: User, expectNoFailures: boolean = true) {
        const url = `/repository/validate`;
        const response = await cafienneService.postXML(url, user, definition);
        if (response.ok) {
            return response;
        } else {
            const messages = <Array<string>>await response.json();
            if (expectNoFailures) {
                throw new Error(`Validation failed: ${response.statusText}\n${messages.join('\n')}`);
            }
            return messages;
        }
    }

    /**
     * Combines validation and deployment call in one shot, based on the name of a locally available file
     * @param fileName File containing the case definitions.
     * @param user User that deploys the case definition.
     * @param tenant Tenant in which the definition is deployed.
     */
    async validateAndDeploy(fileName: string, user: User, tenant: string) {
        const xml = FileSystem.readFileSync(fileName, 'utf8');
        const parser = new DOMParser();
        const definition = parser.parseFromString(xml, 'application/xml');

        const serverVersion = await this.loadCaseDefinition(fileName, user, tenant);
        if (Comparison.sameXML(definition, serverVersion)) {
            if (Config.RepositoryService.log) {
                console.log(`Skipping deployment of ${fileName}, as server already has it`);
            }
            return;
        }

        await this.validateCaseDefinition(definition, user);
        const modelName = fileName.endsWith('.xml') ? fileName.substring(0, fileName.length - 4) : fileName;
        await this.deployCase({ definition, modelName, tenant }, user)
    }
}