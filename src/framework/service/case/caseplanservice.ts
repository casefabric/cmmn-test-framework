import User from "../../user";
import Case from "../../cmmn/case";
import CafienneService from "../cafienneservice";
import { checkJSONResponse, checkResponse } from "../response";
import PlanItem from "../../cmmn/planitem";
import CMMNDocumentation from "../../cmmn/cmmndocumentation";
import { checkCaseID } from "./caseservice";

const cafienneService = new CafienneService();

export default class CasePlanService {
    /**
     * Get the list of plan items of the case instance
     * @param Case 
     * @param user 
     */
    async getPlanItems(user: User, Case: Case | string | string, expectedStatusCode: number = 200): Promise<Array<PlanItem>> {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.get(`/cases/${caseId}/planitems`, user);
        const msg = `GetPlanItems is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkJSONResponse(response, msg, expectedStatusCode, [PlanItem]);
    }

    /**
     * Get the plan item
     * @param Case 
     * @param user 
     * @param planItemId
     */
    async getPlanItem(user: User, Case: Case | string, planItemId: string, expectedStatusCode: number = 200): Promise<PlanItem> {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.get(`/cases/${caseId}/planitems/${planItemId}`, user);
        const msg = `GetPlanItem is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkJSONResponse(response, msg, expectedStatusCode, PlanItem);
    }

    /**
     * Get the plan item's documentation
     * @param Case 
     * @param user 
     * @param planItemId
     */
    async getPlanItemDocumentation(user: User, Case: Case | string, planItemId: string, expectedStatusCode: number = 200): Promise<CMMNDocumentation> {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.get(`/cases/${caseId}/documentation/planitems/${planItemId}`, user);
        const msg = `GetPlanItem is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkJSONResponse(response, msg, expectedStatusCode, CMMNDocumentation);
    }

    /**
     * Tell the plan item to make the specified transition
     * @param Case 
     * @param user 
     * @param planItemId
     */
    async makePlanItemTransition(user: User, Case: Case | string, planItemId: string, transition: string, expectedStatusCode: number = 200) {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.post(`/cases/${caseId}/planitems/${planItemId}/${transition}`, user);
        const msg = `MakePlanItemTransition is not expected to succeed for user ${user.id} in case ${caseId}`;
        return checkResponse(response, msg, expectedStatusCode);
    }

    /**
     * Tell the event to occur
     * @param Case 
     * @param user 
     * @param eventName
     */
    async raiseEvent(user: User, Case: Case | string, eventName: string, expectedStatusCode: number = 200) {
        const caseId = checkCaseID(Case);
        const response = await cafienneService.post(`/cases/${caseId}/planitems/${eventName}/Occur`, user);
        const msg = `RaiseEvent is not expected to succeed for user ${user.id} in case ${caseId} on event ${eventName}`;
        return checkResponse(response, msg, expectedStatusCode);
    }
}