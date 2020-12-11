import User from "../../user";
import Case from "../../cmmn/case";
import CafienneService from "../cafienneservice";
import { checkJSONResponse } from "../response";
import PlanItemHistory from "../../cmmn/planitemhistory";

const cafienneService = new CafienneService();

export default class CaseHistoryService {
    /**
     * Get the history of all plan items in the case
     * @param Case 
     * @param user 
     */
    async getCasePlanHistory(user: User, Case: Case, expectedStatusCode: number = 200): Promise<Array<PlanItemHistory>> {
        const response = await cafienneService.get(`/cases/${Case.id}/history/planitems`, user);
        const msg = `GetCasePlanHistory is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode, [PlanItemHistory]);
    }

    /**
     * Get the history of the plan item
     * @param Case 
     * @param user 
     * @param planItemId
     */
    async getPlanItemHistory(user: User, Case: Case, planItemId: string, expectedStatusCode: number = 200): Promise<Array<PlanItemHistory>> {
        const response = await cafienneService.get(`/cases/${Case.id}/history/planitems/${planItemId}`, user);
        const msg = `GetPlanItemHistory is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode, [PlanItemHistory]);
    }
}