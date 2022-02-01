import User from '../../user';
import CaseService from '../../service/case/caseservice';
import Case from '../../cmmn/case';
import { SomeTime } from '../time';
import PlanItem from '../../cmmn/planitem';
import Config from '../../config';
import logger from '../../logger';

/**
 * Retrieves the plan items of the case and asserts that the plan item has the expected state.
 * Optionally runs repeated loops to await the plan item to reach the expected state.
 * Handy to use for ProcessTask and CaseTasks and their potential follow-ups, as these tasks run asynchronously in the backend.
 * @param caseId 
 * @param user 
 * @param planItemName 
 * @param planItemIndex 
 * @param expectedState 
 * @param maxAttempts 
 * @param waitTimeBetweenAttempts 
 * @returns {Promise<PlanItem>} the plan item if it is found
 * @throws {Error} if the plan item is not found after so many attempts
 */
export async function assertPlanItem(user: User, caseId: Case | string, planItemName: string, planItemIndex: number = 0, expectedState?: string, maxAttempts: number = 20, waitTimeBetweenAttempts = 1000): Promise<PlanItem> {
    let currentAttempt = 1;
    while (currentAttempt < maxAttempts) {
        if (Config.TestCase.log) {
            logger.info(`Running attempt ${currentAttempt} of ${maxAttempts} to find '${planItemName}.${planItemIndex}' in state ${expectedState}`);
        }
        const freshCase = await CaseService.getCase(user, caseId);
        if (Config.TestCase.log) {
            logger.debug('Current Plan Items\n' + (freshCase.planitems.map(item => "- '" + item.name + "." + item.index + "' ==> '" + item.currentState + "'")).join('\n'));
        }
        const nameFilter = (item: PlanItem): boolean => item.name === planItemName;
        const indexFilter = (item: PlanItem): boolean => planItemIndex >= 0 ? item.index === planItemIndex : true;
        const stateFilter = (item: PlanItem): boolean => expectedState ? item.currentState === expectedState : true;

        const matchers = freshCase.planitems.filter(item => nameFilter(item) && indexFilter(item));        
        const item = matchers.find(stateFilter);
        if (item) {
            return item;
        }

        const currentMsg = !matchers.length ? 'not (yet) found in the case plan' : `in state ${matchers[matchers.length - 1].currentState}`;
        await SomeTime(waitTimeBetweenAttempts, `Waiting ${waitTimeBetweenAttempts} millis before refreshing info on '${planItemName}.${planItemIndex}' to be in state ${expectedState}. The item is currently ${currentMsg}`);
        currentAttempt++;
    }
    throw new Error(`Did not find the plan item '${planItemName}.${planItemIndex}' in state ${expectedState} after ${maxAttempts} attempts`);
}

/**
 * Asserts the state of the case plan
 * @param caseId 
 * @param user 
 * @param expectedState 
 */
export async function assertCasePlan(user: User, caseId: Case | string, expectedState?: string, maxAttempts: number = 20, waitTimeBetweenAttempts = 1000) {
    const tryGetCase = async () => {
        try {
            // Get case details
            return await CaseService.getCase(user, caseId);
        } catch (error) {
            // ignore the error
        }
    }
    let currentAttempt = 1;
    while (currentAttempt < maxAttempts) {
        if (Config.TestCase.log) {
            logger.info(`Running attempt ${currentAttempt} of ${maxAttempts} to find case ${caseId} in state ${expectedState}`);
        }
        // Get case details
        const freshCase = await tryGetCase();
        if (freshCase && (!expectedState || freshCase.state === expectedState)) {
            return freshCase;
        }
        if (currentAttempt >= maxAttempts) {
            break;
        }
        const currentMsg = !freshCase ? 'not (yet) found' : `in state ${freshCase.state}`;
        await SomeTime(waitTimeBetweenAttempts, `Waiting ${waitTimeBetweenAttempts} millis before refreshing info on case ${caseId} to be in state ${expectedState}. The item is currently ${currentMsg}`);
        currentAttempt++;
    }
    throw new Error(`Did not find the case ${caseId} in state ${expectedState} after ${maxAttempts} attempts`);
}
