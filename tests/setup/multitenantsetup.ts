import ConsentGroup from "../../src/service/consentgroup/consentgroup";
import ConsentGroupService from "../../src/service/consentgroup/consentgroupservice";
import PlatformService from "../../src/service/platform/platformservice";
import Tenant from "../../src/tenant/tenant";
import TenantUser, { TenantOwner } from "../../src/tenant/tenantuser";
import User, { admin } from "../../src/user";

/**
 * Somewhat complexer tenant setup, along with consent groups
 */
export default class MultiTenantSetup {

    // Create users, and collect the in tenant users groups.
    girl = new TenantOwner('girl', ['Daughter', 'Family']);
    boy = new TenantOwner('boy', ['Son', 'Family']);
    dad = new TenantUser('dad', ['Father', 'Family']);
    mom = new TenantUser('mom', ['Mother', 'Family']);
    neil = new TenantUser('neil', ['Captain', 'Astronaut']);
    buzz = new TenantUser('buzz', ['Astronaut']);
    irwin = new TenantUser('irwin', ['Astronaut']);
    elon = new TenantUser('elon', ['Captain', 'Star']);
    jeff = new TenantUser('jeff', ['Captain', 'Shepherd']);
    alien = new TenantUser('alien', ['Alien']);
    martian = new TenantUser('martian', ['Alien', 'Martian']);

    people = [this.girl, this.boy, this.dad, this.mom, this.neil, this.buzz, this.irwin, this.elon, this.jeff, this.alien];

    moonmen = createMoonFamily([this.neil, this.buzz, this.irwin, this.alien]); // These users have role 'Family', but only in moon tenant.
    martians = [this.girl, this.boy, this.elon, this.jeff, this.alien, this.martian];

    // Create tenants
    world = new Tenant('world-tenant', this.people);
    moon = new Tenant('moon-tenant', this.moonmen);
    mars = new Tenant('mars-tenant', this.martians);
    futureWorld = new Tenant('family-world-tenant', [this.girl, this.boy, this.dad, this.mom]);

    // Note: same role name in different groups has a different meaning!
    //  We give it the same name just to ensure that this does not lead to authorization issues (e.g., being member of different group with same role name should not give you access)
    groupRoleUser = 'user';
    groupRoleTester = 'tester';

    // Create consent groups
    moonGroup = new ConsentGroup([this.neil.asCGO(), this.buzz.asCGM(this.groupRoleUser), this.alien.asCGM(this.groupRoleTester)], 'moon-group');
    marsGroup = new ConsentGroup([this.jeff.asCGO(), this.boy.asCGM(this.groupRoleUser), this.alien.asCGM(this.groupRoleTester)], 'mars-group');
    marsGroup2 = new ConsentGroup([this.boy.asCGO(), this.elon.asCGM(this.groupRoleUser), this.martian.asCGM(this.groupRoleTester)], 'mars-group2');

    constructor(public platformAdmin: User = admin) {
    }

    /**
     * Creates the tenant, and logs in for sender user and receiver user.
     */
    async create() {
        await this.platformAdmin.login();
        await PlatformService.createTenant(this.platformAdmin, this.world);
        await PlatformService.createTenant(this.platformAdmin, this.moon);
        await PlatformService.createTenant(this.platformAdmin, this.mars);
        await PlatformService.createTenant(this.platformAdmin, this.futureWorld);
        await this.girl.login();
        await this.boy.login();
        await this.mom.login();
        await this.dad.login();
        await this.neil.login();
        await this.buzz.login();
        await this.irwin.login();
        await this.elon.login();
        await this.jeff.login();
        await this.alien.login();
        await this.martian.login();
        await ConsentGroupService.createGroup(this.neil, this.moon, this.moonGroup);
        await ConsentGroupService.createGroup(this.boy, this.mars, this.marsGroup);
        await ConsentGroupService.createGroup(this.boy, this.mars, this.marsGroup2);
        // Additionally get the groups, to since ConsentGroupLastModified 
        //  is not taken into account when running e.g. StartCase.
        await ConsentGroupService.getGroup(this.neil, this.moonGroup);
        await ConsentGroupService.getGroup(this.boy, this.marsGroup);
        await ConsentGroupService.getGroup(this.boy, this.marsGroup2);
    }
}

function createMoonFamily(users: Array<TenantUser>): Array<TenantUser> {
    // Copy all passed users, make the first one tenant owner, and also give all of them the 'Family' role
    const family: Array<TenantUser> = users.map((user, index) => {
        const newUser = new TenantUser(user.id);
        if (index === 0) newUser.isOwner = true;
        newUser.roles.push('Family', ...user.roles);
        return newUser;
    });
    return family;
}