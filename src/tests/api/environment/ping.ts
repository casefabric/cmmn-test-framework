import User from "@cafienne/typescript-client/user";
import { SomeTime } from "@cafienne/typescript-client/test/time";
import PlatformService from "@cafienne/typescript-client/service/platform/platformservice";
import TestCase from "@cafienne/typescript-client/test/testcase";

export default class PingTestEnvironment extends TestCase {
    async run() {
        await pingTestEnvironment();
    }
}

export class PingTokenService extends TestCase {
    async run() {
        await pingTokenService();
    }
}

/**
 * Ping whether the test environment is up & running by logging in as platform admin.
 * This checks both the TokenGenerator service and the Case Engine to be up & running.
 * @param platformAdmin User to test with
 * @param times Number of times to try to ping the environment
 * @param waitTime Number of milliseconds to wait inbetween various login attempts
 */
export async function pingTokenService(platformAdmin: User = new User('admin'), times: number = 5, waitTime: number = 5000) {
    do {        
        try {
            console.log("Login to IDP as platform admin ... ");
            const token = await platformAdmin.refreshToken();
            if (token) {
                console.log("Token Service is running just fine ;)");
                return;
            }
        } catch (error) {
        }
        await SomeTime(waitTime, 'Token Service is not yet up & running, waiting some time');
        times--;
    } while (times > 0);
    throw new Error('Token Service is not running; tried many times ;)')
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
            await PlatformService.getHealth().then(health => console.log("Platform health: "  + JSON.stringify(health, undefined, 2)));
            await PlatformService.getVersion().then(version => console.log("Platform version: "  + JSON.stringify(version, undefined, 2)));    

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