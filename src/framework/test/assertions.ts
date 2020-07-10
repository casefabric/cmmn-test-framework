import User from '../user';
import Task from '../cmmn/task';
import Comparison from './comparison';
import TaskService from '../service/task/taskservice';
import CaseService from '../service/case/caseservice';
import Case from '../../framework/cmmn/case';
import TenantUser from '../../framework/tenant/tenantuser';
import CaseFileService from '../service/case/casefileservice';
import { pathReader } from '../cmmn/casefile';
import CaseTeam from '../cmmn/caseteam';
import CaseTeamService from '../service/case/caseteamservice';
import CaseTeamMember from '../cmmn/caseteammember';

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
export async function assertTask(task: Task, user: User, action: string, expectedState: string = '', expectedAssignee?: User, expectedOwner?: User) {
    await taskService.getTask(task, user).then(task => {
        console.log(`Task after ${action}:\tstate = ${task.taskState},\tassignee = '${task.assignee}',\towner = '${task.owner}' `);
        if (task.taskState !== expectedState) {
            throw new Error(`Task ${task.taskName} is not in state '${expectedState}' but in state '${task.taskState}'`);
        }
        if (expectedAssignee && task.assignee !== expectedAssignee.id) {
            throw new Error(`Task ${task.taskName} is not assigned to '${expectedAssignee}' but to user '${task.assignee}'`);
        }
        if (expectedOwner && task.owner !== expectedOwner.id) {
            throw new Error(`Task ${task.taskName} is not owned by '${expectedOwner}' but by '${task.owner}'`);
        }
    });
}

/**
 * Asserts state of a plan item with the given state
 * @param caseInstance 
 * @param planItemName 
 * @param index 
 * @param user 
 * @param state 
 */
export async function assertPlanItemState(caseInstance: Case, planItemName: string, index: number, user: TenantUser, state: string) {
    // Get case details
    const freshCase = await caseService.getCase(caseInstance, user);
    const planitem = freshCase.planitems.find(p => p.name === planItemName && p.index === index);
    if (planitem?.currentState !== state) {
        throw new Error('The plan item "' + planItemName + '" is expected to be '+ state + ', but it is ' + planitem?.currentState);
    }
}

/**
 * Verifies whether task's input is same as that of expected input
 * @param task 
 * @param taskInput expected input
 */
export function verifyTaskInput(task: Task, taskInput: any) {
    if (!Comparison.sameJSON(task.input, taskInput)) {
        throw new Error('Task input is not the same as given to the case');
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
        throw new Error('Cannot find task ' + taskName);
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
    if(actualCount != expectedCount ) {
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
export async function assertCaseFileContent(caseInstance: Case, user: User, path: string, expectedContent: any) {
    await caseFileService.getCaseFile(caseInstance, user).then(casefile => {
        // console.log("Case File for reading path " + path, casefile);
        const readCaseFileItem = (caseFile:any) => {
            const item = pathReader(caseFile, path);
            if (! item && caseFile.file) { // Temporary backwards compatibility; casefile.file will be dropped in 1.1.5
                return pathReader(caseFile.file, path)
            }
            return item;
        } 

        const actualCaseFileItem = readCaseFileItem(casefile);
        if (!Comparison.sameJSON(actualCaseFileItem, expectedContent)) {
            throw new Error(`Case File [${path}] is expected to match: ${JSON.stringify(expectedContent, undefined, 2)}\nActual: ${JSON.stringify(actualCaseFileItem, undefined, 2)}`);
        }
    });
}

/**
 * A simple converter method which converts JSON caseTeam to object
 * @param team 
 */
async function convertToCaseTeam(team: any) {
    let actualCaseTeamArray: Array<CaseTeamMember> = []
    const rawMembers = team.members ? team.members : team;
    await rawMembers.forEach(member => {
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
        if (! sameRoles(member1.caseRoles, member2.caseRoles)) {
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
        for (let i = 0; i< roles1.length; i++) {
            if (!roles2.find(role => role === roles1[i])) {
                return false;
            }
        }
        return true;
    }
    if (! team.members.find(member => compareMember(member, expectedMember))) {
        return [false, msg];
    }
    return [true, msg];
}

async function verifyTeam(team1: CaseTeam, team2: CaseTeam) {
    const compareTeam = (team1: CaseTeam, team2: CaseTeam) => {
        if (team1.members.length != team2.members.length) return false;
        for (let i = 0; i< team1.members.length; i++) {
            const member1 = team1.members[i];
            const [status, msg] = hasMember(team2, member1);
            if (! status) {
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
export async function assertCaseTeam(caseInstance: Case, user: User, expectedTeam: CaseTeam) {
    // Get case team via getCaseTeam
    const team = await caseTeamService.getCaseTeam(caseInstance, user)
    const actualCaseTeam = await convertToCaseTeam(team)

    // Get case team via getCase
    const newCase = await caseService.getCase(caseInstance, user);
    const newCaseTeam = await convertToCaseTeam(newCase.team)

    const verifyActualCaseTeam = await verifyTeam(actualCaseTeam, expectedTeam)
    const verifyNewCaseTeam = await verifyTeam(newCaseTeam, expectedTeam)

    if(!verifyActualCaseTeam || !verifyNewCaseTeam) {
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
export async function assertCaseTeamMember(member: CaseTeamMember, caseInstance: Case, user: User, expectNoFailures: boolean = true) {
    // Get case team via getCaseTeam
    const team = await caseTeamService.getCaseTeam(caseInstance, user);
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