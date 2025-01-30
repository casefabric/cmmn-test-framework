import Case from "../../cmmn/case";
import State from "../../cmmn/state";
import CaseService from "../../service/case/caseservice";
import Path, { Identifier } from "../../service/case/path";
import User from "../../user";
import { PollUntilSuccess } from "../time";
import StateAssertion from "./stateassertion";

/**
 * CaseAssertions enables building a hierarchy of a case with it's sub cases, and setting multiple assertions on the case and it's subcases.
 * When assertions are available, we call the runAssertions() method, which will poll until all assertions are true, or give timeout.
 */
export default class CaseAssertions {
    static from(user: User, caseInstance: Case): CaseAssertions {
        return new CaseAssertions(user, caseInstance);
    }

    public id?: string;
    public stateAssertions: Array<StateAssertion> = [];
    public caseInstance?: Case;
    private subCaseAssertions: Array<CaseAssertions> = [];

    private constructor(public user: User, item?: Case, private identifier?: Path, private parentCase?: CaseAssertions) {
        this.id = item?.id;
        this.caseInstance = item;
        console.log("Putting identifier " + identifier + " and case instance " + item?.printPlan() + " in paren tcase  " + parentCase)
        if (!this.identifier && item) this.identifier = new Identifier(item?.caseName);
    }

    get items() {
        return this.caseInstance?.planitems || [];
    }

    /**
     * Shortcut to retrieving a plan item from the most recently fetched case instance.
     * If the case instance has not been fetched, this will throw an error.
     */
    findItem(path: Path | string, msg?: string) {
        if (!msg) {
            msg = 'No case instance available to search for ' + path;
        }
        if (!this.caseInstance) {
            throw new Error(msg);
        }
        return this.caseInstance.findItem(path);
    }

    /**
     * If the case has a CaseTask, this method can be used to create assertions on the sub case implementing the CaseTask.
     * Note: when the assertions of the main case are ran, this will implicitly assert that the sub case exists.
     */
    assertSubCase(path: Path | string): CaseAssertions {
        const assertion = new CaseAssertions(this.user, undefined, Path.from(path), this);
        this.subCaseAssertions.push(assertion);
        return assertion;
    }

    /**
     * Add an assertion on the plan item with the specified path to have the expected state
     */
    assertPlanItemState(path: Path | string, expectedState: State): StateAssertion {
        const identifier = Path.from(path);
        const stateAsserter = this.stateAssertions.find(a => a.identifier.is(identifier)) || new StateAssertion(identifier, expectedState);
        if (this.stateAssertions.indexOf(stateAsserter) < 0) {
            this.stateAssertions.push(stateAsserter);
        }
        stateAsserter.expectedState = expectedState;
        return stateAsserter;
    }

    /**
     * Asynchronously fetch case instance(s) and run all assertions until they succeed.
     */
    async runAssertions() {
        if (!this.id && !this.parentCase) {
            throw new Error('Cannot run assertions because case id and parent case are not present on idenfitier ' + this.identifier);
        }
        // Make sure we can read the identifier of the subcase from our parent case instance
        if (this.parentCase && !this.parentCase.caseInstance) {
            await this.parentCase.refreshCaseInstance();
        }
        // If we only have the identifier, we should lookup our case id in the parent case
        if (!this.id && this.parentCase && this.identifier) {
            this.id = this.parentCase.findItem(this.identifier, `Cannot run assertions because the sub case with identifier ${this.identifier} is not present`).id;
        }
        // Now parallelly call run() on ourselves, and runAssertions() on our subcases
        await Promise.all([this.run(), ...this.subCaseAssertions.map(subCase => subCase.runAssertions())]);
    }

    private async refreshCaseInstance(): Promise<Case> {
        if (this.id) {
            const caseId = this.id;
            this.caseInstance = await PollUntilSuccess(async () => CaseService.getCase(this.user, caseId));
        } else {
            throw new Error(`Cannot run assertions, as we do not have an id on case instance ${this.id} / ${this.identifier}`);
        }
        if (!this.caseInstance) {
            throw new Error(`Unexpectedly failing to refresh case instance ${this.id} / ${this.identifier}`);
        }
        return this.caseInstance;
    }

    private async run() {
        // console.log("Starting the run on " + this.identifier);
        await PollUntilSuccess(async () => {
            try {
                await this.refreshCaseInstance();
                if (!this.caseInstance) {
                    throw new Error(`Unexpectedly failing ${this.id} / ${this.identifier}`);
                }

                const caseInstance = this.caseInstance;
                const totalNumAssertions = this.stateAssertions.length;
                if (totalNumAssertions === 0) {
                    console.log(`\n============ Assertions have not been defined on case ${this.id} / ${this.identifier}\n`);
                    return;
                }
                console.log(`\n============ Running ${totalNumAssertions} assertions on case ${this.id} / ${this.identifier}:\n${caseInstance.printPlan()}\n`);

                this.stateAssertions.forEach(assertion => {
                    const identifier = assertion.identifier;
                    const planItem = identifier.resolve(caseInstance);
                    if (!planItem) {
                        console.log(`- running assertion ${assertion} Failed, because the case has no plan item with identifier "${identifier}"`)
                        throw new Error(`Cannot find a plan item '${identifier}' in the case`);
                    }
                    try {
                        assertion.run(planItem);
                    } catch (e) {
                        if (e instanceof Error) {
                            console.log(`- running assertion ${assertion} Failed: ${e.message}`);
                        } else {
                            console.log(`- running assertion ${assertion} Failed: ${e}`);
                        }
                        throw e;
                    }
                    console.log(`- running assertion ${assertion} succeeded`);
                })
            } catch (e: any) {
                this.caseInstance = undefined; // Force another fetch attempt
                console.log("Run on " + this.identifier + " gave an exception " + e.message);
                throw e;
            }
        });
    }
}
