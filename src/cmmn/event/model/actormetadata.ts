/**
 * The types of actors that the case engine knows.
 * The values are the names used inside the path of an actor, e.g. 'Case' in Case[some-case-id].
 */
export enum ActorType {
    ModelActor = 'ModelActor',
    Case = 'Case',
    Process = 'ProcessTaskActor',
    Group = 'ConsentGroupActor',
    Tenant = 'TenantActor',
}

/**
 * Identifies an actor in the case engine, including the chain of actors it belongs to (parent up until root),
 * with a path like Case[root]/Case[parent]/Case[child].
 *
 * An actor can belong to a root without having a parent. E.g., the sub case of a non-blocking case task
 * belongs to the root case, but has no relation with the case that started it.
 * Such an actor has an "empty parent" element instead of the parent, written as "...", e.g. Case[root]/.../Case[child].
 * It has an empty parent id and hasParent returns false, but the root is still known.
 */
export default class ActorMetadata {
    /**
     * Path element of an empty parent
     */
    static readonly EMPTY_PARENT = '...';

    static readonly EMPTY: ActorMetadata = new ActorMetadata(ActorType.ModelActor, '');

    /**
     * @param actorType Type of the actor; undefined for an empty parent
     * @param actorId Id of the actor
     * @param parent The next actor up in the chain; undefined for the root
     */
    constructor(public readonly actorType: ActorType | undefined, public readonly actorId: string, public readonly parent?: ActorMetadata) { }

    /**
     * Cuts the path into its elements, and returns the metadata of the last element, i.e. of the actor itself.
     * The other elements are available through parent, root and chain.
     */
    static parsePath(path: string): ActorMetadata {
        if (path.includes('//')) {
            throw new Error(`Invalid actor path '${path}', as it contains an empty element '//'`);
        }
        if (path.indexOf('[') < 0 || path.indexOf(']') < 0) {
            return new ActorMetadata(ActorType.ModelActor, path);
        }
        const elements = path.replace(/^\//, '').replace(/\/$/, '').split('/').map(element => element.trim());

        let metadata: ActorMetadata | undefined = undefined;
        for (const element of elements) {
            metadata = ActorMetadata.parsePathElement(path, element, metadata);
        }
        if (!metadata) {
            throw new Error(`Invalid actor path '${path}', as it has no elements`);
        }
        return metadata;
    }

    private static parsePathElement(path: string, element: string, parent?: ActorMetadata): ActorMetadata {
        if (element === ActorMetadata.EMPTY_PARENT) {
            return new ActorMetadata(undefined, ActorMetadata.EMPTY_PARENT, parent);
        }
        const openingBracket = element.indexOf('[');
        const closingBracket = element.indexOf(']');
        if (openingBracket < 0 || closingBracket < openingBracket) {
            throw new Error(`Invalid actor path '${path}', as the element '${element}' must look like Type[id]`);
        }
        const typeName = element.substring(0, openingBracket).toLowerCase();
        const actorType = Object.values(ActorType).find(type => type.toLowerCase() === typeName);
        const actorId = element.substring(openingBracket + 1, closingBracket);
        return new ActorMetadata(actorType, actorId, parent);
    }

    get path(): string {
        return this.parent ? `${this.parent.path}/${this.description}` : this.description;
    }

    /**
     * The elements of the path, from the root down to this actor.
     */
    get chain(): Array<ActorMetadata> {
        return this.parent ? [...this.parent.chain, this] : [this];
    }

    /**
     * True if there is a parent actor, i.e., the actor that started this actor and wants to be informed about it.
     * Note that an actor with an empty parent has no parent, but it is also not the root.
     */
    get hasParent(): boolean {
        return this.parent !== undefined && this.parent.actorType !== undefined;
    }

    /**
     * True if this actor has no ancestors at all.
     */
    get isRoot(): boolean {
        return this.parent === undefined;
    }

    get root(): ActorMetadata {
        return this.parent ? this.parent.root : this;
    }

    get parentId(): string {
        return this.parent && this.hasParent ? this.parent.actorId : '';
    }

    /**
     * If the actor type is not filled, we assume this is an empty parent, and the description is 3 dots "..."
     */
    get description(): string {
        return this.actorType === undefined ? ActorMetadata.EMPTY_PARENT : `${this.actorType}[${this.actorId}]`;
    }

    toString(): string {
        return this.path;
    }
}
