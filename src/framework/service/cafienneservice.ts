import { Response, Headers } from 'node-fetch';
import fetch from 'node-fetch';
import { DOMParser } from 'xmldom';
import Config from '../../config';
import User from '../user';
import QueryFilter, { extendURL } from './queryfilter';

export async function mustBeValidJSON(response: Response) {
    //  TODO: This should become a generic that enables casting the response to desired type
    if (!response.ok) {
        const text = await response.text();
        throw new Error("Request failed! " + response.status + ": " + response.statusText + ":\n" + text);
    } else {
        return response.json();
    }
}

export default class CafienneService {
    baseURL: string;
    static headers = new Headers({
        'Content-Type': 'application/json'
    });

    constructor(baseURL: string = Config.CafienneService.url) {
        this.baseURL = baseURL;
    }

    async updateCaseLastModified(response: Response) {
        // TODO: this currently is not a Singleton, but it should be...
        if (response.ok) {
            const caseLastModified = 'Case-Last-Modified';
            const clm = response.headers.get(caseLastModified);
            if (clm) {
                if (Config.CafienneService.log.traffic) {
                    console.log("Updating case last modified to " + clm);
                }
                CafienneService.headers.set(caseLastModified, clm);
            }
        }
        return response;
    }

    async postForJson(url: string, user: User, request?: object, method = 'POST') {
        const response = await this.post(url, user, request, method);
        return mustBeValidJSON(response);
    }

    async post(url: string, user: User, request?: object, method = 'POST') {
        const headers = Object.create(CafienneService.headers);
        const body = request ? JSON.stringify(request, undefined, 2) : undefined;
        return this.fetch(user, url, method, headers, body).then(this.updateCaseLastModified);
    }

    async postXML(url: string, user: User, request: Document, method = 'POST') {
        const headers = new Headers({ 'Content-Type': 'application/xml' });
        const body = request.toString();
        return this.fetch(user, url, method, headers, body);
    }

    async put(url: string, user: User, request?: object) {
        // Sorry, bit of a hack here...
        return this.post(url, user, request, 'PUT');
    }

    async get(url: string, user: User, headers: Headers = Object.create(CafienneService.headers)) {
        return this.fetch(user, url, 'GET', headers);
    }

    async getJson(url: string, user: User, filter?: QueryFilter) {
        if (filter) {
            url = extendURL(url, filter);
        }
        return this.get(url, user).then(mustBeValidJSON);
    }

    async getXml(url: string, user: User) {
        const response = await this.get(url, user, new Headers({ 'Content-Type': 'text/xml' }))
        const xml = await response.text();
        const parser = new DOMParser();
        const document = parser.parseFromString(xml, 'application/xml');
        return document;
    }

    async fetch(user: User, url: string, method: string, headers: Headers, body?: string) {
        if (user) {
            headers.set('Authorization', 'Bearer ' + user.token);
        }
        url = this.baseURL + (url.startsWith('/') ? url.substring(1) : url);

        const myCallNumber = callNumber++;
        if (Config.CafienneService.log.traffic) {
            const logBody = body ? body : '';
            console.log(`HTTP:${method}[${myCallNumber}] from [${user.id}] to ${url}\nHeaders:${JSON.stringify(headers.raw(), undefined, 2)}\n${Config.CafienneService.log.content ? ' ' + logBody : ''}\nHeaders: ${JSON.stringify(headers)}`);
        }

        const response = await fetch(url, { method, headers, body });
        if (Config.CafienneService.log.traffic) {
            console.log(` [${myCallNumber}]==> ${response.status} ${response.statusText}`);
        }
        return response;
    }
}

let callNumber: number = 0;
