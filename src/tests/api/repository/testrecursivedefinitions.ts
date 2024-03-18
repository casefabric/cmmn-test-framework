import DeployCase from "../../../service/case/command/repository/deploycase";
import RepositoryService, { readLocalXMLDocument } from "../../../service/case/repositoryservice";
import Comparison from "../../../test/comparison";
import TestCase from "../../../test/testcase";
import WorldWideTestTenant from "../../setup/worldwidetesttenant";

const worldwideTenant = new WorldWideTestTenant('For-repository-testing');
const tenant = worldwideTenant.name;
const tenantOwner = worldwideTenant.sender;

export default class TestRecursiveDefinitions extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
    }

    async run() {
        const invalidCaseDefinition = 'invalidrecursion3.xml';



        // Validating the invalid case model should result in an error.
        //  We should also invalidate recursive definitions.
        await RepositoryService.validateCaseDefinition(tenantOwner, 'invalidrecursion.xml', 400).then(error => {
            if (error instanceof Array) {
                const expectedErrors = [
                    "invalidrecursion.case: CaseTask 'invalidrecursion' leads to infinite recursion, because",
                    " CaseTask['invalidrecursion'] does not have entry criteria",
                    " and Stage['Stage without entry criterion'] does not have entry criteria",
                    " and invalidrecursion always starts immediately"];

                const errors = error.join('\n').toString().split('\n');

                errors.forEach(e => console.log(`'${e}'`))

                console.log("\n\nEXPECTED\n\n")

                expectedErrors.forEach(e => console.log(`'${e}'`))

                if (!Comparison.sameArray(errors, expectedErrors)) {
                    console.log("Missing expected errors")
                }

            } else {
                throw new Error(`Unexpected response. Expecting a string array, found a ${error.constructor.name}`)
            }
        });

        const invalidRecursion1: InvalidDefinitionTest = {
            definitionFile: 'invalidrecursion.xml',
            expectedErrors: [
                "invalidrecursion.case: CaseTask 'invalidrecursion' leads to infinite recursion, because",
                " CaseTask['invalidrecursion'] does not have entry criteria",
                " and Stage['Stage without entry criterion'] does not have entry criteria",
                " and invalidrecursion always starts immediately"]
        }

        const invalidRecursion2: InvalidDefinitionTest = {
            definitionFile: 'invalidrecursion2.xml',
            expectedErrors: [
                "invalidrecursion2.case: CaseTask 'invalidrecursion2' leads to infinite recursion, because",
                " CaseTask['invalidrecursion2'] depends on a milestone that occurs immediately",
                " and Milestone['Milestone without entry criterion'] does not have entry criteria",
                " and Stage['Immediate Stage'] does not have entry criteria",
                " and invalidrecursion2 always starts immediately"]
        }

        const invalidRecursion3: InvalidDefinitionTest = {
            definitionFile: 'invalidrecursion3.xml',
            expectedErrors: [
                "invalidrecursion3.case: CaseTask 'invalidrecursion3' leads to infinite recursion, because",
                " CaseTask['invalidrecursion3'] does not have entry criteria",
                " and Stage['Stage_0'] depends on a milestone that occurs immediately",
                " and Milestone['Milestone_2'] depends on a milestone that occurs immediately",
                " and Milestone['Milestone_0'] depends on a timer that will not be canceled",
                " and TimerEvent['TimerEvent_0'] does not have entry criteria",
                " and Stage['Stage_1'] depends on a case file item that may get created immediately through a case input parameter"
            ]
        }

        const invalidRecursion4: InvalidDefinitionTest = {
            definitionFile: 'invalidrecursion4.xml',
            expectedErrors: [
                "invalidrecursion4.case: CaseTask 'invalidrecursion4' leads to infinite recursion, because",
                " CaseTask['invalidrecursion4'] has an entry criterion with only an if part expression"]
        }

        await this.testDefinition(invalidRecursion1);
        await this.testDefinition(invalidRecursion2);
        await this.testDefinition(invalidRecursion3);
        await this.testDefinition(invalidRecursion4);
    }

    async testDefinition(test: InvalidDefinitionTest) {
        await RepositoryService.validateCaseDefinition(tenantOwner, test.definitionFile, 400).then(error => {
            if (error instanceof Array) {
                // Note: we join/split the array, as the response may come with '\n' characters on the first array element. Not too sure why that happens.
                const errors = error.join('\n').toString().split('\n');

                if (!Comparison.sameArray(errors, test.expectedErrors)) {

                    console.log('Expected errors: ');
                    test.expectedErrors.forEach((e, i) => console.log(`[${i}] = '${e}'`));

                    console.log('Received errors: ');
                    errors.forEach((e, i) => console.log(`[${i}] = '${e}'`));

                    throw new Error(`Mismatch in expected errors upon validation of definition ${test.definitionFile}`);
                }

            } else {
                throw new Error(`Unexpected response. Expecting a string array, found a ${error.constructor.name}`)
            }
        });

        // Deploying an invalid case definition to a valid file name should result in an error.
        const deployInvalidCaseDefinition = new DeployCase(readLocalXMLDocument(test.definitionFile), test.definitionFile, tenant);
        await RepositoryService.deployCase(tenantOwner, deployInvalidCaseDefinition, 400);
        
    }
}

type InvalidDefinitionTest = {
    definitionFile: string;
    expectedErrors: Array<string>;
}