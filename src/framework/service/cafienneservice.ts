import { Response, Headers } from 'node-fetch';
import fetch from 'node-fetch';
import Config from '../../config';
import User from '../user';
import QueryFilter, { extendURL } from './queryfilter';
import CafienneResponse from './response';

export default class CafienneService {
    static headers = new Headers({
        'Content-Type': 'application/json'
    });

    get baseURL() {
        return Config.CafienneService.url;
    }

    async updateCaseLastModified(response: CafienneResponse) {
        // TODO: this currently is not a Singleton, but it should be...
        if (response.ok) {
            const caseLastModified = 'Case-Last-Modified';
            const clm = response.headers.get(caseLastModified);
            if (clm) {
                if (Config.CafienneService.log.response.headers) {
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

    async postXML(url: string, user: User, request: Document, method = 'POST'): Promise<CafienneResponse> {
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

    async getXml(url: string, user: User) : Promise<Document> {
        return (await this.get(url, user, undefined, new Headers({ 'Content-Type': 'text/xml' }))).xml();
    }

    async fetch(user: User, url: string, method: string, headers: Headers, body?: string): Promise<CafienneResponse> {
        // Each time make sure we take the latest Authorization header from the user, or send no Authorization along
        headers.delete('Authorization');
        if (user && user.token) {
            headers.set('Authorization', 'Bearer ' + user.token);
        } 
        url = this.baseURL + (url.startsWith('/') ? url.substring(1) : url);

        const myCallNumber = callNumber++;
        if (Config.CafienneService.log.url) {
            console.log(`\n\nHTTP:${method}[${myCallNumber}] from [${user.id}] to ${url}`);
        }
        if (Config.CafienneService.log.request.headers) {
            printHeaders('Request headers:', headers.raw());
        }
        if (Config.CafienneService.log.request.body && body) {
            console.log(body);
        }

        const response = await fetch(url, { method, headers, body }).then(response => new CafienneResponse(response));
        if (Config.CafienneService.log.response.status) {
            console.log(`\n [${myCallNumber}]==> ${response.status} ${response.statusText}`);
        }
        if (Config.CafienneService.log.response.headers) {
            printHeaders('Response headers:', response.headers.raw());
        }
        if (Config.CafienneService.log.response.body) {
            await response.text().then(text => console.log(text));
        }
        
        return response;
    }
}

function printHeaders(msg: String, headers: any) {
    console.log(msg)
    for (const key in headers) {
        console.log(` ${key}\t: ${headers[key].join(', ')}`)
    }
}

let callNumber: number = 0;
