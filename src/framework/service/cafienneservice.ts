import { Response, Headers } from 'node-fetch';
import fetch from 'node-fetch';
import Config from '../../config';
import User from '../user';
import CaseService from './case/caseservice';
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

    constructor(baseURL: string = Config.CaseService.url) {
        this.baseURL = baseURL;
    }

    async updateCaseLastModified(response: Response) {
        // TODO: this currently is not a Singleton, but it should be...
        if (response.ok) {
            const caseLastModified = 'Case-Last-Modified';
            const clm = response.headers.get(caseLastModified);
            if (clm) {
                if (Config.CaseService.log.traffic) {
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
        if (user) headers.set('Authorization', user.token);
        const body = request ? JSON.stringify(request, undefined, 2) : undefined;
        const info = { method, headers, body };
        return this.fetch(url, info, method, user, body).then(this.updateCaseLastModified);
        // const response = await this.fetch(url, info, method, user, requestJSON);
        // await this.updateCaseLastModified(response);
        // return response;
    }

    async put(url: string, user: User, request?: object) {
        // Sorry, bit of a hack here...
        return this.post(url, user, request, 'PUT');
    }

    async get(url: string, user: User, headers: Headers = Object.create(CafienneService.headers)) {
        const method = 'GET';
        if (user) headers.set('Authorization', user.token);
        const info = { method, headers };
        return this.fetch(url, info, method, user);
    }

    async getJson(url: string, user: User, filter?: QueryFilter) {
        if (filter) {
            url = extendURL(url, filter);
        }
        return this.get(url, user).then(mustBeValidJSON);
    }

    async getXml(url: string, user: User) {
        return this.get(url, user, new Headers({ 'Content-Type':'text/xml'})).then(response => {
            console.log("Got a response: ", response)
            response.text().then(t => {
                console.log("RT: "+t)
            })
        })
    }

    async fetch(url: string, request: object, method: string, user: User, body: string = '') {
        const myCallNumber = callNumber++;
        url = this.baseURL + (url.startsWith('/') ? url.substring(1) : url);
        if (Config.CaseService.log.traffic) {
            console.log(`HTTP:${method}[${callNumber}] from [${user.id}] to ${url}${Config.CaseService.log.content?' '+body:''}`);
        }
        const response = await fetch(url, request);
        if (Config.CaseService.log.traffic) {
            console.log(` [${callNumber}]==> ${response.status} ${response.statusText}`);
        }
        return response;
    }
}

let callNumber: number = 0;
