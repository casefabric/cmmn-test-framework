import Case from '../../cmmn/case';
import PlanItem from '../../cmmn/planitem';
import State from '../../cmmn/state';
import CaseService from '../../service/case/caseservice';
import User from '../../user';
import AsyncError from '../../util/async/asyncerror';
import Trace from '../../util/async/trace';
import { PollUntilSuccess } from '../time';
import Transition from '../../cmmn/transition';

/**
 * Retrieves the plan items of the case and asserts that the plan item has the expected state.
 * Optionally runs repeated loops to await the plan item to reach the expected state.
 * Handy to use for ProcessTask and CaseTasks and their potential follow-ups, as these tasks run asynchronously in the backend.
 * @param caseId 
 * @param user 
 * @param planItemIdentifier 
 * @param planItemIndex 
 * @param expectedState 
 * @param maxAttempts 
 * @param waitTimeBetweenAttempts 
 * @returns {Promise<PlanItem>} the plan item if it is found
 * @throws {Error} if the plan item is not found after so many attempts
 */
export async function assertPlanItem(user: User, caseId: Case | string, planItemIdentifier: string, planItemIndex: number = -1, expectedState?: State, expectedTransition?: Transition, trace: Trace = new Trace()): Promise<PlanItem> {
    return await PollUntilSuccess(async () => {
        const freshCase = await CaseService.getCase(user, caseId);
        try {
            return freshCase.assertPlanItem(planItemIdentifier, planItemIndex, expectedState, expectedTransition);
        } catch (error) {
            throw new AsyncError(trace, error.message);
        }
    });
}

/**
 * Asserts the state of the case plan
 * @param caseId 
 * @param user 
 * @param expectedState 
 */
export async function assertCasePlan(user: User, caseId: Case | string, expectedState?: State, trace: Trace = new Trace()): Promise<Case> {
    return await PollUntilSuccess(async () => {
        const tryGetCase = async () => {
            try {
                // Get case details
                return await CaseService.getCase(user, caseId);
            } catch (error) {
                // ignore the error
            }
        }
        // Get case details
        const freshCase = await tryGetCase();
        if (freshCase && (!expectedState || State.of(freshCase.state).is(expectedState))) {
            return freshCase;
        }
        throw new AsyncError(trace, `Did not find the case ${caseId} in state ${expectedState}`);
    });
}
