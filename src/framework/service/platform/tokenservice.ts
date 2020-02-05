import fetch from 'node-fetch';
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
    async getToken(user: User, issuedAt: Date = new Date(), expiresAt?: Date): Promise<string> {
        const iss = Config.TokenService.issuer;
        const sub = user.id;
        const iat = Number(issuedAt);
        const exp = Number(expiresAt ? expiresAt : new Date().setDate(new Date().getDate() + 2));

        const claims = { iss, sub, iat, exp };
        const object = {
            method: 'POST',
            body: JSON.stringify(claims)
        }
        const response = await fetch(Config.TokenService.url, object);
        const token = await response.text();
        if (!response.ok) {
            throw new Error('Failure in fetching token: ' + response.status + ' ' + response.statusText + '\n' + token);
        }
        return token;
    }
}
