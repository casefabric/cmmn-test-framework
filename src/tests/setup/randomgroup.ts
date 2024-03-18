import ConsentGroup from "../../service/consentgroup/consentgroup";
import ConsentGroupMember from "../../service/consentgroup/consentgroupmember";
import Util from "../../test/util";
import User from "../../user";
import RandomUser from "./randomuser";

export default class RandomGroup extends ConsentGroup {
    constructor(prefix: string = 'random_group_', members: Array<ConsentGroupMember> = []) {
        super(members, Util.generateId(prefix, 5));
    }
    
    addMember(user: User = new RandomUser(), roles: Array<string> = []): ConsentGroupMember {
        const member = this.members.find(member => member.id === user.id);
        if (member) {
            return member;
        } else {
            const newMember = new RandomGroupMember(user, roles);
            this.members.push(newMember);
            return newMember;
        }
    }
}

class RandomGroupMember extends ConsentGroupMember {
    constructor(private user: User, roles: Array<string>) {
        super(user.id, roles);
    }

    async login() {
        await this.user.login();
        return super.login();
    }
}
