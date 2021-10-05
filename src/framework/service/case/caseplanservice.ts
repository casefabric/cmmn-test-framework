import User from "../../user";
import Case from "../../cmmn/case";
import CafienneService from "../cafienneservice";
import { checkJSONResponse, checkResponse } from "../response";
import PlanItem from "../../cmmn/planitem";
import CMMNDocumentation from "../../cmmn/cmmndocumentation";

export default class CasePlanService {
    /**
     * Get the list of plan items of the case instance
     * @param Case 
     * @param user 
     */
    static async getPlanItems(user: User, caseId: Case | string, expectedStatusCode: number = 200, msg = `GetPlanItems is not expected to succeed for user ${user} in case ${caseId}`): Promise<Array<PlanItem>> {
        const response = await CafienneService.get(`/cases/${caseId}/planitems`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, [PlanItem]);
    }

    /**
     * Get the plan item
     * @param Case 
     * @param user 
     * @param planItemId
     */
    static async getPlanItem(user: User, caseId: Case | string, planItemId: string, expectedStatusCode: number = 200, msg = `GetPlanItem is not expected to succeed for user ${user} in case ${caseId}`): Promise<PlanItem> {
        const response = await CafienneService.get(`/cases/${caseId}/planitems/${planItemId}`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, PlanItem);
    }

    /**
     * Get the plan item's documentation
     * @param Case 
     * @param user 
     * @param planItemId
     */
    static async getPlanItemDocumentation(user: User, caseId: Case | string, planItemId: string, expectedStatusCode: number = 200, msg = `GetPlanItem is not expected to succeed for user ${user} in case ${caseId}`): Promise<CMMNDocumentation> {
        const response = await CafienneService.get(`/cases/${caseId}/documentation/planitems/${planItemId}`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, CMMNDocumentation);
    }

    /**
     * Tell the plan item to make the specified transition
     * @param Case 
     * @param user 
     * @param planItemId
     */
    static async makePlanItemTransition(user: User, caseId: Case | string, planItemId: string, transition: string, expectedStatusCode: number = 200, msg = `MakePlanItemTransition is not expected to succeed for user ${user} in case ${caseId}`) {
        const response = await CafienneService.post(`/cases/${caseId}/planitems/${planItemId}/${transition}`, user);
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Tell the event to occur
     * @param Case 
     * @param user 
     * @param eventName
     */
    static async raiseEvent(user: User, caseId: Case | string, eventName: string, expectedStatusCode: number = 200, msg = `RaiseEvent is not expected to succeed for user ${user} in case ${caseId} on event ${eventName}`) {
        const response = await CafienneService.post(`/cases/${caseId}/planitems/${eventName}/Occur`, user);
        return checkResponse(response, msg, expectedStatusCode);
    }
}