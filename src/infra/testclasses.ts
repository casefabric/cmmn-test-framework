
import TestAnonymousStartCase from '../tests/api/anonymous/testanonymousstartcase';
import TestNoAnonymousStartCase from '../tests/api/anonymous/testnoanonymousstartcase';
import TestArchiveCase from '../tests/api/archiving/testarchivecase';
import TestArchiveHelloworld from '../tests/api/archiving/testarchivehelloworld';
import TestDeleteCase from '../tests/api/archiving/testdeletecase';
import TestDeleteCaseAuthorization from '../tests/api/archiving/testdeletecaseauthorization';
import TestDeleteHelloworld from '../tests/api/archiving/testdeletehelloworld';
import TestDeleteTenant from '../tests/api/archiving/testdeletetenant';
import TestDeleteTenantWithContent from '../tests/api/archiving/testdeletetenantwithcontent';
import TestFootballBusinessIdentifiers from '../tests/api/businessidentifiers/footballbusinessidentifiers/testfootballbusinessidentifiers';
import TestBusinessIdentifiers from '../tests/api/businessidentifiers/testbusinessidentifiers';
import TestHelloWorldBusinessIdentifiers from '../tests/api/businessidentifiers/testhelloworldbusinessidentifiers';
import TestCaseMigration from '../tests/api/case/migration/testcasemigration';
import TestCaseTeamMigration from '../tests/api/case/migration/testcaseteammigration';
import TestReactivationMigration from '../tests/api/case/migration/testreactivationmigration';
import TestRepetitionMigration from '../tests/api/case/migration/testrepetitionmigration';
import TestSubCaseMigration from '../tests/api/case/migration/testsubcasemigration';
import TestBootstrapCaseFileEvents from '../tests/api/case/testbootstrapcasefileevents';
import TestDefinitionInStartCase from '../tests/api/case/testdefinitioninstartcase';
import TestInvalidStartCase from '../tests/api/case/testinvalidstartcase';
import TestStatsAPI from '../tests/api/case/teststatsapi';
import TestValidStartCase from '../tests/api/case/testvalidstartcase';
import TestUsersCaseAPI from '../tests/api/case/usercases';
import TestCaseFileAPI from '../tests/api/casefile/testcasefileapi';
import TestCaseFileArrayAPI from '../tests/api/casefile/testcasefilearrayapi';
import TestTaskBindingRefinement from '../tests/api/casefile/testtaskbindingrefinement';
import TestTaskCompletion from '../tests/api/casefile/testtaskcompletion';
import TestTaskOutputOperations from '../tests/api/casefile/testtaskoutputoperations';
import TestTimer from '../tests/api/caseplan/event/testtimer';
import TestEntryCriteriaOnRecovery from '../tests/api/caseplan/sentry/testentrycriteriaonrecovery';
import TestClassicFaultHandling from '../tests/api/caseplan/stage/testclassicfaulthandling';
import TestEntryCriteriaOnCaseInputParameters from '../tests/api/caseplan/stage/testentrycriteriaoncaseinputparameters';
import TestFaultBubbling from '../tests/api/caseplan/stage/testfaultbubbling';
import TestModelBasedReactivate from '../tests/api/caseplan/stage/testmodelbasedreactivate';
import TestNoFaultBubbling from '../tests/api/caseplan/stage/testnofaultbubbling';
import TestStage from '../tests/api/caseplan/stage/teststage';
import TestAuthenticationFlow from '../tests/api/caseplan/task/testauthenticationflow';
import TestProcessTask from '../tests/api/caseplan/task/testprocesstask';
import TestTaskWithSpaces from '../tests/api/caseplan/task/testtaskwithspaces';
import TestCasePlanAPI from '../tests/api/caseplan/testcaseplanapi';
import TestCasePlanHistoryAPI from '../tests/api/caseplan/testcaseplanhistoryapi';
import TestEventAuthorization from '../tests/api/caseplan/testeventauthorization';
import TestCaseTeam from '../tests/api/caseteam/testcaseteam';
import TestCaseTeamAPI from '../tests/api/caseteam/testcaseteamapi';
import TestCaseTeamAuthorizations from '../tests/api/caseteam/testcaseteamauthorizations';
import TestCaseTeamConsentGroupAPI from '../tests/api/caseteam/testcaseteamconsentgroupapi';
import TestCaseTeamTaskAuthorizations from '../tests/api/caseteam/testcaseteamtaskauthorizations';
import TestCaseTeamTenantRoleMembers from '../tests/api/caseteam/testcaseteamtenantrolemembers';
import TestStartCaseEmptyRole from '../tests/api/caseteam/teststartcaseemptyrole';
import TestConsentGroupAPI from '../tests/api/consentgroup/testconsentgroupapi';
import TestDebugMode from '../tests/api/debug/testdebugmode';
import TestDiscretionaryItems from '../tests/api/discretionary/testdiscretionaryitems';
import TestDocumentationAPI from '../tests/api/documentation/testdocumentationapi';
import PingTestEnvironment, { PingTokenService } from '../tests/api/environment/ping';
import TestRecovery from '../tests/api/environment/testrecovery';
import TestResponseType from '../tests/api/environment/testresponsetype';
import TestSwagger from '../tests/api/environment/testswagger';
import TestTokenValidation from '../tests/api/environment/tokentest';
import TestCaseFileExpressions from '../tests/api/expression/testcasefileexpressions';
import TestRepeatWithMapping from '../tests/api/expression/testrepeatwithmapping';
import TestStageTaskExpressions from '../tests/api/expression/teststagetaskexpressions';
import TestTaskExpressions from '../tests/api/expression/testtaskexpressions';
import TestRecursiveDefinitions from '../tests/api/repository/testrecursivedefinitions';
import TestRepositoryAPI from '../tests/api/repository/testrepositoryapi';
import TestRepeatStage from '../tests/api/stage/testrepeatstage';
import TestArraySubCase from '../tests/api/task/case/testarraysubcase';
import TestSubCase from '../tests/api/task/case/testsubcase';
import TestDynamicForm from '../tests/api/task/humantask/testdynamicform';
import TestFourEyes from '../tests/api/task/humantask/testfoureyes';
import TestTaskAPI from '../tests/api/task/humantask/testtaskapi';
import TestTaskCountAPI from '../tests/api/task/humantask/testtaskcountapi';
import TestTaskFilterAPI from '../tests/api/task/humantask/testtaskfilterapi';
import TestTaskFilterAPI2 from '../tests/api/task/humantask/testtaskfilterapi2';
import TestTaskValidationAPI from '../tests/api/task/humantask/testtaskvalidationapi';
import TestGetListGetDetails from '../tests/api/task/process/http/getlistgetdetails';
import TestDashedParameters from '../tests/api/task/process/http/testdashedparameters';
import TestInputMappingFailure from '../tests/api/task/process/http/testinputmappingfailure';
import TestSMTP from '../tests/api/task/process/mail/testsmtp';
import TestProcessTaskMigration from '../tests/api/task/process/migration/testprocesstaskmigration';
import TestCalculation from '../tests/api/task/process/testcalculation';
import TestTenantRegistration from '../tests/api/tenant/testtenantregistration';
import TestVersion from '../tests/api/version/testversion';
import TestCompatibility from '../tests/compatibility/testcompatibility';
import TestHelloworld from '../tests/helloworld/testhelloworld';
import TestIncidentManagement from '../tests/incidentmanagement/incidentmanagement';
import TestTravelRequest from '../tests/travelrequest/testtravelrequest';
import TestRunner from './testrunner';

export default class TestClasses {
    private testsByName: any = new Object();
    private static testList: Array<any> = [];

    constructor(public list: Array<Function>) {
        list.forEach(f => {
            this.testsByName[f.name] = f;
            TestClasses.testList.push({ name: f.name.toLowerCase(), test: f });
        });
    }

    static getTestClass(name: string): Function {
        const t = TestClasses.testList.find(t => (t.name === name.toLowerCase() || t.name === `test${name}`.toLowerCase()));
        if (!t) {
            throw new Error(`Cannot find a test '${name}'`);
        }
        return t.test;
    }

    /**
     * Map the list of string to a series of constructors of corresponding test classes.
     * Note that '*' gives a collection of all test classes and 'storage' gives the archival & deletion testcases (they are not default).
     * This enables to run both storage and other classes in one 
     */
    static map(list: Array<string>): Array<Function> {
        if (! list.length) {
            return this.all;
        } else {
            const result: Array<Function> = [];
            list.forEach(name => {
                if (name === '*') {
                    result.push(...this.all);
                } else if (name === 'storage') {
                    result.push(...this.storageTests);
                } else {
                    result.push(this.getTestClass(name));
                }
            });
            return result;    
        }
    }

    /**
     * Map the list of string to a series of constructors of corresponding test classes.
     * Note that '*' gives a collection of all test classes and 'storage' gives the archival & deletion testcases (they are not default).
     * This enables to run both storage and other classes in one 
     */
    static createTestRunners(list: Array<string>): Array<TestRunner> {
        const runners: Array<TestRunner> = [];
        if (! list.length) {
            runners.push(...this.all.map(c => new TestRunner(c, false)).filter(runner => runner.needsRunning()));
        } else {
            list.forEach(name => {
                if (name === '*') {
                    // TestRunners should only do the default ones, not the isDefaultTest = false
                    runners.push(...this.all.map(c => new TestRunner(c, false)).filter(runner => runner.needsRunning()));
                } else if (name === 'storage') {
                    // This is a named test, but the TestRunners are not default test. So override checking the isDefaultTest option.
                    runners.push(...this.storageTests.map(c => new TestRunner(c, true)));
                } else {
                    // This is a named test, but the TestRunners are not default test. So override checking the isDefaultTest option.
                    runners.push(new TestRunner(this.getTestClass(name), true));
                }
            });
        }
        // Give each runner the right test number, starting from 1 as that is more "human-intuitive"
        runners.forEach((run, index) => run.testNumber = index + 1);
        return runners;
    }

    static get all() {
        return AllTestCases.list;
    }

    static get storageTests() {
        return [TestArchiveHelloworld, TestArchiveCase, TestDeleteCase, TestDeleteHelloworld, TestDeleteTenant, TestDeleteTenantWithContent, TestDeleteCaseAuthorization];
    }
}

const AllTestCases = new TestClasses([
    PingTokenService
    , PingTestEnvironment
    , TestResponseType
    , TestSwagger
    , TestHelloworld
    , TestVersion
    , TestTenantRegistration
    , TestConsentGroupAPI
    , TestTaskCompletion
    , TestTaskOutputOperations
    , TestTaskBindingRefinement
    , TestEntryCriteriaOnCaseInputParameters
    , TestEntryCriteriaOnRecovery
    , TestStage
    , TestFaultBubbling
    , TestClassicFaultHandling
    , TestModelBasedReactivate
    , TestNoFaultBubbling
    , TestTimer
    , TestUsersCaseAPI
    , TestDiscretionaryItems
    , TestStatsAPI
    , TestTaskValidationAPI
    , TestTaskAPI
    , TestTaskFilterAPI
    , TestTaskFilterAPI2
    , TestTaskCountAPI
    , TestTaskWithSpaces
    , TestDynamicForm
    , TestFourEyes
    , TestDebugMode
    , TestDocumentationAPI
    , TestRepositoryAPI
    , TestRecursiveDefinitions
    , TestTokenValidation
    , TestCaseFileAPI
    , TestCaseFileArrayAPI
    , TestCaseFileExpressions
    , TestBootstrapCaseFileEvents
    , TestCasePlanAPI
    , TestCasePlanHistoryAPI
    , TestBusinessIdentifiers
    , TestFootballBusinessIdentifiers
    , TestHelloWorldBusinessIdentifiers
    , TestRepeatWithMapping
    , TestTaskExpressions
    , TestStageTaskExpressions
    , TestProcessTask
    , TestAuthenticationFlow
    , TestCaseTeamAPI
    , TestCaseTeam
    , TestCaseTeamTenantRoleMembers
    , TestCaseTeamConsentGroupAPI
    , TestCaseTeamTaskAuthorizations
    , TestCaseTeamAuthorizations
    , TestEventAuthorization
    , TestArchiveHelloworld
    , TestArchiveCase
    , TestDeleteCase
    , TestDeleteCaseAuthorization
    , TestDeleteHelloworld
    , TestDeleteTenant
    , TestDeleteTenantWithContent
    , TestIncidentManagement
    , TestTravelRequest
    , TestInvalidStartCase
    , TestValidStartCase
    , TestStartCaseEmptyRole
    , TestSubCase
    , TestArraySubCase
    , TestRepeatStage
    , TestSMTP
    , TestNoAnonymousStartCase
    , TestAnonymousStartCase
    , TestDefinitionInStartCase
    , TestCalculation
    , TestGetListGetDetails
    , TestDashedParameters
    , TestInputMappingFailure
    , TestProcessTaskMigration
    , TestCaseMigration
    , TestSubCaseMigration
    , TestCaseTeamMigration
    , TestReactivationMigration
    , TestRepetitionMigration
    , TestRecovery
    , TestCompatibility
]);
