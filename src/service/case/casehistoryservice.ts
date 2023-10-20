import Case from "../../cmmn/case";
import PlanItemHistory from "../../cmmn/planitemhistory";
import Trace from "../../infra/trace";
import User from "../../user";
import CafienneService from "../cafienneservice";
import { checkJSONResponse } from "../response";

export default class CaseHistoryService {
    /**
     * Get the history of all plan items in the case
     * @param Case 
     * @param user 
     */
    static async getCasePlanHistory(user: User, caseId: Case | string, expectedStatusCode: number = 200, msg = `GetCasePlanHistory is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()): Promise<Array<PlanItemHistory>> {
        const response = await CafienneService.get(`/cases/${caseId}/history/planitems`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, [PlanItemHistory], trace);
    }

    /**
     * Get the history of the plan item
     * @param Case 
     * @param user 
     * @param planItemId
     */
    static async getPlanItemHistory(user: User, caseId: Case | string, planItemId: string, expectedStatusCode: number = 200, msg = `GetPlanItemHistory is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()): Promise<Array<PlanItemHistory>> {
        const response = await CafienneService.get(`/cases/${caseId}/history/planitems/${planItemId}`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, [PlanItemHistory], trace);
    }
}