import type { IdentifierDefinition } from './identifier';
import { guard } from '../../util/assert';
import type { IEnvironment, REnvironmentInformation } from './environment';


function defInEnv(newEnvironments: IEnvironment, name: string, definition: IdentifierDefinition) {
	const existing = newEnvironments.memory.get(name);
	// check if it is maybe or not
	if(existing === undefined || definition.controlDependencies === undefined) {
		newEnvironments.memory.set(name, [definition]);
	} else {
		newEnvironments.memory.set(name, [...existing, definition]);
	}
}

/**
 * Insert the given `definition` --- defined within the given scope --- into the passed along `environments` will take care of propagation.
 * Does not modify the passed along `environments` in-place! It returns the new reference.
 */
export function define(definition: IdentifierDefinition, superAssign: boolean | undefined, environment: REnvironmentInformation): REnvironmentInformation {
	const { name } = definition;
	guard(name !== undefined, () => `Name must be defined, but isn't for ${JSON.stringify(definition)}`);
	if(superAssign) {
		let found = false;
		for(const elem of environment.stack.slice(0,-1)) {
			/* TODO: copy? */
			if(elem.memory.has(name)) {
				elem.memory.set(name, [definition]);
				found = true;
				break;
			}
		}
		if(!found) {
			const last = environment.stack[environment.stack.length - 1];
			guard(last !== undefined, () => `Could not find global scope for ${name}`);
			last.memory.set(name, [definition]);
		}
	} else {
		/* TODO: copy? */
		defInEnv(environment.stack[0], name, definition);
	}
	return environment;
}



