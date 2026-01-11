import Config from "../config";
import logger from "../logger";
import { PollUntil } from 'poll-until-promise';

/**
* Simple helper method to wait some time.
* @param millis Number of milliseconds to wait
* @param msg Optional message shown in debug information
*/
export async function SomeTime(millis: number, msg: string = `Waiting ${millis} milliseconds`) {
    await new Promise(resolve => {
        if (Config.TestCase.log) {
            logger.debug(msg);
        }
        setTimeout(resolve, millis);
    });
}

/**
 * Await server side processing of commands. Takes the default option time from the Config setting Config.CaseEngine.cqrsWaitTime.
 * @param millis 
 * @param msg 
 */
export async function ServerSideProcessing(msg: string = `Awaiting async server processing for ${Config.CaseEngine.cqrsWaitTime} milliseconds`) {
    await SomeTime(Config.CaseEngine.cqrsWaitTime, msg);
}

/**
 * Run the action more than once until a success comes
 * @param action 
 * @param msg 
 * @param timeout 
 * @param interval 
 * @param backoffFactor 
 * @returns 
 */
export async function PollUntilSuccess(action: any, msg?: string, timeout: number = Config.TestCase.polltimeout, interval: number = 500, backoffFactor: number = 1.5) {
    const message = msg ? msg : `Failed after retrying for ${timeout} ms`;
    return await new PollUntil({interval, timeout, backoffFactor, message }).execute(action);
}
