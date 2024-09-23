import { guard } from '../../util/assert';
import type { REnvironmentInformation, IEnvironment } from './environment';
import { Environment } from './environment';
import type { IdentifierDefinition } from './identifier';

function uniqueMergeValues(old: readonly IdentifierDefinition[], value: readonly IdentifierDefinition[]): IdentifierDefinition[] {
	const result = [...old];
	for(const v of value) {
		const find = result.findIndex(o => o.nodeId === v.nodeId && o.definedAt === v.definedAt);
		if(find < 0) {
			result.push(v);
		}
	}
	return result;
}

function appendIEnvironmentWith(base: IEnvironment | undefined, next: IEnvironment | undefined): IEnvironment {
	guard(base !== undefined && next !== undefined, 'can not append environments with undefined');
	const map = new Map(base.memory);
	for(const [key, value] of next.memory) {
		const old = map.get(key);
		if(old) {
			map.set(key, uniqueMergeValues(old, value));
		} else {
			map.set(key, value);
		}
	}

	return new Environment(map);
}


/**
 * Adds all writes of `next` to `base` (i.e., the operations of `next` *might* happen).
 */
export function appendEnvironment(base: REnvironmentInformation, next: REnvironmentInformation | undefined): REnvironmentInformation
export function appendEnvironment(base: REnvironmentInformation | undefined, next: REnvironmentInformation): REnvironmentInformation
export function appendEnvironment(base: undefined, next: undefined): undefined
export function appendEnvironment(base: REnvironmentInformation | undefined, next: REnvironmentInformation | undefined): REnvironmentInformation | undefined
export function appendEnvironment(base: REnvironmentInformation | undefined, next: REnvironmentInformation | undefined): REnvironmentInformation | undefined {
	if(base === undefined) {
		return next;
	} else if(next === undefined) {
		return base;
	}
	guard(base.stack.length === next.stack.length, 'environments must have the same level to be handled, it is up to the caller to ensure that');

	return {
		stack: base.stack.map((b, i) => appendIEnvironmentWith(b, next.stack[i]))
	};
}
