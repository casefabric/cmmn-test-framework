import Case from "../../cmmn/case";
import PlanItem from "../../cmmn/planitem";

export default class Path {
    static from(path: Path | string): Path {
        if (path instanceof Path) {
            return path;
        } else {
            if (path.split('/').length > 1) {
                return new Path(path);
            } else {
                return new Identifier(path);
            }
        }
    }

    static EMPTY = new Path('');

    public child: Path | undefined = undefined;
    public name: string = '';
    public index: number = 0;
    public part: string = '';
    protected constructor(public readonly raw: string, slashedParts?: string[]) {
        const partReader = (part: string) => {
            part = part.trim();
            const decoded = decodeURIComponent(part);
            const slash = decoded.indexOf('/');
            if (slash > 0 && slash < decoded.length - 1) {
                return decoded;
            } else {
                return part;
            }
        }

        if (!slashedParts) {
            slashedParts = raw.split('/').map(partReader).filter(part => part.length > 0);
        }
        if (slashedParts.length > 0) {
            this.part = slashedParts[0];
            const splittedPart = this.part.split('[');
            if (splittedPart.length === 1) {
                this.name = this.part;
            } else {
                this.name = splittedPart[0];
                if (!this.part.endsWith(']')) {
                    throw new Error(`Invalid path ${raw}, as the part ${this.part} contains a [ it should also end with ]`);
                }
                this.index = Number.parseInt(this.part.substring(0, this.part.length - 1).split('[')[1]);
                if (Number.isNaN(this.index)) {
                    throw new Error(`Invalid path ${raw}, as the part ${this.part} must contain a number, but we found ${splittedPart[1].substring(splittedPart[1].length - 1)}`)
                }
                if (this.index < 0) {
                    throw new Error(`Invalid path ${raw}, as the part ${this.part} must contain a positive number, but we found ${this.index}, which is less than 0`);
                }
            }
        }
        if (slashedParts.length > 1) {
            this.child = new Path(raw, slashedParts.slice(1));
        }
    }

    resolve(caseInstance: Case | undefined): PlanItem | undefined {
        // console.log(`Searching for "${this.raw}" in case ${caseInstance}`); 
        if (!caseInstance) {
            // console.log(`> Resolving path ${this} failed because there is no case`);
            return undefined;
        }
        if (!caseInstance.plan) {
            // console.log(`> Resolving path ${this} on case ${caseInstance.id} failed because there is no case plan`);
            return undefined;
        } else {
            return this.walkPath(caseInstance, caseInstance.plan);
        }
    }

    private walkPath(caseInstance: Case, parent: PlanItem, indent: string = ''): PlanItem | undefined {
        const planitems = caseInstance.planitems.filter(item => item.stageId === parent.id);
        // console.log(`${indent}> Searching for ${this.part} in ${planitems.length} children: ["${planitems.map(item => item.name).join('", "')}"]`);
        const item = planitems.find(item => (item.name === this.name || item.id === this.name) && item.index === this.index);
        if (!item) {
            return undefined;
        } else if (this.child) {
            return this.child.walkPath(caseInstance, item, indent + ' ');
        } else {
            return item;
        }
    }

    is(path: Path): boolean {
        // If raw is equal, then it is easy.
        if (this.raw === path.raw) {
            return true;
        }
        return this.formatted === path.formatted;

        // // Need to have same name and index
        // if (this.name !== path.name || this.index !== path.index) {
        //     return false;
        // }

        // // Either both must have parents, or both don't have parents.
        // if ((this.parent && !path.parent) || (!this.parent && path.parent)) {
        //     return false;
        // }

        // // If we have a parent, then if there is no 
        // if (this.parent) {
        //     if (! path.parent) return false; // Unfortunately typescript needs this additional test
        //     return this.parent.is(path.parent);
        // }
        // return true;
    }

    get formatted(): string {
        return `${this.name}[${this.index}]${this.child ?  '/' + this.child.formatted : ''}`;
    }

    toString(): string {
        if (this.child) {
            return this.part + '/' + this.child.toString();
        } else {
            return this.part;
        }
    }
}

export class Identifier extends Path {
    constructor(identifier: string) {
        super(identifier);
    }

    resolve(caseInstance: Case): PlanItem | undefined {
        return caseInstance.planitems.find(item => item.name === this.name && item.index === this.index);
    }
}
