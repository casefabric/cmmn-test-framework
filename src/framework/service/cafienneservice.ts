import fetch from 'isomorphic-fetch';
import Config from '../config';
import logger from '../logger';
import User from '../user';
import QueryFilter, { extendURL } from './queryfilter';
import CafienneResponse from './response';

class CafienneHeaders {
    public values:any = new Object();
    setHeader(name: string, value: any) {
        this.values[name] = value;
    }
}

const BaseHeaders = new CafienneHeaders();
BaseHeaders.setHeader('Content-Type', 'application/json');

export default class CafienneService {
    /**
     * Returns base headers (copying case-last-modified and tenant-last-modified) and 
     * sets a new bearer token based on the user's token
     * Optionally copies the additional headers from the "from" object
     * @param user 
     * @param from 
     */
    static getHeaders(user: User, from: any = {}) {
        return getHeaders(user, from);
    }

    static get baseURL() {
        return Config.CafienneService.url;
    }

    static async updateCaseLastModified(response: CafienneResponse) {
        // TODO: this currently is not a Singleton, but it should be...
        if (response.ok) {
            const readAndUpdateHeader = (headerName: string) => {
                const headerValue = response.headers.get(headerName);
                if (headerValue) {
                    if (Config.CafienneService.log.response.headers) {
                        logger.debug(`Updating ${headerName} to ${headerValue}`);
                    }
                    BaseHeaders.setHeader(headerName, headerValue);
                }
            }

            readAndUpdateHeader('Case-Last-Modified');
            readAndUpdateHeader('Tenant-Last-Modified');
            readAndUpdateHeader('Consent-Group-Last-Modified');
        }
        return response;
    }

    static async post(url: string, user: User, request?: object, method = 'POST') {
        const body = (typeof request === 'string') ? `"${request}"` : request ? JSON.stringify(request, undefined, 2) : undefined;
        return this.fetch(user, url, method, getHeaders(user), body);    
    }

    static async postXML(url: string, user: User, request: Document, method = 'POST'): Promise<CafienneResponse> {
        const headers = getHeaders(user, { 'Content-Type': 'application/xml'});
        const body = request.toString();
        return this.fetch(user, url, method, headers, body);
    }

    static async put(url: string, user: User, request?: object) {
        // Sorry, bit of a hack here...
        return this.post(url, user, request, 'PUT');
    }

    static async delete(url: string, user: User) {
        return this.fetch(user, url, 'DELETE');
    }

    static async patch(user: User, url: string) {
        const headers = getHeaders(user);
        return this.fetch(user, url, 'PATCH', headers);
    }

    static async get(url: string, user: User | undefined, filter?: QueryFilter, headers?: Headers) {
        if (filter) {
            url = extendURL(url, filter);
        }
        return this.fetch(user, url, 'GET', headers);
    }

    static async getXml(url: string, user: User): Promise<Document> {
        const headers = getHeaders(user, {'Content-Type': 'text/xml'});
        return (await this.get(url, user, undefined, headers)).xml();
    }

    static async fetch(user: User | undefined, url: string, method: string, headers?: Headers, body?: string): Promise<CafienneResponse> {
        if (! headers) {
            headers = getHeaders(user);
        }

        // Each time make sure we take the latest Authorization header from the user, or send no Authorization along
        url = this.baseURL + (url.startsWith('/') ? url.substring(1) : url);

        const myCallNumber = callNumber++;
        if (Config.CafienneService.log.url) {
            logger.info(`\n\nHTTP:${method}[${myCallNumber}] from [${user ? user.id : ''}] to ${url}`);
        }
        if (Config.CafienneService.log.request.headers) {
            printHeaders('Request headers:', headers);
        }
        if (Config.CafienneService.log.request.body && body) {
            logger.debug(body);
        }
 
        const response = await fetch(url, { method, headers, body }).then(response => new CafienneResponse(response)).then(this.updateCaseLastModified);
        
        if (! response.ok && Config.CafienneService.log.response.error) {
            if (!Config.CafienneService.log.url) {
                logger.error(`\n\nHTTP:${method}[${myCallNumber}] from [${user ? user.id : ''}] to ${url}`);
            }
            // Print error responses in a different color
            if (Config.CafienneService.log.request.headers || (Config.CafienneService.log.request.body && body)) {
                // Add an extra newline to show the response
                logger.debug();
            }
            logger.error(`RESPONSE[${myCallNumber}]==> ${response.status} ${response.statusText}`);
            if (Config.CafienneService.log.response.headers) {
                printHeaders('Response headers:', response.headers);
            }
        } else {
            if (Config.CafienneService.log.response.status) {
                if (Config.CafienneService.log.request.headers || (Config.CafienneService.log.request.body && body)) {
                    // Add an extra newline to show the response
                    logger.debug();
                }
                logger.info(`RESPONSE[${myCallNumber}]==> ${response.status} ${response.statusText}`);
            }
            if (Config.CafienneService.log.response.headers) {
                printHeaders('Response headers:', response.headers);
            }
        }


        // Wait until full response text is arrived.
        const text = await response.text();

        // For response ok, print to debug log only; for response not-ok print info logging
        if (!response.ok && Config.CafienneService.log.response.error) {
            logger.error(text);
        } else if (Config.CafienneService.log.response.body) {
            logger.debug(text);
        }

        return response;
    }
}

export function printHeaders(msg: string, headers: Headers) {
    logger.debug(msg);
    headers.forEach((value, key) => {
        logger.debug(` ${key}\t: ${value}`)
    })
}

/**
 * Returns base headers for the user (optional)
 * along with new headers to copy "from"
 * @param user 
 * @param from 
 */
function getHeaders(user: User | undefined, from: any = {}) {
    const headers = new Headers();
    // First, copy the base headers (to include Case-Last-Modified and Tenant-Last-Modified)
    for (const headerName in BaseHeaders.values) {
        const headerValue = BaseHeaders.values[headerName];
        headers.set(headerName, headerValue);
    }

    // Now, remove and potentially renew the authorization header
    headers.delete('Authorization');
    if (user && user.token) {
        headers.set('Authorization', 'Bearer ' + user.token);
    }

    // Finally, check if there is anything additional to copy from
    for (const headerName in from) {
        const headerValue = from[headerName];
        if (headerValue && ! (headerValue instanceof Function)) {
            headers.set(headerName, headerValue);
        }
    }

    return headers;
}

let callNumber: number = 0;
