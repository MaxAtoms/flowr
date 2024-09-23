import type { REnvironmentInformation } from './environment';
import { Environment } from './environment';
import { guard } from '../../util/assert';

/** Add a new local environment scope to the stack, returns the modified variant - sharing the original environments in the stack (no deep-clone) */
export function pushLocalEnvironment(base: REnvironmentInformation): REnvironmentInformation {
	return {
		stack: [new Environment(), ...base.stack]
	};
}

export function popLocalEnvironment(base: REnvironmentInformation): REnvironmentInformation {
	guard(base.stack.length > 0, 'cannot remove the global/root environment');
	return {
		stack: base.stack.slice(1)
	};
}
