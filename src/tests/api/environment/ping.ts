import User from "../../../framework/user";
import { SomeTime } from "../../../framework/test/time";
import PlatformService from "../../../framework/service/platform/platformservice";
import TestCase from "../../../framework/test/testcase";

const platform = new PlatformService();

export default class PingTestEnvironment extends TestCase {
    async run() {
        await pingTestEnvironment();
    }
}

/**
 * Ping whether the test environment is up & running by logging in as platform admin.
 * This checks both the TokenGenerator service and the Case Engine to be up & running.
 * @param platformAdmin User to test with
 * @param times Number of times to try to ping the environment
 * @param waitTime Number of milliseconds to wait inbetween various login attempts
 */
export async function pingTestEnvironment(platformAdmin: User = new User('admin'), times: number = 5, waitTime: number = 5000) {
    do {
        console.log("Pinging engine for health and version ... ");
        
        try {
            await platform.getHealth().then(health => console.log("Platform health: "  + JSON.stringify(health, undefined, 2)));
            await platform.getVersion().then(version => console.log("Platform version: "  + JSON.stringify(version, undefined, 2)));    

            console.log("Login to IDP and case engine as platform admin ... ");
            const loggedIn = await login(platformAdmin);
            if (loggedIn) {
                console.log("Engine is running just fine ;)")
                return;
            }
        } catch (error) {
        }
        await SomeTime(waitTime, 'Engine is not yet up & running, waiting some time');
        times--;
    } while (times > 0);
    throw new Error('Engine is not running; tried many times ;)')
}

async function login(platformAdmin: User): Promise<boolean> {
    try {
        await platformAdmin.login();
        return true;
    } catch (error) {
        // if (error instanceof FetchError) {
            console.log("Cannot fetch. Means engine is not up. Error:", error)
            return false;
        // }
        return false;
    }
}