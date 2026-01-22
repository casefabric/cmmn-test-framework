import Case from "../../cmmn/case";
import CMMNDocumentation from "../../cmmn/cmmndocumentation";
import PlanItem from "../../cmmn/planitem";
import Transition from "../../cmmn/transition";
import User from "../../user";
import Trace from "../../util/async/trace";
import CaseEngineService from "../caseengineservice";

export default class CasePlanService {
    /**
     * Get the list of plan items of the case instance
     * @param Case 
     * @param user 
     */
    static async getPlanItems(user: User, caseId: Case | string, expectedStatusCode: number = 200, msg = `GetPlanItems is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()): Promise<Array<PlanItem>> {
        const response = await CaseEngineService.get(`/cases/${caseId}/planitems`, user);
        return response.validateArray(PlanItem, msg, expectedStatusCode, trace);
    }

    /**
     * Get the plan item
     * @param Case 
     * @param user 
     * @param planItemId
     */
    static async getPlanItem(user: User, caseId: Case | string, planItemId: string, expectedStatusCode: number = 200, msg = `GetPlanItem is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()): Promise<PlanItem> {
        const response = await CaseEngineService.get(`/cases/${caseId}/planitems/${planItemId}`, user);
        return response.validateObject(PlanItem, msg, expectedStatusCode, trace);
    }

    /**
     * Get the plan item's documentation
     * @param Case 
     * @param user 
     * @param planItemId
     */
    static async getPlanItemDocumentation(user: User, caseId: Case | string, planItemId: string, expectedStatusCode: number = 200, msg = `GetPlanItem is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()): Promise<CMMNDocumentation> {
        const response = await CaseEngineService.get(`/cases/${caseId}/documentation/planitems/${planItemId}`, user);
        return response.validateObject(CMMNDocumentation, msg, expectedStatusCode, trace);
    }

    /**
     * Tell the plan item to make the specified transition
     * @param Case 
     * @param user 
     * @param planItemId
     */
    static async makePlanItemTransition(user: User, caseId: Case | string, planItemId: string, transition: Transition, expectedStatusCode: number = 200, msg = `MakePlanItemTransition is not expected to succeed for user ${user} in case ${caseId}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.post(`/cases/${caseId}/planitems/${planItemId}/${transition}`, user);
        return response.validate(msg, expectedStatusCode, trace);
    }

    /**
     * Tell the event to occur
     * @param Case 
     * @param user 
     * @param eventName
     */
    static async raiseEvent(user: User, caseId: Case | string, eventName: string, expectedStatusCode: number = 200, msg = `RaiseEvent is not expected to succeed for user ${user} in case ${caseId} on event ${eventName}`, trace: Trace = new Trace()) {
        const response = await CaseEngineService.post(`/cases/${caseId}/planitems/${eventName}/Occur`, user);
        return response.validate(msg, expectedStatusCode, trace);
    }
}
