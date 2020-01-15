import { Response, Headers } from 'node-fetch';
import fetch from 'node-fetch';
import Config from '../../config';
import User from '../user';

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
    });;

    constructor(baseURL: string = Config.CaseService.url) {
        this.baseURL = baseURL;
    }

    async updateCaseLastModified(response: Response) {
        // TODO: this currently is not a Singleton, but it should be...
        if (response.ok) {
            const caseLastModified = 'Case-Last-Modified';
            const clm = response.headers.get(caseLastModified);
            if (clm) {
                if (Config.CaseService.logTraffic) {
                    console.log("Updating case last modified to " + clm);
                }
                CafienneService.headers.set(caseLastModified, clm);
            }
        }
        return response;
    }

    async postForJson(url: string, request: object, user: User, method = 'POST') {
        const response = await this.post(url, request, user, method);
        return mustBeValidJSON(response);
    }

    async post(url: string, request: object, user: User, method = 'POST') {
        const headers = Object.create(CafienneService.headers);
        if (user) headers.set('Authorization', user.token);
        const requestJSON = JSON.stringify(request, undefined, 2);
        const info = { method, headers, body: requestJSON };
        const response = await this.fetch(url, info, method, user, requestJSON);
        await this.updateCaseLastModified(response);
        return response;
    }

    async put(url: string, request: object, user: User) {
        // Sorry, bit of a hack here...
        return this.post(url, request, user, 'PUT');
    }

    async get(url: string, user: User) {
        const method = 'GET';
        const headers = Object.create(CafienneService.headers);
        if (user) headers.set('Authorization', user.token);
        const info = { method, headers };
        const response = await this.fetch(url, info, method, user);
        return mustBeValidJSON(response);
    }

    async fetch(url: string, request: object, method: string, user: User, logInfo: string = '') {
        url = this.baseURL + (url.startsWith('/') ? url.substring(1) : url);
        if (Config.CaseService.logTraffic) {
            console.log('HTTP:' + method + ' from [' + user.id + '] to ' + url + ' ' + logInfo + '\n');
        }
        return fetch(url, request);
    }
}
