
import TestAnonymousStartCase from './api/anonymous/testanonymousstartcase';
import TestNoAnonymousStartCase from './api/anonymous/testnoanonymousstartcase';
import TestArchiveCase from './api/archiving/testarchivecase';
import TestArchiveHelloworld from './api/archiving/testarchivehelloworld';
import TestDeleteCase from './api/archiving/testdeletecase';
import TestDeleteCaseAuthorization from './api/archiving/testdeletecaseauthorization';
import TestDeleteHelloworld from './api/archiving/testdeletehelloworld';
import TestDeleteTenant from './api/archiving/testdeletetenant';
import TestDeleteTenantWithContent from './api/archiving/testdeletetenantwithcontent';
import TestFootballBusinessIdentifiers from './api/businessidentifiers/footballbusinessidentifiers/testfootballbusinessidentifiers';
import TestBusinessIdentifiers from './api/businessidentifiers/testbusinessidentifiers';
import TestHelloWorldBusinessIdentifiers from './api/businessidentifiers/testhelloworldbusinessidentifiers';
import TestCaseMigration from './api/case/migration/testcasemigration';
import TestCaseTeamMigration from './api/case/migration/testcaseteammigration';
import TestDiscretionaryMigration from './api/case/migration/testdiscretionarymigration';
import TestReactivationMigration from './api/case/migration/testreactivationmigration';
import TestRepetitionMigration from './api/case/migration/testrepetitionmigration';
import TestSubCaseMigration from './api/case/migration/testsubcasemigration';
import TestBootstrapCaseFileEvents from './api/case/testbootstrapcasefileevents';
import TestDefinitionInStartCase from './api/case/testdefinitioninstartcase';
import TestInvalidStartCase from './api/case/testinvalidstartcase';
import TestValidStartCase from './api/case/testvalidstartcase';
import TestUsersCaseAPI from './api/case/usercases';
import TestCaseFileAPI from './api/casefile/testcasefileapi';
import TestCaseFileArrayAPI from './api/casefile/testcasefilearrayapi';
import TestTaskBindingRefinement from './api/casefile/testtaskbindingrefinement';
import TestTaskCompletion from './api/casefile/testtaskcompletion';
import TestTaskOutputOperations from './api/casefile/testtaskoutputoperations';
import TestTimer from './api/caseplan/event/testtimer';
import TestEntryCriteriaOnRecovery from './api/caseplan/sentry/testentrycriteriaonrecovery';
import TestClassicFaultHandling from './api/caseplan/stage/testclassicfaulthandling';
import TestEntryCriteriaOnCaseInputParameters from './api/caseplan/stage/testentrycriteriaoncaseinputparameters';
import TestFaultBubbling from './api/caseplan/stage/testfaultbubbling';
import TestModelBasedReactivate from './api/caseplan/stage/testmodelbasedreactivate';
import TestNoFaultBubbling from './api/caseplan/stage/testnofaultbubbling';
import TestStage from './api/caseplan/stage/teststage';
import TestSubCaseFailureBubble from './api/caseplan/task/casetask/testsubcasefailurebubble';
import TestAuthenticationFlow from './api/caseplan/task/testauthenticationflow';
import TestProcessTask from './api/caseplan/task/testprocesstask';
import TestTaskWithSpaces from './api/caseplan/task/testtaskwithspaces';
import TestCasePlanAPI from './api/caseplan/testcaseplanapi';
import TestCasePlanHistoryAPI from './api/caseplan/testcaseplanhistoryapi';
import TestEventAuthorization from './api/caseplan/testeventauthorization';
import TestCaseTeam from './api/caseteam/testcaseteam';
import TestCaseTeamAPI from './api/caseteam/testcaseteamapi';
import TestCaseTeamAuthorizations from './api/caseteam/testcaseteamauthorizations';
import TestCaseTeamConsentGroupAPI from './api/caseteam/testcaseteamconsentgroupapi';
import TestCaseTeamTaskAuthorizations from './api/caseteam/testcaseteamtaskauthorizations';
import TestCaseTeamTaskAuthorizationsForGroups from './api/caseteam/testcaseteamtaskauthorizationsforgroups';
import TestCaseTeamTenantRoleMembers from './api/caseteam/testcaseteamtenantrolemembers';
import TestStartCaseEmptyRole from './api/caseteam/teststartcaseemptyrole';
import TestTenantGroupMembership from './api/caseteam/testtenantgroupmembership';
import TestConsentGroupAPI from './api/consentgroup/testconsentgroupapi';
import TestDebugMode from './api/debug/testdebugmode';
import TestDiscretionaryItems from './api/discretionary/testdiscretionaryitems';
import TestDocumentationAPI from './api/documentation/testdocumentationapi';
import PingTestEnvironment, { PingTokenService } from './api/environment/ping';
import TestRecovery from './api/environment/testrecovery';
import TestResponseType from './api/environment/testresponsetype';
import TestSwagger from './api/environment/testswagger';
import TestTokenValidation from './api/environment/tokentest';
import TestCaseFileExpressions from './api/expression/testcasefileexpressions';
import TestRepeatWithMapping from './api/expression/testrepeatwithmapping';
import TestStageTaskExpressions from './api/expression/teststagetaskexpressions';
import TestTaskExpressions from './api/expression/testtaskexpressions';
import TestRecursiveDefinitions from './api/repository/testrecursivedefinitions';
import TestRepositoryAPI from './api/repository/testrepositoryapi';
import TestRepeatStage from './api/stage/testrepeatstage';
import TestArraySubCase from './api/task/case/testarraysubcase';
import TestSubCase from './api/task/case/testsubcase';
import TestDynamicForm from './api/task/humantask/testdynamicform';
import TestFourEyes from './api/task/humantask/testfoureyes';
import TestTaskAPI from './api/task/humantask/testtaskapi';
import TestTaskCountAPI from './api/task/humantask/testtaskcountapi';
import TestTaskFilterAPI from './api/task/humantask/testtaskfilterapi';
import TestTaskFilterAPI2 from './api/task/humantask/testtaskfilterapi2';
import TestTaskValidationAPI from './api/task/humantask/testtaskvalidationapi';
import TestGetListGetDetails from './api/task/process/http/getlistgetdetails';
import TestDashedParameters from './api/task/process/http/testdashedparameters';
import TestInputMappingFailure from './api/task/process/http/testinputmappingfailure';
import TestSMTP from './api/task/process/mail/testsmtp';
import TestProcessTaskMigration from './api/task/process/migration/testprocesstaskmigration';
import TestCalculation from './api/task/process/testcalculation';
import TestTenantRegistration from './api/tenant/testtenantregistration';
import TestVersion from './api/version/testversion';
import TestCompatibility from './compatibility/testcompatibility';
import TestHelloworld from './helloworld/testhelloworld';
import TestIncidentManagement from './incidentmanagement/incidentmanagement';
import TestTravelRequest from './travelrequest/testtravelrequest';
import TestRunner from '../src/infra/testrunner';

export default class TestClasses {
    static getTestClass(name: string): Function {
        const t = AllTests.find(t => (t.name.toLowerCase() === name.toLowerCase() || t.name.toLowerCase() === `test${name}`.toLowerCase()));
        if (!t) {
            throw new Error(`Cannot find a test '${name}'`);
        }
        return t;
    }

    /**
     * Map the list of string to a series of constructors of corresponding test classes.
     * Note that '*' gives a collection of all test classes and 'storage' gives the archival & deletion testcases (they are not default).
     * This enables to run both storage and other classes in one 
     */
    static createTestRunners(list: Array<string>): Array<TestRunner> {
        const runners: Array<TestRunner> = [];
        const addRunner = (test: Function, needsRunning: boolean) => runners.push(new TestRunner(test, needsRunning));
        const addExplicitRunner = (test: Function) => addRunner(test, true);
        const addDefaultRunner = (test: Function) => addRunner(test, false);

        const from = (list.length === 2 && list[0] === 'from' && Number(list[1]) > 0) ? Number(list[1]) : -1;

        if (!list.length || from > 0) {
            AllTests.forEach(addDefaultRunner);
        } else {
            list.forEach(name => {
                if (name === '*') {
                    AllTests.forEach(addDefaultRunner);
                } else if (name === 'storage') {
                    StorageTests.forEach(addExplicitRunner);
                } else if (name === 'migration') {
                    MigrationTests.forEach(addExplicitRunner);
                } else {
                    addExplicitRunner(this.getTestClass(name));
                }
            });
        }
        // Filter out the tests that do not to be ran.
        const foundRunners = runners.filter(run => run.needsRunning())
        const actualRunners = from > 0 ? foundRunners.splice(from - 1) : foundRunners;
        // Give each runner the right test number, starting from 1 as that is more "human-intuitive"
        actualRunners.forEach((run, index) => run.testNumber = index + 1);
        return actualRunners;
    }
}

const StorageTests: Array<Function> = [
    TestArchiveHelloworld,
    TestArchiveCase,
    TestDeleteCase,
    TestDeleteHelloworld,
    TestDeleteTenant,
    TestDeleteTenantWithContent,
    TestDeleteCaseAuthorization
];

const MigrationTests: Array<Function> = [
    TestProcessTaskMigration
    , TestProcessTaskMigration
    , TestCaseMigration
    , TestSubCaseMigration
    , TestCaseTeamMigration
    , TestReactivationMigration
    , TestRepetitionMigration
    , TestDiscretionaryMigration
];

const AllTests: Array<Function> = [
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
    , TestSubCaseFailureBubble
    , TestTimer
    , TestUsersCaseAPI
    , TestDiscretionaryItems
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
    , TestCaseTeamTaskAuthorizationsForGroups
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
    , TestTenantGroupMembership
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
    , ...StorageTests
    , ...MigrationTests
    , TestRecovery
    , TestCompatibility
];
