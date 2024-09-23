/**
 * Provides an environment structure similar to R.
 * This allows the dataflow to hold current definition locations for variables, based on the current scope.
 *
 * @module
 */
import type { Identifier, IdentifierDefinition, IdentifierReference } from './identifier';
import { BuiltInMemory, EmptyBuiltInMemory } from './built-in';
import type { DataflowGraph } from '../graph/graph';
import { resolveByName } from './resolve-by-name';
import type { ControlDependency } from '../info';
import { jsonReplacer } from '../../util/json';
import {guard} from "../../util/assert";


export function makeReferenceMaybe(ref: IdentifierReference, graph: DataflowGraph, environments: IREnvironmentInformation, includeDefs: boolean, defaultCd: ControlDependency | undefined = undefined): IdentifierReference {
	const node = graph.get(ref.nodeId, true);
	if(includeDefs) {
		const definitions = ref.name ? resolveByName(ref.name, environments) : undefined;
		for(const definition of definitions ?? []) {
			if(definition.kind !== 'built-in-function' && definition.kind !== 'built-in-value') {
				if(definition.controlDependencies && defaultCd && !definition.controlDependencies.find(c => c.id === defaultCd.id)) {
					definition.controlDependencies.push(defaultCd);
				} else {
					definition.controlDependencies = defaultCd ? [defaultCd] : [];
				}
			}
		}
	}
	if(node) {
		const [fst] = node;
		if(fst.controlDependencies && defaultCd && !fst.controlDependencies.includes(defaultCd)) {
			fst.controlDependencies.push(defaultCd);
		} else {
			fst.controlDependencies = defaultCd ? [defaultCd] : [];
		}
	}
	return { ...ref, controlDependencies: [...ref.controlDependencies ?? [], ...(defaultCd ? [defaultCd]: []) ] };
}

export function makeAllMaybe(references: readonly IdentifierReference[] | undefined, graph: DataflowGraph, environments: IREnvironmentInformation, includeDefs: boolean, defaultCd: ControlDependency | undefined = undefined): IdentifierReference[] {
	if(references === undefined) {
		return [];
	}
	return references.map(ref => makeReferenceMaybe(ref, graph, environments, includeDefs, defaultCd));
}

export type EnvironmentMemory = Map<Identifier, IdentifierDefinition[]>

export interface IEnvironment {
	/** unique and internally generated identifier -- will not be used for comparison but assists debugging for tracking identities */
	readonly id: number
	/** Lexical parent of the environment, if any (can be manipulated by R code) */
	parent:      IEnvironment
	/**
   * Maps to exactly one definition of an identifier if the source is known, otherwise to a list of all possible definitions
   */
	memory:      EnvironmentMemory
}

let environmentIdCounter = 0;

function defInEnv(newEnvironments: IEnvironment, name: string, definition: IdentifierDefinition) {
	const existing = newEnvironments.memory.get(name);
	// check if it is maybe or not
	if(existing === undefined || definition.controlDependencies === undefined) {
		newEnvironments.memory.set(name, [definition]);
	} else {
		existing.push(definition);
	}
}

export class Environment implements IEnvironment {
	readonly id;
	parent: IEnvironment;
	memory: Map<Identifier, IdentifierDefinition[]>;

	constructor(parent: IEnvironment, id?: number) {
		this.parent = parent;
		this.id = id ?? environmentIdCounter++;
		this.memory = new Map();
	}
}



/**
 * Insert the given `definition` --- defined within the given scope --- into the passed along `environments` will take care of propagation.
 * Does not modify the passed along `environments` in-place! It returns the new reference.
 */
export function define(definition: IdentifierDefinition, superAssign: boolean | undefined, environment: IREnvironmentInformation): IREnvironmentInformation {
	const name = definition.name;
	guard(name !== undefined, () => `Name must be defined, but isn't for ${JSON.stringify(definition)}`);
	let newEnvironment;
	if(superAssign) {
		newEnvironment = cloneEnvironmentInformation(environment, true);
		let current: IEnvironment = newEnvironment.current;
		let last = undefined;
		let found = false;
		do{
			if(current.memory.has(name)) {
				current.memory.set(name, [definition]);
				found = true;
				break;
			}
			last = current;
			current = current.parent;
		} while(current.id !== BuiltInEnvironment.id);
		if(!found) {
			guard(last !== undefined, () => `Could not find global scope for ${name}`);
			last.memory.set(name, [definition]);
		}
	} else {
		newEnvironment = cloneEnvironmentInformation(environment, false);
		defInEnv(newEnvironment.current, name, definition);
	}
	return newEnvironment;
}

/**
 * First of all, yes, R stores its environments differently, potentially even with a different differentiation between
 * the `baseenv`, the `emptyenv`and other default environments. Yet, during dataflow we want sometimes to know more (static
 * reference information) and sometimes know less (to be honest we do not want that,
 * but statically determining all attached environments is theoretically impossible --- consider attachments by user input).
 * One example would be maps holding a potential list of all definitions of a variable, if we do not know the execution path (like with `if(x) A else B`).
 */
export interface IREnvironmentInformation {
	/**  The currently active environment (the stack is represented by the currently active {@link IEnvironment#parent}). Environments are maintained within the dataflow graph. */
	readonly current: IEnvironment
	/** nesting level of the environment, will be `0` for the global/root environment */
	readonly level:   number
}

export class REnvironmentInformation implements IREnvironmentInformation {
	public readonly current: IEnvironment;
	public readonly level: number;

	/* TODO: Define the caches, as well as define/undefine/lookup functions here, additionally, take care of what is dumped when serialized! => maybe add a toJSON interface for the replacer! */
}


/* the built-in environment is the root of all environments */
export const BuiltInEnvironment = new Environment(undefined as unknown as IEnvironment);
BuiltInEnvironment.memory = undefined as unknown as EnvironmentMemory;

const EmptyBuiltInEnvironment: IEnvironment = {
	id:     BuiltInEnvironment.id,
	memory: undefined as unknown as EnvironmentMemory,
	parent: undefined as unknown as IEnvironment
};


export function initializeCleanEnvironments(fullBuiltIns = true): IREnvironmentInformation {
	BuiltInEnvironment.memory ??= BuiltInMemory;
	EmptyBuiltInEnvironment.memory ??= EmptyBuiltInMemory;
	return {
		current: new Environment(fullBuiltIns ? BuiltInEnvironment : EmptyBuiltInEnvironment),
		level:   0
	};
}

export function builtInEnvJsonReplacer(k: unknown, v: unknown): unknown {
	if(v === BuiltInEnvironment) {
		return '<BuiltInEnvironment>';
	} else if(v === EmptyBuiltInEnvironment) {
		return '<EmptyBuiltInEnvironment>';
	} else {
		return jsonReplacer(k, v);
	}
}


