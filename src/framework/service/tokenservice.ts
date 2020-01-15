import { Response, Headers } from 'node-fetch';
import fetch from 'node-fetch';
import Config from '../../config';
import User from '../user';

export default class TokenService {
    baseURL: string;
    headers = new Headers({
        'Content-Type': 'application/json'
    });;

    constructor(baseURL: string = Config.TokenService.url) {
        this.baseURL = baseURL;
    }

    async getToken(user: User): Promise<User> {
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
        const response = await fetch(this.baseURL, object);
        const token = await response.text();
        return user.setToken('Bearer ' + token);
    }
}
