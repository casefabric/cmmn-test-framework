import TestCase from "@cafienne/typescript-client/test/testcase";
import User from "@cafienne/typescript-client/user";
import PlatformService from "@cafienne/typescript-client/service/platform/platformservice";
import TokenService, { dateAsSeconds } from "@cafienne/typescript-client/service/platform/tokenservice";
import Config from "../../../config";

const user = new User('admin')

export default class TestTokenValidation extends TestCase {
    async run() {

        await checkMissingToken();

        await checkInvalidToken();

        await checkInvalidIssuer();

        // await checkIssuedWayLater();

        await checkShouldHaveExpired();

        // await checkExpiryBeforeIssuedDate();

        // await checkExpiryEqualsIssuedDate();

        await checkEmptyClaims();

        await checkEmptySubject();

        await checkEmptyIssuer();
    }
}

function createClaims(sub?: string, iss?: string, issuedAt?: Date, expiresAt?: Date) {
    return {
        iss,
        sub,
        iat: dateAsSeconds(issuedAt),
        exp: dateAsSeconds(expiresAt)
    };
}

function getDate(days: number = 0, baseDate: Date = new Date()) {
    const newDate = new Date(baseDate);
    newDate.setDate(baseDate.getDate() + days);
    return newDate;
}

const today = getDate();
const dayAfterTomorrow = getDate(+2);
const dayBeforeYesterday = getDate(-2)
const twoDaysBeforeYesterday = getDate(-3);
const twoDaysAfterTomorrow = getDate(+3);


async function checkMissingToken() {
    user.clearToken();
    try {
        // User is not logged in, so this should give an error that the token is missing.
        await PlatformService.getUserInformation(user);
        throw new Error('Should not be able to login during checkMissingToken');
    } catch (error) {
        console.log("error: ", error)
    }
}

async function checkInvalidToken() {
    const checkToken = async (token: string) => {
        user.token = token;
        try {
            // User is not logged in, so this should give an error that the token is missing.
            await PlatformService.getUserInformation(user);
            throw new Error('Should not be able to login during checkInvalidToken');
        } catch (error) {
            console.log("error: ", error)
        }    
    }

    await checkToken('SomeInvalidTokenFormat');
    await checkToken('Token.With.Dots');
    const validFirstPart = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.';
    const validSecondPart = 'eyJpc3MiOiJDYWZpZW5uZSBUZXN0IEZyYW1ld29yayIsInN1YiI6ImFkbWluIiwiaWF0IjoxNTgxMDAxODAyLjEzNiwiZXhwIjoxNTgxMTc0NjAyLjEzN30.';
    await checkToken(validFirstPart + '.Dots');
    await checkToken(validFirstPart + validSecondPart + 'WrongThirdPart');
    // Empty second and third part
    await checkToken(validFirstPart + '...');
}

async function checkInvalidIssuer() {
    // Use a token with an invalid issuer
    const invalidIssuer = "bla-die-bla" + Config.TokenService.issuer + "xyz";
    const claims = createClaims(user.id, invalidIssuer, today, dayAfterTomorrow);
    user.token = await TokenService.fetchToken(claims);
    try {
        // Login with invalid "iss" in token.
        await PlatformService.getUserInformation(user);
        throw new Error('Should not be able to login during checkInvalidIssuer');
    } catch (error) {
        console.log("error: ", error)
    }
}

async function checkIssuedWayLater() {
    // Use a token that is issued the day after tomorrow.
    const claims = createClaims(user.id, Config.TokenService.issuer, dayAfterTomorrow, twoDaysAfterTomorrow);
    user.token = await TokenService.fetchToken(claims);
    try {
        // Login with too early issued token.
        await PlatformService.getUserInformation(user);
        throw new Error('Should not be able to login during checkIssuedWayLater');
    } catch (error) {
        console.log("error: ", error)
    }
}

async function checkShouldHaveExpired() {
    // Use a token that is issued 4 days ago and expired 2 days ago.
    const claims = createClaims(user.id, Config.TokenService.issuer, twoDaysBeforeYesterday, dayBeforeYesterday);
    user.token = await TokenService.fetchToken(claims);
    try {
        // Login with too early issued token.
        await PlatformService.getUserInformation(user);
        throw new Error('Should not be able to login during checkShouldHaveExpired');
    } catch (error) {
        console.log("error: ", error)
    }
}

async function checkExpiryBeforeIssuedDate() {
    // Use a token that was issued after it expired (expires now, issued 2 days from now).
    const claims = createClaims(user.id, Config.TokenService.issuer, dayAfterTomorrow, today);
    user.token = await TokenService.fetchToken(claims);
    try {
        // trying to login should fail
        await PlatformService.getUserInformation(user);
        throw new Error('Should not be able to login during checkExpiryBeforeIssuedDate');
    } catch (error) {
        console.log("error: ", error)
    }
}

async function checkExpiryEqualsIssuedDate() {
    // Use a token that was expired the moment it was issued.
    const claims = createClaims(user.id, Config.TokenService.issuer, today, today);
    user.token = await TokenService.fetchToken(claims);

    try {
        // trying to login should fail
        await PlatformService.getUserInformation(user);
        throw new Error('Should not be able to login during checkExpiryEqualsIssuedDate');
    } catch (error) {
        console.log("error: ", error)
    }
}

async function checkEmptyClaims() {
    const claims = createClaims();
    user.token = await TokenService.fetchToken(claims);
    try {
        // trying to login should fail
        await PlatformService.getUserInformation(user);
        throw new Error('Should not be able to login during checkEmptyClaims');
    } catch (error) {
        console.log("error: ", error)
    }
}

async function checkEmptySubject() {
    const claims = createClaims(undefined, Config.TokenService.issuer, today, dayAfterTomorrow);
    user.token = await TokenService.fetchToken(claims);
    try {
        // trying to login should fail
        await PlatformService.getUserInformation(user);
        throw new Error('Should not be able to login during checkEmptySubject');
    } catch (error) {
        console.log("error: ", error)
    }
}

async function checkEmptyIssuer() {
    const claims = createClaims(user.id, undefined, today, dayAfterTomorrow);
    user.token = await TokenService.fetchToken(claims);
    try {
        // trying to login should fail
        await PlatformService.getUserInformation(user);
        throw new Error('Should not be able to login during checkEmptyIssuer');
    } catch (error) {
        console.log("error: ", error)
    }
}