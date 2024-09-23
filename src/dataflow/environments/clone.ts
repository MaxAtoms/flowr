import type {
	IEnvironment,
	REnvironmentInformation
} from './environment';
import {
	Environment,
	BuiltInEnvironment
} from './environment';
import type { Identifier, IdentifierDefinition } from './identifier';

function cloneEnvironment(environment: IEnvironment): IEnvironment
function cloneEnvironment(environment: IEnvironment | undefined): IEnvironment | undefined {
	if(environment === undefined || environment.id === BuiltInEnvironment.id) {
		return environment;
	}
	/* TODO: no deep copy? */
	const mem = new Map(JSON.parse(JSON.stringify([...environment.memory])) as [Identifier, IdentifierDefinition[]][]);
	/* make sure the clone has the same id */
	return new Environment(mem, environment.id);
}

export function cloneEnvironmentInformation(environment: REnvironmentInformation, recurseParents = true): REnvironmentInformation {
	return {
		stack: recurseParents ? environment.stack.map(cloneEnvironment) : [cloneEnvironment(environment.stack[0]), ...environment.stack.slice(1)]
	};
}
