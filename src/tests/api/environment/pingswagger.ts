import CafienneService from "../../../framework/service/cafienneservice";
import TestCase from "../../../framework/test/testcase";

export default class PingSwagger extends TestCase {
    async run() {
        await CafienneService.get('api-docs/swagger.json', undefined);
    }
}