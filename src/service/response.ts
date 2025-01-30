import { DOMParser } from '@xmldom/xmldom';
import Trace from '../util/async/trace';
import { addType, addTypes, Constructor } from '../util/json';
import AsyncEngineError from './asyncengineerror';

export default class CaseEngineResponse {
    private json_prop: any;
    private text_prop: string = '';
    private hasText: boolean = false;

    /**
     * Simple wrapper around isomorphic-fetch response.
     * But this one you can invoke .text() and .json() multiple times and also both can be invoked on same response (unlike in node-fetch)
     * @param response 
     */
    constructor(public response: Response) {
    }

    async validate(errorMsg: string, expectedStatusCode: number, trace: Trace = new Trace()): Promise<CaseEngineResponse> {
        if (this.status !== expectedStatusCode) {
            const responseText = await this.text();
            if (expectedStatusCode >= 200 && expectedStatusCode < 300) {
                // Change error messages, by default 
                // Is not expected to succeed ===> Is expected to succeed
                errorMsg = errorMsg.replace('is not expected to succeed for user', 'is expected to succeed for user');
            }
            if (!errorMsg) {
                errorMsg = `Expected status ${expectedStatusCode} instead of ${this.status} ${this.statusText}: ${responseText}`;
            }
            throw new AsyncEngineError(trace, errorMsg, this);
        }
        return this;
    }

    async validateObject<T>(returnType: Constructor<T>, errorMsg: string = '', expectedStatusCode: number, trace: Trace = new Trace()): Promise<T> {
        await this.validate(errorMsg, expectedStatusCode, trace);
        if (this.ok) {
            const json = await this.json();
            return addType(json, returnType);
        } else {
            return this as any;
        }
    }

    async validateArray<T>(returnType: Constructor<T>, errorMsg: string = '', expectedStatusCode: number, trace: Trace = new Trace()): Promise<T[]> {
        await this.validate(errorMsg, expectedStatusCode, trace);
        if (this.ok) {
            const json = await this.json();
            if (json instanceof Array) {
                return addTypes(json, returnType);
            } else {
                if (!errorMsg) {
                    errorMsg = `Expected a json array with objects of type ${returnType}, but the response was not an array: ${JSON.stringify(json, undefined, 2)}`;
                }
                throw new AsyncEngineError(trace, errorMsg, this);
            }
        } else {
            return this as any;
        }
    }

    /**
     * Creates a json object structure with response status code, status text and response message
     */
    async asJSON() {
        const tryParseJSON = (text: string | undefined) => {
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
