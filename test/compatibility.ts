import process from 'node:process';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import events, {getMaxListeners} from 'node:events';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import PQueue from '../source/index.js';

test('works with a non-Node EventTarget when Node builtins are available', () => {
	const fixture = fileURLToPath(new URL('fixtures/non-native-event-target.ts', import.meta.url));
	const {error, status, stderr} = spawnSync(process.execPath, ['--import=tsx/esm', fixture], {encoding: 'utf8'});

	assert.ifError(error);
	assert.equal(status, 0, stderr);
});

test('keeps the unlimited listener setting for Node EventTarget', () => {
	assert.equal(getMaxListeners(new PQueue()), Infinity);
});

test('does not hide unexpected errors from the listener-limit helper', t => {
	const error = new Error('unexpected listener-limit failure');
	t.mock.method(events, 'setMaxListeners', () => {
		throw error;
	});

	t.assert.throws(() => new PQueue(), actual => actual === error);
});
