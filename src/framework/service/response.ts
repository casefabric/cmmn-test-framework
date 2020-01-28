import { Response } from 'node-fetch';

/**
 * Validates the HTTP Response object.
 * If it succeeded, but failures where expected, it will throw an error with the given error message.
 * If it fails, but it was expected to succeed, an error with the response text will be thrown.
 * In all other cases the response itself will be returned.
 * 
 * @param response 
 * @param errorMsg 
 * @param expectNoFailures 
 */
export async function checkResponse(response: Response, errorMsg: string, expectNoFailures: boolean): Promise<any> {
    if (response.ok) {
        if (!expectNoFailures) throw new Error(errorMsg);
    } else {
        if (expectNoFailures) {
            const responseText = await response.text();
            const errorMsg = response.status + ' ' + response.statusText + ': ' + responseText;
            // console.log(response.status + ' ' + response.statusText + ': ' + responseText);
            throw new Error(errorMsg);
        }
    }
    return response;
}

/**
 * Validates the response for failure by invoking checkResponse function internally.
 * If that validation succeeds, the json of the response is returned.
 * @param response 
 * @param errorMsg 
 * @param expectNoFailures 
 */
export async function checkJSONResponse(response: Response, errorMsg: string = '', expectNoFailures: boolean = true): Promise<any> {
    await checkResponse(response, errorMsg, expectNoFailures);
    if (response.ok) {
        return response.json();
    } else {
        return response;
    }
}

