import fetch from 'isomorphic-fetch';
import Config from '../../../config';
import User from '../../user';

export default class TokenService {
    /**
     * Fetches a token for the user that has the given validity period (defaults to 2 days from now).
     * 
     * @param user 
     * @param issuedAt
     * @param expiresAt 
     */
    async getToken(user: User, issuer:string = Config.TokenService.issuer, issuedAt: Date = new Date(), expiresAt?: Date): Promise<string> {
        if (! expiresAt) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 2);
        }
        const iss = issuer;
        const sub = user.id;
        const iat = dateAsSeconds(issuedAt);
        const exp = dateAsSeconds(expiresAt);

        const claims = { iss, sub, iat, exp };

        return this.fetchToken(claims);
    }

    async fetchToken(claims: object) {
        const object = {
            method: 'POST',
            body: JSON.stringify(claims)
        }

        if (Config.TokenService.log) {
            console.log("Getting token " + JSON.stringify(claims, undefined, 2));
        }
        const response = await fetch(Config.TokenService.url, object);
        const token = await response.text();
        if (!response.ok) {
            throw new Error('Failure in fetching token: ' + response.status + ' ' + response.statusText + '\n' + token);
        }
        return token;
    }
}

/**
 * Converts a date to seconds (instead of milliseconds).
 * Is needed for JWT tokens.
 * @param date 
 */
export function dateAsSeconds(date?: Date) {
    if (! date) return;
    return Math.floor(Number(date)/1000);
}