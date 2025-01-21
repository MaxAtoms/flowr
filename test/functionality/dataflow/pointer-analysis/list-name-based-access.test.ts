import { describe } from 'vitest';
import { assertDataflow, withShell } from '../../_helper/shell';
import { emptyGraph } from '../../../../src/dataflow/graph/dataflowgraph-builder';
import { label } from '../../_helper/label';

describe.sequential('List Name Based Access', withShell(shell => {
	const basicCapabilities = ['name-normal', 'function-calls', 'named-arguments', 'dollar-access', 'subsetting-multiple'] as const;

	describe('Access named argument', () => {
		assertDataflow(
			label('Assert reads edge to named argument', basicCapabilities),
			shell,
			`person <- list(age = 24, name = "John")
person$name`,
			emptyGraph()
				.defineVariable('1@person')
				.reads('2@person', '1@person')
				.reads('2@$', '7'),
			{
				expectIsSubgraph:      true,
				resolveIdsAsCriterion: true,
			}
		);
	});
}));
