import User from '../../user';
import Comparison from '../comparison';
import Case from '../../cmmn/case';
import CaseFileService from '../../service/case/casefileservice';
import { pathReader } from '../../cmmn/casefile';
import Config from '../../../config';
import logger from '../../logger';

/**
 * Read the case instance's case file on behalf of the user and verify that the element at the end of the path matches the expectedContent.
 * Path can be something like /Greeting/
 * 
 * @param caseId 
 * @param user 
 * @param path 
 * @param expectedContent 
 */
export default async function assertCaseFileContent(user: User, caseId: Case | string, path: string, expectedContent: any, log: boolean = false) {
    await CaseFileService.getCaseFile(user, caseId).then(casefile => {
        if (Config.TestCase.log) {
            logger.debug(`Case File for reading path ${path}:${JSON.stringify(casefile, undefined, 2)}`);
        }
        const readCaseFileItem = (caseFile: any) => {
            const item = pathReader(caseFile, path);
            if (!item && caseFile.file) { // Temporary backwards compatibility; casefile.file will be dropped in 1.1.5
                return pathReader(caseFile.file, path)
            }
            return item;
        }

        const actualCaseFileItem = readCaseFileItem(casefile);
        if (!Comparison.sameJSON(actualCaseFileItem, expectedContent, log)) {
            throw new Error(`Case File [${path}] is expected to match: ${JSON.stringify(expectedContent, undefined, 2)}\nActual: ${JSON.stringify(actualCaseFileItem, undefined, 2)}`);
        }
        return actualCaseFileItem;
    });
}
