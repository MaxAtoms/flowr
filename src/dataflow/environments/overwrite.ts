import { guard } from '../../util/assert';
import type { REnvironmentInformation, IEnvironment } from './environment';
import {  Environment } from './environment';
import type { IdentifierDefinition } from './identifier';

function anyIsMaybeOrEmpty(values: readonly IdentifierDefinition[]): boolean {
	if(values.length === 0) {
		return true;
	}
	for(const val of values) {
		if(val.controlDependencies !== undefined) {
			return true;
		}
	}
	return false;
}

export function overwriteIEnvironmentWith(base: IEnvironment | undefined, next: IEnvironment | undefined): IEnvironment {
	guard(base !== undefined && next !== undefined, 'can not overwrite environments with undefined');
	const map = new Map(base.memory);
	for(const [key, values] of next.memory) {
		const hasMaybe = anyIsMaybeOrEmpty(values);
		if(hasMaybe) {
			const old = map.get(key) ?? [];
			// we need to make a copy to avoid side effects for old reference in other environments
			const updatedOld: IdentifierDefinition[] = [...old];
			for(const v of values) {
				const index = updatedOld.findIndex(o => o.nodeId === v.nodeId && o.definedAt === v.definedAt);
				if(index < 0) {
					updatedOld.push(v);
				}
			}
			map.set(key, updatedOld);
		} else {
			map.set(key, values);
		}
	}

	return new Environment(map);
}


export function overwriteEnvironment(base: REnvironmentInformation, next: REnvironmentInformation | undefined): REnvironmentInformation
export function overwriteEnvironment(base: REnvironmentInformation | undefined, next: REnvironmentInformation): REnvironmentInformation
export function overwriteEnvironment(base: undefined, next: undefined): undefined
export function overwriteEnvironment(base: REnvironmentInformation | undefined, next: REnvironmentInformation | undefined): REnvironmentInformation | undefined
/**
 * Assumes, that all definitions within next replace those within base (given the same name).
 * <b>But</b> if all definitions within next are maybe, then they are appended to the base definitions (updating them to be `maybe` from now on as well), similar to {@link appendEnvironment}.
 */
export function overwriteEnvironment(base: REnvironmentInformation | undefined, next: REnvironmentInformation | undefined): REnvironmentInformation | undefined {
	if(base === undefined) {
		return next;
	} else if(next === undefined) {
		return base;
	}
	guard(next.stack.length === base.stack.length, `cannot overwrite environments with differently nested local scopes, base ${base.stack.length} vs. next ${next.stack.length}. This should not happen.`);

	return {
		stack: base.stack.map((b, i) => overwriteIEnvironmentWith(b, next.stack[i]))
	};
}
