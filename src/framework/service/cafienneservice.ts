import { Response, Headers } from 'node-fetch';
import fetch from 'node-fetch';
import { DOMParser } from 'xmldom';
import Config from '../../config';
import User from '../user';
import QueryFilter, { extendURL } from './queryfilter';

export default class CafienneService {
    static headers = new Headers({
        'Content-Type': 'application/json'
    });

    get baseURL() {
        return Config.CafienneService.url;
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

    async post(url: string, user: User, request?: object, method = 'POST') {
        const headers = Object.create(CafienneService.headers);
        const body = request ? JSON.stringify(request, undefined, 2) : undefined;
        return this.fetch(user, url, method, headers, body).then(this.updateCaseLastModified);
    }

    async postXML(url: string, user: User, request: Document, method = 'POST'): Promise<Response> {
        const headers = new Headers({ 'Content-Type': 'application/xml' });
        const body = request.toString();
        return this.fetch(user, url, method, headers, body);
    }

    async put(url: string, user: User, request?: object) {
        // Sorry, bit of a hack here...
        return this.post(url, user, request, 'PUT');
    }

    async delete(url: string, user: User) {
        const headers = Object.create(CafienneService.headers);
        return this.fetch(user, url, 'DELETE', headers);
    }

    async get(url: string, user: User, filter?: QueryFilter, headers: Headers = Object.create(CafienneService.headers)) {
        if (filter) {
            url = extendURL(url, filter);
        }
        return this.fetch(user, url, 'GET', headers);
    }

    async getXml(url: string, user: User) {
        const response = await this.get(url, user, undefined, new Headers({ 'Content-Type': 'text/xml' }))
        const xml = await response.text();
        const parser = new DOMParser();
        const document = parser.parseFromString(xml, 'application/xml');
        return document;
    }

    async fetch(user: User, url: string, method: string, headers: Headers, body?: string): Promise<Response> {
        if (user) {
            headers.set('Authorization', 'Bearer ' + user.token);
        }
        url = this.baseURL + (url.startsWith('/') ? url.substring(1) : url);

        const myCallNumber = callNumber++;
        if (Config.CafienneService.log.traffic) {
            const logBody = body ? body : '';
            console.log(`HTTP:${method}[${myCallNumber}] from [${user.id}] to ${url}\nHeaders:${JSON.stringify(headers.raw(), undefined, 2)}\n${Config.CafienneService.log.content ? ' ' + logBody : ''}\nHeaders: ${JSON.stringify(headers)}`);
        }

        const response: Response = await fetch(url, { method, headers, body });
        if (Config.CafienneService.log.traffic) {
            console.log(` [${myCallNumber}]==> ${response.status} ${response.statusText}`);
        }
        return response;
    }
}

let callNumber: number = 0;
