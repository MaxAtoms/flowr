import type {
	IEnvironment,
	REnvironmentInformation
} from './environment';
import {
	Environment,
	BuiltInEnvironment
} from './environment';
import type { Identifier, IdentifierDefinition } from './identifier';

function cloneEnvironmentMemory(memory: Map<Identifier, IdentifierDefinition[]>): Map<Identifier, IdentifierDefinition[]> {
	return new Map(JSON.parse(JSON.stringify([...memory])) as [Identifier, IdentifierDefinition[]][]);
}

function cloneEnvironment(environment: IEnvironment, recurseParents: boolean): IEnvironment
function cloneEnvironment(environment: IEnvironment | undefined, recurseParents: boolean): IEnvironment | undefined {
	if(environment === undefined) {
		return undefined;
	} else if(environment.id === BuiltInEnvironment.id) {
		return BuiltInEnvironment;
	}
	/* make sure the clone has the same id */
	const clone = new Environment(recurseParents ? cloneEnvironment(environment.parent, recurseParents) : environment.parent, environment.id);
	clone.memory = cloneEnvironmentMemory(environment.memory);
	return clone;
}

export function cloneEnvironmentInformation(environment: REnvironmentInformation, recurseParents = true): REnvironmentInformation {
	return {
		current: cloneEnvironment(environment.current, recurseParents),
		level:   environment.level,
		/* caches are to be handled on invalidation */
		cache:   environment.cache
	};
}
