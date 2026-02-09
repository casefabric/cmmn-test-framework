import CaseEngineService from "../../../src/service/caseengineservice";
import TestCase from "../../../src/test/testcase";

export default class TestSwagger extends TestCase {
    async run() {
        const schema: any = await CaseEngineService.get('api-docs/swagger.json', undefined).then(response => {
            return response.validateObject(Object, 'Expected OpenAPI json schema', 200);
        });
        if (!schema.paths) {
            throw new Error(`Could not find OpenAPI 'paths' array for the case engine`)
        }

        const urls: string[] = [];
        for (const key in schema.paths) {
            urls.push(key);
        }

        console.log(`The Case Engine has ${urls.length} APIs:\n${urls.join('\n')}`);

        // Expect at least one path to start with /cases
        if (!urls.find(url => url.startsWith('/cases'))) {
            throw new Error('Cannot find a case engine api to retrieve cases');
        }
        // Expect at least one path to start with /tasks
        if (!urls.find(url => url.startsWith('/tasks'))) {
            throw new Error('Cannot find a case engine api to retrieve tasks');
        }
        // Expect at least one path to start with /tenant
        if (!urls.find(url => url.startsWith('/tenant'))) {
            throw new Error('Cannot find a case engine api to retrieve tenants');
        }
    }
}
