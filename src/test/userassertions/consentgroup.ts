import AsyncError from "../../util/async/asyncerror";
import Trace from "../../util/async/trace";
import ConsentGroup from "../../service/consentgroup/consentgroup";
import ConsentGroupService from "../../service/consentgroup/consentgroupservice";
import User from "../../user";
import Comparison from "../comparison";

export default async function assertSameGroup(user: User, expectedGroup: ConsentGroup, trace: Trace = new Trace()) {
    const actualGroup = await ConsentGroupService.getGroup(user, expectedGroup);
    if (! actualGroup) {
        throw new AsyncError(trace, `Cannot find a consent group ${expectedGroup}`);
    }

    sameProperty(expectedGroup, actualGroup, 'name', trace);
    sameProperty(expectedGroup, actualGroup, 'description', trace);

    const expectedUserIds = expectedGroup.members.map(m => m.userId);
    const actualUserIds = actualGroup.members.map(m => m.userId);

    const missingUserIds = expectedUserIds.filter(expectedUserId => !actualUserIds.find(id => id === expectedUserId));
    const tooManyUserIds = actualUserIds.filter(actualUserId => !expectedUserIds.find(id => id === actualUserId));

    if (missingUserIds.length > 0 || tooManyUserIds.length > 0) {
        const msg1 = missingUserIds.length > 0 ? 'Missing user ids: ' + missingUserIds.join(',') : '';
        const msg2 = missingUserIds.length > 0 ? 'Unexpected user ids: ' + tooManyUserIds.join(',') : '';
        throw new AsyncError(trace, `Consent group members mismatch:\n\t${msg1}\n\t${msg2}`);
    }

    expectedGroup.members.forEach(expectedMember => {
        const actualMember = actualGroup.members.find(member => member.userId === expectedMember.userId);
        if (! actualMember) {
            throw new AsyncError(trace, `Surprisingly we cannot find member ${expectedMember.userId} in the actual consent group`);
        }
        sameProperty(expectedMember, actualMember, 'isOwner', trace);
        if (!Comparison.sameArray(expectedMember.roles, actualMember.roles)) {
            throw new AsyncError(trace, `Expected group member to have roles [${expectedMember.roles.join(', ')}] but found [${actualMember.roles.join(', ')}]`);
        };
    })
}

export async function assertMemberRole(user: User, group: ConsentGroup, member: User | string, expectedRole: string, trace: Trace = new Trace()) {
    return ConsentGroupService.getGroupMember(user, group, member, undefined, undefined, trace).then(actualMember => {
        if (!actualMember.roles.find(r => r === expectedRole)) {
            throw new AsyncError(trace, `Expected to find role '${expectedRole}' in member ${member}, but found roles [${actualMember.roles.join(',')}]`);
        }
    });
}

export async function assertMemberHasNoRoles(user: User, group: ConsentGroup, member: User | string, trace: Trace = new Trace()) {
    return ConsentGroupService.getGroupMember(user, group, member, undefined, undefined, trace).then(actualMember => {
        if (actualMember.roles.length > 0) {
            throw new AsyncError(trace, `Expected member ${member} in group ${group} to have no roles, but found roles [${actualMember.roles.join(',')}]`);
        }
    });
}

function sameProperty(expected: any, actual: any, propertyName: string, trace: Trace) {
    if (expected[propertyName] !== actual[propertyName]) {
        throw new AsyncError(trace, `Expected ${expected.constructor.name} ${expected} to have ${propertyName} '${expected[propertyName]}' but found '${actual[propertyName]}'`);
    }
}
