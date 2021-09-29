import User from '../../user';
import CaseService from '../../service/case/caseservice';
import Case from '../../cmmn/case';
import CaseTeam from '../../cmmn/caseteam';
import CaseTeamService from '../../service/case/caseteamservice';
import CaseTeamMember from '../../cmmn/caseteammember';

const caseService = new CaseService();
const caseTeamService = new CaseTeamService();

function findMember(team: CaseTeam, expectedMember: CaseTeamMember) {
    return team.members.find(member => member.memberId === expectedMember.memberId && member.memberType === expectedMember.memberType);
}

function hasMember(team: CaseTeam, expectedMember: CaseTeamMember): [boolean, string] {
    const actualMember = findMember(team, expectedMember);
    if (!actualMember) {
        const memberWithSameIDButDifferentType = team.members.find(member => member.memberId === expectedMember.memberId)
        if (memberWithSameIDButDifferentType) {
            return [false, `Case team contains a member with id '${expectedMember.memberId}', but the member has type ${memberWithSameIDButDifferentType.memberType} instead of ${expectedMember.memberType}`]
        } else {
            return [false, `Case team does not contain a member with id '${expectedMember.memberId}'`]
        }
    } else {
        // Check roles
        const actualRoles = actualMember.caseRoles;
        const expectedRoles = expectedMember.caseRoles;

        if (actualRoles && !expectedRoles) {
            return [false, `Did not expect to found roles on team member ${expectedMember.memberId}, but found [${actualRoles}]`];
        }
        if (!actualRoles && expectedRoles) {
            return [false, `Did not found roles on team member ${expectedMember.memberId}, expected [${expectedRoles}]`];
        }
        const missingRoles = expectedRoles.filter(expected => !actualRoles.find(role => role === expected))
        if (missingRoles.length > 0) {
            return [false, `Team member ${expectedMember.memberId} misses expected roles ${missingRoles}`];
        }

        const unexpectedRoles = actualRoles.filter(actualRole => !expectedRoles.find(role => role === actualRole))
        if (unexpectedRoles.length > 0) {
            return [false, `Team member ${expectedMember.memberId} is not expected to have roles [${unexpectedRoles}]`];
        }

        if (expectedMember.isOwner !== undefined && expectedMember.isOwner !== actualMember.isOwner) {
            return [false, `Team member ${expectedMember.memberId} is${expectedMember.isOwner ? ' ' : ' not '}expected to be case owner`];
        }
    }
    return [true, `Member ${expectedMember.memberId} is present in the team`];
}

async function verifyTeam(actualTeam: CaseTeam, expectedTeam: CaseTeam) {
    const missingMembers = expectedTeam.members.filter(member => !findMember(actualTeam, member));
    const tooManyMembers = actualTeam.members.filter(member => !findMember(expectedTeam, member));

    // Simple case team member stringyfier that prints type of member and user id
    const membersPrinter = (members: Array<CaseTeamMember>) => `[${members.map(m => `${m.memberType}::${m.memberId}`)}]`;

    if (missingMembers.length > 0 && tooManyMembers.length > 0) {
        throw new Error(`Missing Case Team members ${membersPrinter(missingMembers)}, found unexpected members ${membersPrinter(tooManyMembers)}`);
    }
    if (missingMembers.length > 0) {
        throw new Error(`Expecting Case Team to contain ${expectedTeam.members.length} members, but found ${actualTeam.members.length}; missing members ${membersPrinter(missingMembers)}`);
    }
    if (tooManyMembers.length > 0) {
        throw new Error(`Expecting Case Team to contain ${expectedTeam.members.length} members, but found ${actualTeam.members.length}, with unexpected members ${membersPrinter(tooManyMembers)}`);
    }

    expectedTeam.members.forEach(expectedMember => {
        const [status, msg] = hasMember(actualTeam, expectedMember);
        if (!status) throw new Error(msg);
    });
}

/**
 * Asserts the case team with the given team
 * and throws error if it doesn't match
 * @param caseId 
 * @param user 
 * @param expectedTeam 
 */
export async function assertCaseTeam(user: User, caseId: Case | string, expectedTeam: CaseTeam) {
    // Get case team via getCaseTeam
    await caseTeamService.getCaseTeam(user, caseId).then(team => verifyTeam(team, expectedTeam));

    // Get case team via getCase
    await caseService.getCase(user, caseId).then(caseInstance => caseInstance.team).then(team => verifyTeam(team, expectedTeam));
}

/**
 * Asserts a member's presence in the case team
 * @param member 
 * @param caseId 
 * @param user 
 * @param expectNoFailures 
 */
export async function assertCaseTeamMember(user: User, caseId: Case | string, member: CaseTeamMember, expectNoFailures: boolean = true) {
    // Get case team via getCaseTeam
    const actualCaseTeam = await caseTeamService.getCaseTeam(user, caseId);

    const [status, msg] = hasMember(actualCaseTeam, member)
    if ((expectNoFailures && !status) || status && !expectNoFailures) {
        throw new Error(msg);
    }
}
