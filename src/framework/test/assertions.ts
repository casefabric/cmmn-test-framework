import User from '../user';
import Task from '../cmmn/task';
import Comparison from './comparison';
import TaskService from '../service/task/taskservice';
import CaseService, {checkCaseID} from '../service/case/caseservice';
import Case from '../../framework/cmmn/case';
import CaseFileService from '../service/case/casefileservice';
import { pathReader } from '../cmmn/casefile';
import CaseTeam from '../cmmn/caseteam';
import CaseTeamService from '../service/case/caseteamservice';
import CaseTeamMember from '../cmmn/caseteammember';
import { SomeTime } from './time';
import PlanItem from '../cmmn/planitem';

const caseService = new CaseService();
const taskService = new TaskService();
const caseFileService = new CaseFileService();
const caseTeamService = new CaseTeamService();


/**
 * Asserts that the task has expected state, assignee, and owner
 * @param task 
 * @param user 
 * @param action 
 * @param expectedState 
 * @param expectedAssignee 
 * @param expectedOwner 
 */
export async function assertTask(user: User, task: Task, action: string, expectedState: string = '', expectedAssignee?: User, expectedOwner?: User, expectedLastModifiedBy?: User) {
    await taskService.getTask(user, task).then(task => {
        console.log(`Task after ${action}: state=${task.taskState}, assignee='${task.assignee}', owner='${task.owner}', modifiedBy='${task.modifiedBy}' `);
        if (task.taskState !== expectedState) {
            throw new Error(`Task ${task.taskName} is not in state '${expectedState}' but in state '${task.taskState}'`);
        }
        if (expectedAssignee && task.assignee !== expectedAssignee.id) {
            throw new Error(`Task ${task.taskName} is not assigned to '${expectedAssignee}' but to user '${task.assignee}'`);
        }
        if (expectedOwner && task.owner !== expectedOwner.id) {
            throw new Error(`Task ${task.taskName} is not owned by '${expectedOwner}' but by '${task.owner}'`);
        }
        if (expectedLastModifiedBy && task.modifiedBy !== expectedLastModifiedBy.id) {
            throw new Error(`Task ${task.taskName} is not last modified by '${expectedLastModifiedBy}' but by '${task.modifiedBy}'`);
        }
    });
}

/**
 * Retrieves the plan items of the case and asserts that the plan item has the expected state.
 * Optionally runs repeated loops to await the plan item to reach the expected state.
 * Handy to use for ProcessTask and CaseTasks and their potential follow-ups, as these tasks run asynchronously in the backend.
 * @param caseInstance 
 * @param user 
 * @param planItemName 
 * @param planItemIndex 
 * @param expectedState 
 * @param maxAttempts 
 * @param waitTimeBetweenAttempts 
 * @returns {Promise<PlanItem>} the plan item if it is found
 * @throws {Error} if the plan item is not found after so many attempts
 */
export async function assertPlanItemState(user: User, caseInstance: Case, planItemName: string, planItemIndex: number, expectedState: string, maxAttempts: number = 10, waitTimeBetweenAttempts = 1000): Promise<PlanItem> {
    let currentAttempt = 1;
    while (true) {
        console.log(`Running attempt ${currentAttempt} of ${maxAttempts} to find '${planItemName}.${planItemIndex}' in state ${expectedState}`);
        const freshCase = await caseService.getCase(user, caseInstance);
        // console.log("Current Plan Items\n" + (freshCase.planitems.map(item => "- '" + item.name + "." + item.index + "' ==> '" + item.currentState + "'")).join('\n'));
        const planItem = freshCase.planitems.find(p => p.name === planItemName && p.index === planItemIndex);
        if (planItem?.currentState === expectedState) {
            return planItem;
        }
        if (currentAttempt >= maxAttempts) {
            break;
        }
        const currentMsg = !planItem ? 'not (yet) found in the case plan' : `in state ${planItem.currentState}`;
        await SomeTime(waitTimeBetweenAttempts, `Waiting ${waitTimeBetweenAttempts} millis before refreshing info on '${planItemName}.${planItemIndex}' to be in state ${expectedState}. The item is currently ${currentMsg}`);
        currentAttempt++;
    }
    throw new Error(`Did not find the plan item '${planItemName}.${planItemIndex}' in state ${expectedState} after ${maxAttempts} attempts`);
}

/**
 * Asserts the state of the case plan
 * @param caseInstance 
 * @param user 
 * @param expectedState 
 */
export async function assertCasePlanState(user: User, caseInstance: Case|string, expectedState: string, maxAttempts: number = 10, waitTimeBetweenAttempts = 1000) {
    const caseId = checkCaseID(caseInstance);
    const tryGetCase = async () => {
        try {
            // Get case details
            return await caseService.getCase(user, caseId);
        } catch (error) {
            // ignore the error
        }
    }
    let currentAttempt = 1;
    while (true) {
        console.log(`Running attempt ${currentAttempt} of ${maxAttempts} to find case ${caseId} in state ${expectedState}`);
        // Get case details
        const freshCase = await tryGetCase();
        if (freshCase?.state === expectedState) {
            return freshCase;
        }
        if (currentAttempt >= maxAttempts) {
            break;
        }
        const currentMsg = !freshCase ? 'not (yet) found' : `in state ${freshCase.state}`;
        await SomeTime(waitTimeBetweenAttempts, `Waiting ${waitTimeBetweenAttempts} millis before refreshing info on case ${caseId} to be in state ${expectedState}. The item is currently ${currentMsg}`);
        currentAttempt++;
    }
    throw new Error(`Did not find the case ${caseId} in state ${expectedState} after ${maxAttempts} attempts`);
}

/**
 * Verifies whether task's input is same as that of expected input
 * @param task 
 * @param taskInput expected input
 */
export function verifyTaskInput(task: Task, taskInput: any) {
    if (!Comparison.sameJSON(task.input, taskInput)) {
        throw new Error(`Input for task ${task.taskName} is not expected;\nFound:    ${JSON.stringify(task.input)}\nExpected: ${JSON.stringify(taskInput)}`);
    }
}

/**
 * Finds and returns a particular task with in list of tasks
 * and throws an error if it does not exist
 * @param tasks 
 * @param taskName 
 */
export function findTask(tasks: Task[], taskName: string): Task {
    const task = tasks.find(task => task.taskName === taskName);
    if (!task) {
        throw new Error(`Cannot find task ${taskName}`);
    }
    return task;
}

/**
 * Asserts the number of tasks that have specified state with expected count
 * @param tasks 
 * @param state 
 * @param expectedCount 
 */
export function assertTaskCount(tasks: Task[], state: string, expectedCount: Number) {
    const actualCount = tasks.filter(t => t.taskState === state).length
    if (actualCount != expectedCount) {
        throw new Error('Number of ' + state + ' tasks expected to be ' + expectedCount + '; but found ' + actualCount)
    }
}

/**
 * Read the case instance's case file on behalf of the user and verify that the element at the end of the path matches the expectedContent.
 * Path can be something like /Greeting/
 * 
 * @param caseInstance 
 * @param user 
 * @param path 
 * @param expectedContent 
 */
export async function assertCaseFileContent(user: User, caseInstance: Case, path: string, expectedContent: any, log: boolean = false) {
    await caseFileService.getCaseFile(user, caseInstance).then(casefile => {
        // console.log("Case File for reading path " + path, casefile);
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

/**
 * A simple converter method which converts JSON caseTeam to object
 * @param team 
 */
async function convertToCaseTeam(team: CaseTeam | Array<CaseTeamMember>) {
    let actualCaseTeamArray: Array<CaseTeamMember> = []
    const rawMembers = team instanceof CaseTeam ? team.members : team;
    rawMembers.forEach(member => {
        // console.log("Converting member " + JSON.stringify(member, undefined, 2))
        const newMember = new CaseTeamMember(member.memberId, member.caseRoles, member.memberType, member.isOwner)
        // console.log("Converted member " + JSON.stringify(newMember, undefined, 2))
        actualCaseTeamArray.push(newMember);
    });
    return new CaseTeam(actualCaseTeamArray)
}

const hasMember = (team: CaseTeam, expectedMember: CaseTeamMember): [boolean, string] => {
    let msg = '';
    const compareMember = (member1: CaseTeamMember, member2: CaseTeamMember) => {
        if (member1.memberId !== member2.memberId) {
            msg = `ID of the ${member2.memberId} doesn't match`;
            return false;
        }
        if (member1.memberType !== member2.memberType) {
            msg = `Type of the ${member2.memberId} doesn\'t match`;
            return false;
        }
        if (member1.isOwner !== member2.isOwner) {
            if (member1.isOwner == undefined || member2.isOwner == undefined) {
                return true;
            }
            msg = `Ownership of the ${member2.memberId} doesn\'t match`;
            return false;
        }
        if (!sameRoles(member1.caseRoles, member2.caseRoles)) {
            msg = `Roles of the ${member2.memberId} doesn\'t match`;
            return false;
        }
        msg = `Member ${member2.memberId} is present in the team`;
        return true;
    }

    const sameRoles = (roles1: string[], roles2: string[]) => {
        if (!roles1 && !roles2) return true;
        if (roles1 && !roles2) return false;
        if (!roles1 && roles2) return false;
        if (roles1.length !== roles2.length) {
            return false;
        }
        for (let i = 0; i < roles1.length; i++) {
            if (!roles2.find(role => role === roles1[i])) {
                return false;
            }
        }
        return true;
    }
    if (!team.members.find(member => compareMember(member, expectedMember))) {
        return [false, msg];
    }
    return [true, msg];
}

async function verifyTeam(team1: CaseTeam, team2: CaseTeam) {
    const compareTeam = (team1: CaseTeam, team2: CaseTeam) => {
        if (team1.members.length != team2.members.length) return false;
        for (let i = 0; i < team1.members.length; i++) {
            const member1 = team1.members[i];
            const [status, msg] = hasMember(team2, member1);
            if (!status) {
                // console.log("Team2 does not have member " + JSON.stringify(member1))
                return false;
            }
        }
        return true;
    }
    return compareTeam(team1, team2);
}

/**
 * Asserts the case team with the given team
 * and throws error if it doesn't match
 * @param caseInstance 
 * @param user 
 * @param expectedTeam 
 */
export async function assertCaseTeam(user: User, caseInstance: Case, expectedTeam: CaseTeam) {
    // Get case team via getCaseTeam
    const team = await caseTeamService.getCaseTeam(user, caseInstance)
    const actualCaseTeam = await convertToCaseTeam(team)

    // Get case team via getCase
    const newCase = await caseService.getCase(user, caseInstance);
    const newCaseTeam = await convertToCaseTeam(newCase.team)

    const verifyActualCaseTeam = await verifyTeam(actualCaseTeam, expectedTeam)
    const verifyNewCaseTeam = await verifyTeam(newCaseTeam, expectedTeam)

    if (!verifyActualCaseTeam || !verifyNewCaseTeam) {
        throw new Error('Case team is not the same as given to the case');
    }
    // if(!Comparison.sameJSON(actualCaseTeam, expectedTeam) || !Comparison.sameJSON(newCaseTeam, expectedTeam)) {
    //     throw new Error('Case team is not the same as given to the case');
    // }
}

/**
 * Asserts a member's presence in the case team
 * @param member 
 * @param caseInstance 
 * @param user 
 * @param expectNoFailures 
 */
export async function assertCaseTeamMember(user: User, caseInstance: Case, member: CaseTeamMember, expectNoFailures: boolean = true) {
    // Get case team via getCaseTeam
    const team = await caseTeamService.getCaseTeam(user, caseInstance);
    const actualCaseTeam = await convertToCaseTeam(team);

    const [status, msg] = hasMember(actualCaseTeam, member)

    if (!status) {
        if (expectNoFailures) {
            throw new Error('Member ' + member.memberId + ' is not present in the given team.\nReason: ' + msg);
        }
    } else {
        if (!expectNoFailures) {
            throw new Error('Member ' + member.memberId + ' is present in the given team');
        }
    }
}

/**
 * A simple assertion method for filters against getCases, and getTasks
 * @param user
 * @param input should contain filter, expectedValue, and message fields
 */
export async function assertGetCasesAndTasksFilter(user: User, input: any) {
    // Asserts test filter against getCases
    await caseService.getCases(user, input.filter).then(cases => {
        if (cases.length != input.expectedValue) {
            throw new Error(input.message + cases.length);
        }
    });

    // Asserts test filter against getTasks
    await taskService.getTasks(user, input.filter).then(tasks => {
        if (tasks.length != input.expectedValue) {
            throw new Error(input.message + tasks.length);
        }
    });
}