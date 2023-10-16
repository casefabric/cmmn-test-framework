import Case from '../../cmmn/case';
import PlanItem from '../../cmmn/planitem';
import State from '../../cmmn/state';
import Config from '../../config';
import AsyncError from '../../infra/asyncerror';
import Trace from '../../infra/trace';
import logger from '../../logger';
import CaseService from '../../service/case/caseservice';
import User from '../../user';
import { PollUntilSuccess } from '../time';

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
export async function assertPlanItem(user: User, caseId: Case | string, planItemIdentifier: string, planItemIndex: number = -1, expectedState?: State, trace: Trace = new Trace()): Promise<PlanItem> {
    return await PollUntilSuccess(async () => {
        const freshCase = await CaseService.getCase(user, caseId);
        if (Config.TestCase.log) {
            const longestNameLength = Math.max(...freshCase.planitems.map(item => item.name.length));
            const longestState = Math.max(...freshCase.planitems.map(item => item.currentState.length));
            logger.debug(' Current Plan Items\n' + (freshCase.planitems.map(item => ` ${item.name.padStart(longestNameLength)}.${item.index} ==> ${item.currentState.padEnd(longestState)} (id: ${item.id})`)).join('\n'));
        }
        const nameFilter = (item: PlanItem): boolean => item.name === planItemIdentifier || item.id === planItemIdentifier;
        const indexFilter = (item: PlanItem): boolean => planItemIndex >= 0 ? item.index === planItemIndex : true;
        const stateFilter = (item: PlanItem): boolean => expectedState ? State.of(item.currentState).is(expectedState) : true;

        const matchers = freshCase.planitems.filter(item => nameFilter(item) && indexFilter(item));
        const item = matchers.find(stateFilter);
        if (item) {
            return item;
        }

        const currentMsg = !matchers.length ? 'not (yet) found in the case plan' : `in state ${matchers[matchers.length - 1].currentState}`;
        throw new AsyncError(trace, `Did not find the plan item '${planItemIdentifier}.${planItemIndex}' in state ${expectedState}`);
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
