'use strict';

import CaseService from '../../../framework/service/case/caseservice';
import TestCase from '../../../framework/test/testcase';

import WorldWideTestTenant from '../../worldwidetesttenant';
import RepositoryService from '../../../framework/service/case/repositoryservice';
import CaseFileService from '../../../framework/service/case/casefileservice';
import { assertCaseFileContent } from '../../../framework/test/assertions';
import Case from '../../../framework/cmmn/case';
import Util from '../../../framework/test/util';
import CaseTeam from '../../../framework/cmmn/caseteam';
import CaseTeamMember, { CaseOwner } from '../../../framework/cmmn/caseteammember';

const repositoryService = new RepositoryService();
const definition = 'casefiledocument.xml';

const caseService = new CaseService();
const worldwideTenant = new WorldWideTestTenant();
const sender = worldwideTenant.sender;
const receiver = worldwideTenant.receiver;
const employee = worldwideTenant.employee;
const tenant = worldwideTenant.name;

const caseFileService = new CaseFileService();

export default class TestCaseFileDocumentAPI extends TestCase {
    async onPrepareTest() {
        await worldwideTenant.create();
        await repositoryService.validateAndDeploy(sender, definition, tenant);
    }

    async run() {
        const caseTeam = new CaseTeam([new CaseOwner(sender), new CaseTeamMember(receiver)]);        
        const startCase = { tenant, definition, inputs : {}, caseTeam, debug: true };

        let caseInstance = await caseService.startCase(sender, startCase) as Case;

        await caseFileService.getUploadInformation(sender, caseInstance).then(info => console.log("INFO: " + JSON.stringify(info, undefined, 2)));
        // return

        const gitIgnoreFile = '../../.gitignore';
        const configTSFile = '../../src/config.ts';

        const metadata = {
            Name: 'My First Picture',
            Description: 'Really!',
            Extension: 'png',
            URL: 'Should this be overwritten by the engine? Or is it just a plain property????'
        }
        const documents = [definition, gitIgnoreFile];
        await caseFileService.uploadCaseFileDocument(sender, caseInstance, 'Pictures', metadata, documents);

        // Changing metadata should also result in a CaseFileItemUpdated event
        metadata.Name = 'Here comes config.ts';
        await caseFileService.uploadCaseFileDocument(sender, caseInstance, 'Pictures', metadata, [configTSFile]);

        await caseFileService.getDownloadInformation(sender, caseInstance).then(info => console.log(`Download info: ${JSON.stringify(info, undefined, 2)}`));

        // Uploading documents should fail for employee, as the employee is not part of the case team
        await caseFileService.uploadCaseFileDocument(employee, caseInstance, 'Greeting/Pictures', metadata, documents, 404);

        // But it should work for the receiver
        await caseFileService.uploadCaseFileDocument(receiver, caseInstance, 'Greeting/Pictures', metadata, documents);

        const downloadInfo = await caseFileService.getDownloadInformation(sender, caseInstance);
        console.log('Download info:' + JSON.stringify(downloadInfo, undefined, 2));
        if (downloadInfo.length !== 5) {
            throw new Error('Expecting 5 downloadable documents');
        }

        const configTSDownloadResult = await caseFileService.downloadURL(sender, downloadInfo[4].url);
        await (configTSDownloadResult.text().then(txt => console.log(`Content of config.ts:\n\n${txt.substring(0, 100)} ...`) ));

        // Download should fail for employee, as the employee is not part of the case team
        await caseFileService.downloadURL(employee, downloadInfo[4].url, 404);

        const response = await caseFileService.downloadCaseFileDocument(sender, caseInstance, 'Pictures/.gitignore');
        const responseText = await response.text();
        console.log('Content of .gitignore:\n\n' + responseText);

        console.log(`\n\nThank you for running case ${caseInstance.id}`);

    }
}
