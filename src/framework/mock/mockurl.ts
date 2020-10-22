import { Response, Request, } from 'express';
import Config from '../../config';
import MockServer from './mockserver';
import { OutgoingHttpHeaders } from 'http';
import { timingSafeEqual } from 'crypto';

export default class MockURL {
    private calls = new CallHistory();

    constructor(public mockServer: MockServer, public url: string, private callback: (call: MockInvocation) => void, public timeout: number = 5000) {
        this.mockServer.mocks.push(this);
    }

    async untilCallInvoked(millis: number = this.timeout) {
        return this.calls.awaitCall(this, millis);
    }

    /**
     * 
     * @param response 
     */
    syncPromise(response: any) {
        // TODO: make sure that MockInvocation and Call are (somehow) merged...
        this.calls.syncPromise(this, response);
    }

    register() {
        if (Config.MockService.registration) {
            console.log(`Registering mock on ${this.method} ${this.url}`);
        }
        // const expressFunction = this.method.toLowerCase();
        this.addRoute();
    }

    get method() {
        return this.constructor.name.substring(0, this.constructor.name.length - 4).toUpperCase();
    }

    handleRoute(req: Request, res: Response, next: Function) {
        if (Config.MockService.log) {
            console.group(`Mock ${this.method} ${this.url}: handling call on url "${req.url}"`)
        }
        this.callback(new MockInvocation(req, res, next, this));
        console.groupEnd();
    }

    addRoute() {
        throw new Error('This method must be implemented in ' + this.constructor.name);
    }
}


export class MockInvocation {
    private __syncMessage: any = undefined;

    constructor(public req: Request, public res: Response, public next: Function, public mock: MockURL) {
    }

    /**
     * Sets the sync message that will be returned for calls to untilCallInvoked on the Mock endpoint
     * @param msg 
     */
    setSyncMessage(msg: any) {
        this.mock.syncPromise(msg);
    }

    writeHead(statusCode: number, headers?: OutgoingHttpHeaders) {
        this.res.writeHead(statusCode, headers);
    }

    write(content: any) {
        this.res.write(content);
    }

    fail(statusCode: number, content: any) {
        this.res.status(statusCode).write(content);
        this.res.end();
    }

    json(content?: any) {
        this.res.json(content);
        this.res.end();
    }

    end() {
        this.res.end();
    }
}


class CallHistory {
    private urlList: Array<Call> = [];
    constructor() {

    }

    async awaitCall(mock: MockURL, waitTime: number) {
        return this.getCall(mock, 'waiterAvailable').awaitResponse(waitTime);
    }

    private getCall(mock: MockURL, booleanField: string): Call {
        const existingCall = this.urlList.find(call => call.isPendingOn(booleanField));
        if (existingCall) {
            return existingCall;
        } else {
            const newCall = new Call(mock);
            this.urlList.push(newCall);
            return newCall;
        }
    }

    syncPromise(mock: MockURL, response: any) {
        this.getCall(mock, 'responseAvailable').registerResponse(response);
    }
}

class Call {
    waiterAvailable: boolean = false;
    private resolver: Function = () => { console.log("I am not the right done function") };
    private response: any = undefined;
    responseAvailable: boolean = false;

    constructor(public mock: MockURL) {
        if (Config.MockService.log) {
            console.log(`Creating Call Matcher on URL ${mock.url}`);
        }
    }

    isPendingOn(flag: string) {
        if (flag === 'waiterAvailable') return !this.waiterAvailable;
        if (flag === 'responseAvailable') return !this.responseAvailable;
        throw new Error(`Unknown flag ${flag}`);
    }

    awaitResponse(timeout: number) {
        if (Config.MockService.log) {
            console.log(`${this.mock.url}: Awaiting response for ${timeout} milliseconds`)
        }
        const promise = new Promise((resolve, reject) => {
            this.resolver = resolve;
            if (this.responseAvailable) this.resolver(this.response);
            setTimeout(() => {
                // Only reject if the response has not yet arrived.
                if (!this.responseAvailable) {
                    if (Config.MockService.log) {
                        console.log(`${this.mock.url}: Raising timeout after ${timeout} milliseconds`)
                    }
                    reject(new Error(`The url ${this.mock.url} was not invoked within ${timeout} milliseconds`))
                }
            }, timeout);
        });
        this.waiterAvailable = true;
        return promise;
    }

    registerResponse(response: any) {
        if (Config.MockService.log) {
            if (Config.MockService.response) {
                console.log(`${this.mock.url}: Received response: ` + JSON.stringify(response, undefined, 2));
            } else {
                console.log(`${this.mock.url}: Received response`);
            }
        }
        this.response = response;
        this.responseAvailable = true;
        if (this.waiterAvailable) this.resolver(this.response);
    }
}