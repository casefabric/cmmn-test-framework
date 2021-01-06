import fetch from 'isomorphic-fetch';
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
            const readAndUpdateHeader = (headerName: string) => {
                const headerValue = response.headers.get(headerName);
                if (headerValue) {
                    if (Config.CafienneService.log.response.headers) {
                        console.log(`Updating ${headerName} to ${headerValue}`);
                    }
                    CafienneService.headers.set(headerName, headerValue);
                }
            }

            readAndUpdateHeader('Case-Last-Modified');
            readAndUpdateHeader('Tenant-Last-Modified');
        }
        return response;
    }

    async post(url: string, user: User, request?: object, method = 'POST') {
        const headers = Object.create(CafienneService.headers);
        const body = (typeof request === 'string') ? `"${request}"` : request ? JSON.stringify(request, undefined, 2) : undefined;
        return this.fetch(user, url, method, headers, body);
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

    async get(url: string, user: User | undefined, filter?: QueryFilter, headers: Headers = Object.create(CafienneService.headers)) {
        if (filter) {
            url = extendURL(url, filter);
        }
        return this.fetch(user, url, 'GET', headers);
    }

    async getXml(url: string, user: User): Promise<Document> {
        const headers = new Headers({ 'Content-Type': 'text/xml' })
        const clm = CafienneService.headers.get('Case-Last-Modified');
        if (clm) {
            headers.set('Case-Last-Modified', clm);
        }
        return (await this.get(url, user, undefined, headers)).xml();
    }

    async fetch(user: User | undefined, url: string, method: string, headers: Headers, body?: string): Promise<CafienneResponse> {
        // Each time make sure we take the latest Authorization header from the user, or send no Authorization along
        headers.delete('Authorization');
        if (user && user.token) {
            headers.set('Authorization', 'Bearer ' + user.token);
        }
        url = this.baseURL + (url.startsWith('/') ? url.substring(1) : url);

        const myCallNumber = callNumber++;
        if (Config.CafienneService.log.url) {
            console.log(`\n\nHTTP:${method}[${myCallNumber}] from [${user ? user.id : ''}] to ${url}`);
        }
        if (Config.CafienneService.log.request.headers) {
            printHeaders('Request headers:', headers);
        }
        if (Config.CafienneService.log.request.body && body) {
            console.log(body);
        }

        const response = await fetch(url, { method, headers, body }).then(response => new CafienneResponse(response)).then(this.updateCaseLastModified);
        if (Config.CafienneService.log.response.status) {
            if (Config.CafienneService.log.request.headers || (Config.CafienneService.log.request.body && body)) {
                // Add an extra newline to show the response
                console.log();
            }
            console.log(`RESPONSE[${myCallNumber}]==> ${response.status} ${response.statusText}`);
        }
        if (Config.CafienneService.log.response.headers) {
            printHeaders('Response headers:', response.headers);
        }
        if (Config.CafienneService.log.response.body || (Config.CafienneService.log.response.error && !response.ok)) {
            await response.text().then(text => console.log(text));
        }

        return response;
    }
}

export function printHeaders(msg: string, headers: Headers) {
    console.log(msg)
    const rawHeaders = (headers as any).raw();
    for (const key in rawHeaders) {
        console.log(` ${key}\t: ${rawHeaders[key].join(', ')}`)
    }
}

let callNumber: number = 0;
