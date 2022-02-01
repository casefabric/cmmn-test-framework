import Config from "../../config";
import logger from "../logger";
import { PollUntil  } from 'poll-until-promise';

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
 * Await server side processing of commands. Takes the default option time from the Config setting Config.CafienneService.cqrsWaitTime.
 * @param millis 
 * @param msg 
 */
export async function ServerSideProcessing(msg: string = `Awaiting async server processing for ${Config.CafienneService.cqrsWaitTime} milliseconds`) {
    await SomeTime(Config.CafienneService.cqrsWaitTime, msg);
}

const poller:PollUntil = new PollUntil({
    interval: 500,
    timeout: Config.TestCase.polltimeout,
    backoffFactor: 1.5,
    message: `Failed after retrying for ${Config.TestCase.polltimeout} ms`
})

export async function PollUntilSuccess(action: any){
    return await poller.execute(action);
}