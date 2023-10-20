import Case from '../../cmmn/case';
import CaseTeam from '../../cmmn/team/caseteam';
import CaseTeamUser from '../../cmmn/team/caseteamuser';
import CaseTeamTenantRole from '../../cmmn/team/caseteamtenantrole';
import CaseTeamService from '../../service/case/caseteamservice';
import User from '../../user';
import CaseTeamGroup from '../../cmmn/team/caseteamgroup';
import Trace from '../../infra/trace';
import AsyncError from '../../infra/asyncerror';

function findMember(team: CaseTeam, expectedMember: CaseTeamUser) {
    return team.users.find(member => member.userId === expectedMember.userId);
}

function hasUser(team: CaseTeam, expectedMember: CaseTeamUser, expectNoDifferences: boolean = true, trace: Trace) {
    const differs = (msg: string) => {
        if (expectNoDifferences) {
            throw new AsyncError(trace, msg);
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
        differs(`Did not expect to find any case roles on team member ${expectedMember}, but found [${actualRoles}]`);
    }
    if (!actualRoles && expectedRoles) {
        differs(`Did not find any case roles on team member ${expectedMember}, expected [${expectedRoles}]`);
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
        throw new AsyncError(trace, `Member ${expectedMember} is unexpectedly present in the team`);
    }
}

function hasTenantRole(team: CaseTeam, expectedTenantRole: CaseTeamTenantRole, expectNoDifferences: boolean = true, trace: Trace) {
    const differs = (msg: string) => {
        if (expectNoDifferences) {
            throw new AsyncError(trace, msg);
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
        differs(`Did not expect to find case roles on tenant role ${expectedTenantRole}, but found [${actualRoles}]`);
    }
    if (!actualRoles && expectedRoles) {
        differs(`Did not find any case roles on tenant role ${expectedTenantRole}, expected [${expectedRoles}]`);
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
        throw new AsyncError(trace, `Tenant role ${expectedTenantRole} is unexpectedly present in the team`);
    }
}

async function verifyTeam(actualTeam: CaseTeam, expectedTeam: CaseTeam, trace: Trace) {
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

    expectedTeam.users.forEach(expectedMember => hasUser(actualTeam, expectedMember, undefined, trace));
}

/**
 * Asserts the case team with the given team
 * and throws error if it doesn't match
 * @param caseId 
 * @param user 
 * @param expectedTeam 
 */
export async function assertCaseTeam(user: User, caseId: Case | string, expectedTeam: CaseTeam, trace: Trace = new Trace()) {
    CaseTeamService.getCaseTeam(user, caseId, undefined, undefined, trace).then(team => verifyTeam(team, expectedTeam, trace));
}

/**
 * Asserts presence of the CaseTeamUser membership in the case team
 * @param member Member that must be present 
 * @param caseId Case in which the member must be present
 * @param user User that retrieves the case team
 * @param expectNoDifferences Defaults to true, but can be set to false and then checks that the member may NOT be present in the team
 */
export async function assertCaseTeamUser(user: User, caseId: Case | string, member: CaseTeamUser, expectNoDifferences: boolean = true, trace: Trace = new Trace()) {
    // Get case team via getCaseTeam
    const actualCaseTeam = await CaseTeamService.getCaseTeam(user, caseId, undefined, undefined, trace);
    hasUser(actualCaseTeam, member, expectNoDifferences, trace);
}

/**
 * Asserts presence of the CaseTeamTenantRole membership in the case team
 * @param member Member that must be present 
 * @param caseId Case in which the member must be present
 * @param user User that retrieves the case team
 * @param expectNoDifferences Defaults to true, but can be set to false and then checks that the member may NOT be present in the team
 */
 export async function assertCaseTeamTenantRole(user: User, caseId: Case | string, member: CaseTeamTenantRole, expectNoDifferences: boolean = true, trace: Trace = new Trace()) {
    // Get case team via getCaseTeam
    const actualCaseTeam = await CaseTeamService.getCaseTeam(user, caseId, undefined, undefined, trace);
    hasTenantRole(actualCaseTeam, member, expectNoDifferences, trace);
}

/**
 * Asserts presence of the CaseTeamGroup membership in the case team
 * @param member Member that must be present 
 * @param caseId Case in which the member must be present
 * @param user User that retrieves the case team
 * @param expectNoDifferences Defaults to true, but can be set to false and then checks that the member may NOT be present in the team
 */
 export async function assertSameGroup(user: User, caseId: Case | string, member: CaseTeamGroup, expectNoDifferences: boolean = true, trace: Trace = new Trace()): Promise<void> {
    // Get case team via getCaseTeam
    const actualCaseTeam = await CaseTeamService.getCaseTeam(user, caseId, undefined, undefined, trace);
    hasGroup(actualCaseTeam, member, expectNoDifferences, trace);
}

function hasGroup(team: CaseTeam, expectedMember: CaseTeamGroup, expectNoDifferences: boolean = true, trace: Trace) {
    let foundDifferences = false;

    const differs = (msg: string) => {
        foundDifferences = true;
        if (expectNoDifferences) {
            throw new AsyncError(trace, msg);
        }
    }

    const actualMember = team.groups.find(group => group.groupId === expectedMember.groupId);
    if (!actualMember) {
        differs(`Case team does not contain a group '${expectedMember}'`);
        return;
    }

    // Check mappings of group roles
    const actualMappings = actualMember.mappings;
    const expectedMappings = expectedMember.mappings;

    if (actualMappings && !expectedMappings) {
        differs(`Did not expect to find mappings on case team group ${expectedMember}, but found [${actualMappings.map(m => m.groupRole)}]`);
    }
    if (!actualMappings && expectedMappings) {
        differs(`Did not find any mappings on case team group ${actualMember}, expected [${expectedMappings.map(m => m.groupRole)}]`);
    }

    const missingGroupRoleMappings = expectedMappings.filter(expected => !actualMappings.find(mapping => mapping.groupRole === expected.groupRole))
    if (missingGroupRoleMappings.length > 0) {
        differs(`Case Team Group ${expectedMember} misses expected group role mappings ${missingGroupRoleMappings.map(m => m.groupRole)}`);
    }

    const unexpectedGroupRoleMappings = actualMappings.filter(actualMapping => !expectedMappings.find(mapping => mapping.groupRole === actualMapping.groupRole))
    if (unexpectedGroupRoleMappings.length > 0) {
        differs(`Case Team Group ${expectedMember} is not expected to have group role mappings [${unexpectedGroupRoleMappings.map(m => m.groupRole)}]`);
    }

    expectedMappings.forEach(expectedMapping => {
        const actualMapping = actualMappings.find(mapping => mapping.groupRole === expectedMapping.groupRole);
        if (! actualMapping) {
            differs(`Case Team Group ${expectedMember} misses expected group role mapping ${expectedMapping.groupRole}`);
        }

        if (expectedMapping.isOwner !== undefined && expectedMapping.isOwner !== actualMapping?.isOwner) {
            differs(`Case Team Group ${expectedMember} with mapping for group role ${expectedMapping.groupRole} iss ${expectedMapping.isOwner ? ' ' : ' not '} expected to be case owner`);
        }

        // Check roles
        const actualRoles = actualMapping?.caseRoles;
        const expectedRoles = expectedMapping.caseRoles;

        if (actualRoles && !expectedRoles) {
            differs(`Case Team Group ${expectedMember} is not supposed to have case roles for group role mapping ${expectedMapping.groupRole}, but found [${actualRoles}]`);
        }
        if (!actualRoles && expectedRoles) {
            differs(`Case Team Group ${expectedMember} is not having expected case roles for group role mapping ${expectedMapping.groupRole}, expected [${expectedRoles}]`);
        }
        const missingRoles = expectedRoles.filter(expected => !actualRoles?.find(role => role === expected))
        if (missingRoles.length > 0) {
            differs(`Case Team Group ${expectedMember} misses roles ${missingRoles} for group role mapping ${expectedMapping.groupRole}`);
        }

        const unexpectedRoles = actualRoles?.filter(actualRole => !expectedRoles.find(role => role === actualRole))
        if (unexpectedRoles && unexpectedRoles.length > 0) {
            differs(`Case Team Group ${expectedMember} is not expected to have roles [${unexpectedRoles}] for group role mapping ${expectedMapping.groupRole}`);
        } 
    });

    if (! expectNoDifferences && ! foundDifferences) {
        throw new AsyncError(trace, `Case Team Group ${expectedMember} is unexpectedly present in the team`);
    }
}
