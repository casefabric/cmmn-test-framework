import User from "../../user";
import Case from "../../cmmn/case";
import CafienneService from "../cafienneservice";
import { checkJSONResponse, checkResponse } from "../response";
import PlanItem from "../../cmmn/planitem";
import PlanItemHistory from "../../cmmn/planitemhistory";

const cafienneService = new CafienneService();

export default class CasePlanService {
    /**
     * Get the list of plan items of the case instance
     * @param Case 
     * @param user 
     */
    async getPlanItems(Case: Case, user: User, expectedStatusCode: number = 200): Promise<Array<PlanItem>> {
        const response = await cafienneService.get(`/cases/${Case.id}/planitems`, user);
        const msg = `GetPlanItems is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode, [PlanItem]);
    }

    /**
     * Get the plan item
     * @param Case 
     * @param user 
     * @param planItemId
     */
    async getPlanItem(Case: Case, user: User, planItemId: string, expectedStatusCode: number = 200): Promise<PlanItem> {
        const response = await cafienneService.get(`/cases/${Case.id}/planitems/${planItemId}`, user);
        const msg = `GetPlanItem is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode, PlanItem);
    }

    /**
     * Get the history of the plan item
     * @param Case 
     * @param user 
     * @param planItemId
     */
    async getPlanItemHistory(Case: Case, user: User, planItemId: string, expectedStatusCode: number = 200): Promise<Array<PlanItemHistory>> {
        const response = await cafienneService.get(`/cases/${Case.id}/planitems/${planItemId}/history`, user);
        const msg = `GetPlanItemHistory is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkJSONResponse(response, msg, expectedStatusCode, [PlanItemHistory]);
    }

    /**
     * Tell the plan item to make the specified transition
     * @param Case 
     * @param user 
     * @param planItemId
     */
    async makePlanItemTransition(Case: Case, user: User, planItemId: string, transition: string, expectedStatusCode: number = 200) {
        const response = await cafienneService.post(`/cases/${Case.id}/planitems/${planItemId}/${transition}`, user);
        const msg = `MakePlanItemTransition is not expected to succeed for user ${user.id} in case ${Case.id}`;
        return checkResponse(response, msg, expectedStatusCode);
    }
}