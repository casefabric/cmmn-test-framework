import RepositoryService from "../../../service/case/repositoryservice";
import CaseEngineResponse from "../../../service/response";
import Comparison from "../../../test/comparison";
import TestCase from "../../../test/testcase";
import WorldWideTestTenant from "../../setup/worldwidetesttenant";

const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;

export default class TestInvalidDefinitions extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
    }

    async run() {
        await this.invalidateMissingNames();
        await this.invalidCaseDefinition();
    }

    async invalidateMissingNames() {
        const expectedErrors = [
            'invalidmissingname.case: The CasePlan with id cm__QTMkS_0 must have a name',
            'invalidmissingname.case: The HumanTask with id ht__QTMkS_0 must have a name',
            'invalidmissingname.case: The Milestone with id ms__QTMkS_0 must have a name'
        ];
        // Validating the invalid case model should result in an error
        const errors = await RepositoryService.validateCaseDefinition(user, 'invalidmissingname.xml', 400);
        console.log("Found errors: ", errors);
        this.expectErrors("Missing names", errors, ...expectedErrors);
    }

    async invalidCaseDefinition() {
        const invalidCaseDefinition = 'invalid.xml';

        // Validating the invalid case model should result in an error
        const errors = await RepositoryService.validateCaseDefinition(user, invalidCaseDefinition, 400);
        this.expectErrors('invalid.xml', errors, "invalid.case: A plan item with name 'cm_csQA1_4' is referenced from exitCriterion , but it does not exist in the case plan model" );
    }

    expectErrors(testDescription: string, response: string[] | CaseEngineResponse, ...expectedErrors: string[]) {
        if (response instanceof Array) {
            if (!Comparison.sameArray(response, expectedErrors)) {
                throw new Error(`Invalid Definitions Test ${testDescription} encountered wrong validation errors`);
            }
        }
    }
}