import fs from 'fs';
import { DOMParser } from 'xmldom';
import CafienneService from '../cafienneservice';
import DeployCase from './command/repository/deploycase';
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
        const url = `/repository/deploy/${command.modelName}?${tenantQueryParameter}`;
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
     * Fetch cases for the user
     * @param tenant 
     * @param user 
     */
    async listCaseDefinitions(user: User, tenant: string) {
        const json = await cafienneService.get('/repository/list?tenant=' + tenant, user).then(checkJSONResponse);
        if (Config.RepositoryService.log) {
            console.log('Cases deployed in the server: ' + JSON.stringify(json, undefined, 2))
        }
        return json;
    }

    /**
     * Invokes the validation API
     * @param source 
     */
    async validateCaseDefinition(source: Document|string, user: User, expectNoFailures: boolean = true) {
        const url = `/repository/validate`;
        const xml = parseXMLDocument(source);
        const response = await cafienneService.postXML(url, user, xml);
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
        const definition = parseXMLDocument(fileName);
        const modelName = fileName;

        const serverVersion = await this.loadCaseDefinition(modelName, user, tenant);
        if (Comparison.sameXML(definition, serverVersion)) {
            if (Config.RepositoryService.log) {
                console.log(`Skipping deployment of ${fileName}, as server already has it`);
            }
            return;
        }

        await this.validateCaseDefinition(definition, user);
        await this.deployCase({ definition, modelName, tenant }, user)
    }
}

function parseXMLDocument(content: any): Document {
    if (content.constructor.name == 'Document') {
        return content;
    }
    const xml = FileSystem.readFileSync(content, 'utf8');
    const parser = new DOMParser();
    return parser.parseFromString(xml, 'application/xml');
}