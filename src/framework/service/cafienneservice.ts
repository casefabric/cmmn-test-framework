import { Response, Headers } from 'node-fetch';
import fetch from 'node-fetch';
import Config from '../../config';
import User from '../user';

export async function mustBeValidJSON(response: Response) {
    //  TODO: This should become a generic that enables casting the response to desired type
    console.log("Checking whether json is valid")
    if (!response.ok) {
        const text = await response.text();
        throw new Error("Request failed! " + response.status + ": " + response.statusText + ":\n" + text);
    } else {
        return response.json();
    }
}

export default class CafienneService {
    baseURL: string;
    headers = new Headers({
        'Content-Type': 'application/json'
    });;

    constructor(baseURL: string = Config.CaseService.url) {
        this.baseURL = baseURL;
    }

    updateCaseLastModified(response: Response) {
        if (response.ok) {
            console.log("Post went ok")
            const caseLastModified = 'Case-Last-Modified';
            const clm = response.headers.get(caseLastModified);
            if (clm) {
                console.log("Updating case last modified");
                this.headers.set(caseLastModified, clm);
            } else {
                console.log("No clm")
            }
        }
        return response;
    }

    async postForJson(url: string, request: object, user: User, method = 'POST') {
        const response = await this.post(url, request, user, method);
        return mustBeValidJSON(response);
    }

    async post(url: string, request: object, user: User, method = 'POST') {
        const headers = this.headers;
        if (user) headers.set('Authorization', user.token);
        const info = { method, headers, body: JSON.stringify(request) };
        console.log("\n\nHTTP - Posting - " + url, info)
        const response = await this.fetch(url, info);
        return this.updateCaseLastModified(response);
    }

    async put(url: string, request: object, user: User) {
        // Sorry, bit of a hack here...
        return this.post(url, request, user, 'PUT');
    }

    async get(url: string, user: User) {
        const method = 'GET';
        const headers = this.headers;
        if (user) headers.set('Authorization', user.token);
        const info = { method, headers };
        console.log("\n\nHTTP - Getting - " + url, info);
        const response = await this.fetch(url, info);
        return mustBeValidJSON(response);
    }

    async fetch(url: string, info: object) {
        url = this.baseURL + (url.startsWith('/') ? url.substring(1) : url);
        return fetch(url, info);
    }
}
