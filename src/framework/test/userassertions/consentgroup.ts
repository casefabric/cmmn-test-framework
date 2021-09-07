import ConsentGroup from "../../service/consentgroup/consentgroup";
import ConsentGroupService from "../../service/consentgroup/consentgroupservice";
import User from "../../user";
import Comparison from "../comparison";

export default async function assertSameGroup(user: User, expectedGroup: ConsentGroup) {
    const actualGroup = await ConsentGroupService.getGroup(user, expectedGroup);
    if (! actualGroup) {
        throw new Error(`Cannot find a consent group ${expectedGroup}`);
    }

    sameProperty(expectedGroup, actualGroup, 'name');
    sameProperty(expectedGroup, actualGroup, 'description');

    const expectedUserIds = expectedGroup.members.map(m => m.userId);
    const actualUserIds = actualGroup.members.map(m => m.userId);

    const missingUserIds = expectedUserIds.filter(expectedUserId => !actualUserIds.find(id => id === expectedUserId));
    const tooManyUserIds = actualUserIds.filter(actualUserId => !expectedUserIds.find(id => id === actualUserId));

    if (missingUserIds.length > 0 || tooManyUserIds.length > 0) {
        const msg1 = missingUserIds.length > 0 ? 'Missing user ids: ' + missingUserIds.join(',') : '';
        const msg2 = missingUserIds.length > 0 ? 'Unexpected user ids: ' + tooManyUserIds.join(',') : '';
        throw new Error(`Consent group members mismatch:\n\t${msg1}\n\t${msg2}`);
    }

    expectedGroup.members.forEach(expectedMember => {
        const actualMember = actualGroup.members.find(member => member.userId === expectedMember.userId);
        if (! actualMember) {
            throw new Error(`Surprisingly we cannot find member ${expectedMember.userId} in the actual consent group`);
        }
        sameProperty(expectedMember, actualMember, 'isOwner');
        Comparison.sameArray(expectedMember.roles, actualMember.roles);
    })
}

export async function assertMemberRole(user: User, group: ConsentGroup, member: User | string, expectedRole: string) {
    return ConsentGroupService.getGroupMember(user, group, member).then(actualMember => {
        if (!actualMember.roles.find(r => r === expectedRole)) {
            throw new Error(`Expected to find role '${expectedRole}' in member ${member}, but found roles [${actualMember.roles.join(',')}]`);
        }
    });
}

export async function assertMemberHasNoRoles(user: User, group: ConsentGroup, member: User | string) {
    return ConsentGroupService.getGroupMember(user, group, member).then(actualMember => {
        if (actualMember.roles.length > 0) {
            throw new Error(`Expected member ${member} in group ${group} to have no roles, but found roles [${actualMember.roles.join(',')}]`);
        }
    });
}

function sameProperty(expected: any, actual: any, propertyName: string) {
    if (expected[propertyName] !== actual[propertyName]) {
        throw new Error(`Expected ${expected.constructor.name} ${expected} to have ${propertyName} '${expected[propertyName]}' but found '${actual[propertyName]}'`);
    }
}
