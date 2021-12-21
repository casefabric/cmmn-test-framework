import Case from '../../cmmn/case';
import CaseTeam from '../../cmmn/team/caseteam';
import CaseTeamUser from '../../cmmn/team/caseteamuser';
import CaseTeamTenantRole from '../../cmmn/team/caseteamtenantrole';
import CaseTeamService from '../../service/case/caseteamservice';
import User from '../../user';

function findMember(team: CaseTeam, expectedMember: CaseTeamUser) {
    return team.users.find(member => member.userId === expectedMember.userId);
}

function hasUser(team: CaseTeam, expectedMember: CaseTeamUser, expectNoDifferences: boolean = true) {
    const differs = (msg: string) => {
        if (expectNoDifferences) {
            throw new Error(msg);
        }
    }

    const actualMember = findMember(team, expectedMember);
    if (!actualMember) {
        differs(`Case team does not contain a user '${expectedMember}'`);
        return;
    }

    // Check roles
    const actualRoles = actualMember.caseRoles;
    const expectedRoles = expectedMember.caseRoles;

    if (actualRoles && !expectedRoles) {
        differs(`Did not expect to found roles on team member ${expectedMember}, but found [${actualRoles}]`);
    }
    if (!actualRoles && expectedRoles) {
        differs(`Did not found roles on team member ${expectedMember}, expected [${expectedRoles}]`);
    }
    const missingRoles = expectedRoles.filter(expected => !actualRoles.find(role => role === expected))
    if (missingRoles.length > 0) {
        differs(`Team member ${expectedMember} misses expected roles ${missingRoles}`);
    }

    const unexpectedRoles = actualRoles.filter(actualRole => !expectedRoles.find(role => role === actualRole))
    if (unexpectedRoles.length > 0) {
        differs(`Team member ${expectedMember} is not expected to have roles [${unexpectedRoles}]`);
    }

    if (expectedMember.isOwner !== undefined && expectedMember.isOwner !== actualMember.isOwner) {
        differs(`Team member ${expectedMember} is${expectedMember.isOwner ? ' ' : ' not '}expected to be case owner`);
    }

    if (! expectNoDifferences) {
        throw new Error(`Member ${expectedMember} is unexpectedly present in the team`);
    }
}

function hasTenantRole(team: CaseTeam, expectedTenantRole: CaseTeamTenantRole, expectNoDifferences: boolean = true) {
    const differs = (msg: string) => {
        if (expectNoDifferences) {
            throw new Error(msg);
        }
    }

    const actualMember = team.tenantRoles.find(member => member.tenantRole === expectedTenantRole.tenantRole);
    if (!actualMember) {
        differs(`Case team does not contain a tenant role '${expectedTenantRole}'`);
        return;
    }

    // Check roles
    const actualRoles = actualMember.caseRoles;
    const expectedRoles = expectedTenantRole.caseRoles;

    if (actualRoles && !expectedRoles) {
        differs(`Did not expect to found case roles on tenant role ${expectedTenantRole}, but found [${actualRoles}]`);
    }
    if (!actualRoles && expectedRoles) {
        differs(`Did not find expected case roles on tenant role ${expectedTenantRole}, expected [${expectedRoles}]`);
    }
    const missingRoles = expectedRoles.filter(expected => !actualRoles.find(role => role === expected))
    if (missingRoles.length > 0) {
        differs(`Tenant role ${expectedTenantRole} misses expected roles ${missingRoles}`);
    }

    const unexpectedRoles = actualRoles.filter(actualRole => !expectedRoles.find(role => role === actualRole))
    if (unexpectedRoles.length > 0) {
        differs(`Tenant role ${expectedTenantRole} is not expected to have roles [${unexpectedRoles}]`);
    }

    if (expectedTenantRole.isOwner !== undefined && expectedTenantRole.isOwner !== actualMember.isOwner) {
        differs(`Tenant role ${expectedTenantRole} is${expectedTenantRole.isOwner ? ' ' : ' not '}expected to be case owner`);
    }

    if (! expectNoDifferences) {
        throw new Error(`Tenant role ${expectedTenantRole} is unexpectedly present in the team`);
    }
}

async function verifyTeam(actualTeam: CaseTeam, expectedTeam: CaseTeam) {
    const missingMembers = expectedTeam.users.filter(member => !findMember(actualTeam, member));
    const tooManyMembers = actualTeam.users.filter(member => !findMember(expectedTeam, member));

    // Simple case team member stringyfier that prints type of member and user id
    const membersPrinter = (members: Array<CaseTeamUser>) => `[${members.join(', ')}]`;

    if (missingMembers.length > 0 && tooManyMembers.length > 0) {
        throw new Error(`Missing Case Team members ${membersPrinter(missingMembers)}, found unexpected users ${membersPrinter(tooManyMembers)}`);
    }
    if (missingMembers.length > 0) {
        throw new Error(`Expecting Case Team to contain ${expectedTeam.users.length} members, but found ${actualTeam.users.length}; missing members ${membersPrinter(missingMembers)}`);
    }
    if (tooManyMembers.length > 0) {
        throw new Error(`Expecting Case Team to contain ${expectedTeam.users.length} members, but found ${actualTeam.users.length}, with unexpected members ${membersPrinter(tooManyMembers)}`);
    }

    expectedTeam.users.forEach(expectedMember => hasUser(actualTeam, expectedMember));
}

/**
 * Asserts the case team with the given team
 * and throws error if it doesn't match
 * @param caseId 
 * @param user 
 * @param expectedTeam 
 */
export async function assertCaseTeam(user: User, caseId: Case | string, expectedTeam: CaseTeam) {
    CaseTeamService.getCaseTeam(user, caseId).then(team => verifyTeam(team, expectedTeam));
}

/**
 * Asserts a member's presence in the case team
 * @param member 
 * @param caseId 
 * @param user 
 * @param expectNoFailures 
 */
export async function assertCaseTeamUser(user: User, caseId: Case | string, member: CaseTeamUser, expectNoFailures: boolean = true) {
    // Get case team via getCaseTeam
    const actualCaseTeam = await CaseTeamService.getCaseTeam(user, caseId);
    hasUser(actualCaseTeam, member, expectNoFailures);
}

/**
 * Asserts a member's presence in the case team
 * @param member 
 * @param caseId 
 * @param user 
 * @param expectNoFailures 
 */
 export async function assertCaseTeamTenantRole(user: User, caseId: Case | string, member: CaseTeamTenantRole, expectNoFailures: boolean = true) {
    // Get case team via getCaseTeam
    const actualCaseTeam = await CaseTeamService.getCaseTeam(user, caseId);
    hasTenantRole(actualCaseTeam, member, expectNoFailures);
}
