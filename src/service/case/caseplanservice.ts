import User from "../../user";
import Case from "../../cmmn/case";
import CaseEngineService from "../caseengineservice";
import { checkJSONResponse, checkResponse } from "../response";
import PlanItem from "../../cmmn/planitem";
import CMMNDocumentation from "../../cmmn/cmmndocumentation";
import Transition from "../../cmmn/transition";
import Trace from "../../infra/trace";

export default class CasePlanService {
    /**
     * Get the list of plan items of the case instance
     * @param Case 
     * @param user 
     */
    static async getPlanItems(user: User, caseId: Case | string, expectedStatusCode: number = 200, msg = `GetPlanItems is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()): Promise<Array<PlanItem>> {
        const response = await CaseEngineService.get(`/cases/${caseId}/planitems`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, [PlanItem], trace);
    }

    /**
     * Get the plan item
     * @param Case 
     * @param user 
     * @param planItemId
     */
    static async getPlanItem(user: User, caseId: Case | string, planItemId: string, expectedStatusCode: number = 200, msg = `GetPlanItem is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()): Promise<PlanItem> {
        const response = await CaseEngineService.get(`/cases/${caseId}/planitems/${planItemId}`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, PlanItem, trace);
    }

    /**
     * Get the plan item's documentation
     * @param Case 
     * @param user 
     * @param planItemId
     */
    static async getPlanItemDocumentation(user: User, caseId: Case | string, planItemId: string, expectedStatusCode: number = 200, msg = `GetPlanItem is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()): Promise<CMMNDocumentation> {
        const response = await CaseEngineService.get(`/cases/${caseId}/documentation/planitems/${planItemId}`, user);
        return checkJSONResponse(response, msg, expectedStatusCode, CMMNDocumentation, trace);
    }

    /**
     * Tell the plan item to make the specified transition
     * @param Case 
     * @param user 
     * @param planItemId
     */
    static async makePlanItemTransition(user: User, caseId: Case | string, planItemId: string, transition: Transition, expectedStatusCode: number = 200, msg = `MakePlanItemTransition is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.post(`/cases/${caseId}/planitems/${planItemId}/${transition}`, user);
        return checkResponse(response, msg, expectedStatusCode, trace);
    }

    /**
     * Tell the event to occur
     * @param Case 
     * @param user 
     * @param eventName
     */
    static async raiseEvent(user: User, caseId: Case | string, eventName: string, expectedStatusCode: number = 200, msg = `RaiseEvent is not expected to succeed for user ${user} in case ${caseId} on event ${eventName}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.post(`/cases/${caseId}/planitems/${eventName}/Occur`, user);
        return checkResponse(response, msg, expectedStatusCode, trace);
    }
}