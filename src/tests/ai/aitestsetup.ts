import Case from '../../cmmn/case';
import Definitions from '../../cmmn/definitions/definitions';
import OpenAiMock from '../../mock/openaimock';
import AiService from '../../service/ai/aiservice';
import CaseFileService from '../../service/case/casefileservice';
import User, { admin } from '../../user';
import WorldWideTestTenant from '../setup/worldwidetesttenant';

/**
 * What the AI tests share: the tenant, the AI platform configuration that maps the roles of the test model to the fake
 * OpenAI model, and the answers of that model for the declarative agent LeadQualifier (casemodels/bin/ai/declarative_lead.xml).
 * These tests need the AI image (cafienne/engine:latest-ai) with OPENAI_BASE_URL on the OpenAI mock; run them with "npm run test ai".
 */
export const worldwideTenant = new WorldWideTestTenant();
export const tenant = worldwideTenant.name;
export const definition = Definitions.AiDeclarativeLead;

export const FAKE_MODEL = 'gpt-4.1-mini';

export const configuration = {
    description: 'AI tests of cmmn-test-framework',
    roles: {
        cheap: { model: FAKE_MODEL, temperature: 0.0 },
        qualifier: { model: FAKE_MODEL }
    }
};

export const company = { name: 'Acme Robotics', products: ['robots', 'grippers'], address: { city: 'Utrecht', country: 'NL' } };
export const qualifiedLead = { name: 'Acme Robotics', rating: 8, reason: 'Makes robots and pays its bills' };

export const leadRequest = { LeadRequest: { description: 'robot makers', country: 'the Netherlands' } };

export function openAi(creditScore: number = 720): OpenAiMock {
    return OpenAiMock.get().reset()
        .answer('Find the company', company)
        .answer('Estimate a credit score', { score: creditScore })
        .answer('Qualify', qualifiedLead);
}

export async function prepareAi() {
    await worldwideTenant.create();
    await AiService.deployConfiguration(admin, configuration);
    await definition.deploy(worldwideTenant.sender, tenant);
}

/**
 * The qualified lead in the case file is the goal value of the agent, with the AI-generated marker inside it
 * (_provenance) and next to it (AiMarker), EU AI Act Art. 50(2)
 */
export async function assertQualifiedLead(user: User, caseInstance: Case) {
    const file = await CaseFileService.getCaseFile(user, caseInstance);
    const lead = file.QualifiedLead;
    if (!lead) {
        throw new Error(`Expected QualifiedLead in the case file, but found ${JSON.stringify(file)}`);
    }
    Object.entries(qualifiedLead).forEach(([field, value]) => {
        if (lead[field] !== value) {
            throw new Error(`Expected QualifiedLead.${field} to be ${JSON.stringify(value)}, but found ${JSON.stringify(lead[field])}`);
        }
    });
    if (lead._provenance?.aiGenerated !== true || file.AiMarker?.aiGenerated !== true) {
        throw new Error(`Expected the AI-generated marker in QualifiedLead._provenance and in AiMarker, but found ${JSON.stringify(file)}`);
    }
    if (lead._provenance.agent?.name?.indexOf('LeadQualifier@') !== 0) {
        throw new Error(`Expected the marker to name the agent version, but found ${JSON.stringify(lead._provenance.agent)}`);
    }
}
