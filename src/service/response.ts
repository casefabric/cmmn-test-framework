import { DOMParser } from 'xmldom';

export default class CafienneResponse {
    private json_prop?: any;
    private text_prop: string = '';
    private hasText: boolean = false;

    /**
     * Simple wrapper around isomorphic-fetch response.
     * But this one you can invoke .text() and .json() multiple times and also both can be invoked on same response (unlike in node-fetch)
     * @param response 
     */
    constructor(public response: Response) {
    }

    /**
     * Creates a json object structure with response status code, status text and response message
     */
    async asJSON() {
        const tryParseJSON = async (text: string | undefined) => {
            try {
                return JSON.parse(text || '');
            } catch (e) {
                console.log("Could not parse json: ", e)
                return text;
            }
        }
        const body = await this.text().then(tryParseJSON);
        return {
            statusCode: this.status,
            statusMessage: this.statusText,
            body
        }
    }

    get ok() {
        return this.response.ok;
    }
    get redirected() {
        return this.response.redirected;
    }
    get status() {
        return this.response.status;
    }

    get statusText() {
        return this.response.statusText;
    }

    get type() {
        return this.response.type;
    }

    get url() {
        return this.response.url;
    }

    get headers() {
        return this.response.headers;
    }

    async xml() {
        const xml = await this.text();
        const parser = new DOMParser();
        const document = parser.parseFromString(xml, 'application/xml');
        return document;
    }

    async text() {
        if (this.hasText) {
            return this.text_prop;
        }
        return this.response.text().then(text => {
            this.text_prop = text;
            this.hasText = true;
            return text;
        });
    }

    async json() {
        if (this.json_prop) {
            return this.json_prop;
        }
        const text = await this.text();
        this.json_prop = JSON.parse(text || '');
        return this.json_prop;
    }
}

/**
 * Validates the HTTP Response object.
 * If it succeeded, but failures where expected, it will throw an error with the given error message.
 * If it fails, but it was expected to succeed, an error with the response text will be thrown.
 * In all other cases the response itself will be returned.
 * 
 * @param response 
 * @param errorMsg 
 * @param expectedStatusCode 
 */
export async function checkResponse(response: CafienneResponse, errorMsg: string, expectedStatusCode: number): Promise<CafienneResponse> {
    if (response.status !== expectedStatusCode) {
        const responseText = await response.text();
        if (expectedStatusCode >= 200 && expectedStatusCode < 300) {
            // Change error messages, by default 
            // Is not expected to succeed ===> Is expected to succeed
            errorMsg = errorMsg.replace('is not expected to succeed for user', 'is expected to succeed for user');
        }
        if (!errorMsg) {
            errorMsg = `Expected status ${expectedStatusCode} instead of ${response.status} ${response.statusText}: ${responseText}`;
        }
        throw new Error(errorMsg);
    }
    return response;
}

/**
 * Validates the response for failure by invoking checkResponse function internally.
 * If that validation succeeds, the json of the response is returned.
 * @param response 
 * @param errorMsg 
 * @param expectedStatusCode 
 */
export async function checkJSONResponse(response: CafienneResponse, errorMsg: string = '', expectedStatusCode: number, returnType?: Function | Array<Function>): Promise<any> {
    await checkResponse(response, errorMsg, expectedStatusCode);
    if (response.ok) {
        const json = await response.json();
        if (returnType) {
            // console.log("Response is " + JSON.stringify(json, undefined, 2))
            // console.log("\n\n Return type is " , returnType)
            if (returnType instanceof Array) {
                if (returnType.length == 0) {
                    if (! errorMsg) {
                        errorMsg = 'Return type must have at least 1 element';
                    }
                    throw new Error(errorMsg);
                }
                const constructorCall = returnType[0] as any;
                if (json instanceof Array) {
                    const array = <Array<object>>json;
                    return array.map(tenantUser => Object.assign(new constructorCall, tenantUser));
                } else {
                    if (! errorMsg) {
                        errorMsg = `Expected a json array with objects of type ${constructorCall.name}, but the response was not an array: ${JSON.stringify(json, undefined, 2)}`;
                    }
                    throw new Error(errorMsg);
                }
            } else if (returnType !== undefined) {
                const constructorCall = returnType as any;
                return Object.assign(new constructorCall(), json);
            }
        }
        return json;
    } else {
        return response;
    }
}

