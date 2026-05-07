import Definitions from "../../cmmn/definitions/definitions";
import RepositoryService, { readLocalXMLDocument } from "../../service/case/repositoryservice";
import TestCase from "../../test/testcase";
import WorldWideTestTenant from "../setup/worldwidetesttenant";

const worldwideTenant = new WorldWideTestTenant();
const user = worldwideTenant.sender;

export default class TestLargeExpression extends TestCase {
    isDefaultTest = false;
    lineReaderEnabled = true;

    async onPrepareTest() {
        await worldwideTenant.create();
    }

    async run() {
        const definitionWithLargeExpression = readLocalXMLDocument(Definitions.Expressions.file);

        const expressionSize = this.readNumber("Enter the size of the large expression (default is 20000): ") || 20000;
        console.log("Creating expression with " + expressionSize + " characters ...");
        const firstBody = definitionWithLargeExpression.getElementsByTagName('body')[0];
        for (let i = firstBody.childNodes.length - 1; i >= 0; i--) {
            firstBody.removeChild(firstBody.childNodes[i]);
        }

        const longExpression = '"' + 'a'.repeat(expressionSize) + '" != null';
        firstBody.appendChild(firstBody.ownerDocument!.createCDATASection(longExpression));

        console.log("Validating expression with " + longExpression.length + " characters ...");

        // Validating the valid case model should not result in an error
        await RepositoryService.validateCaseDefinition(user, definitionWithLargeExpression);
    }
}
