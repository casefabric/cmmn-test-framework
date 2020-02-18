import { Response } from 'node-fetch';
import { DOMParser } from 'xmldom';

export default class CafienneResponse {
    private json_prop?: any;
    private text_prop?: string;
    private hasText: boolean = false;

    /**
     * Simple wrapper around node-fetch response.
     * But this one you can invoke .text() and .json() multiple times and also both can be invoked on same response (unlike in node-fetch)
     * @param response 
     */
    constructor(public response: Response) {
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
        this.json_prop = JSON.parse(text);
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
 * @param expectNoFailures 
 */
export async function checkResponse(response: CafienneResponse, errorMsg: string, expectNoFailures: boolean): Promise<any> {
    if (response.ok) {
        if (!expectNoFailures) throw new Error(errorMsg);
    } else {
        if (expectNoFailures) {
            const responseText = await response.text();
            const errorMsg = response.status + ' ' + response.statusText + ': ' + responseText;
            // console.log(response.status + ' ' + response.statusText + ': ' + responseText);
            throw new Error(errorMsg);
        }
    }
    return response;
}

/**
 * Validates the response for failure by invoking checkResponse function internally.
 * If that validation succeeds, the json of the response is returned.
 * @param response 
 * @param errorMsg 
 * @param expectNoFailures 
 */
export async function checkJSONResponse(response: CafienneResponse, errorMsg: string = '', expectNoFailures: boolean = true): Promise<any> {
    await checkResponse(response, errorMsg, expectNoFailures);
    if (response.ok) {
        return response.json();
    } else {
        return response;
    }
}

