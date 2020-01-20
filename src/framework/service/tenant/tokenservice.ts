import fetch from 'node-fetch';
import Config from '../../../config';
import User from '../../user';

export default class TokenService {
    /**
     * Fetches a token for the user that is valid for 2 days.
     * @param user 
     */
    async getToken(user: User): Promise<string> {
        // console.log("Fetching token for user " + user.id);
        const now = new Date();
        const in2Days = new Date().setDate(now.getDate() + 2);

        // console.log("Now: "+Number(now))
        // console.log("In 2 days: "+Number(in2Days))

        const claims = {
            "iss": Config.TokenService.issuer,
            "sub": user.id,
            "exp": Number(in2Days),
            "iat": Number(now)
        };
        const object = {
            method: 'POST',
            body: JSON.stringify(claims)
        }
        const response = await fetch(Config.TokenService.url, object);
        const token = await response.text();
        return token;
    }
}
