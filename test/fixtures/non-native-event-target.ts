import assert from 'node:assert/strict';
import {setMaxListeners} from 'node:events';

// Delegate the event behavior, but keep the wrapper itself unbranded, like a DOM
// EventTarget supplied by jsdom alongside Node's process and builtin modules.
const NativeEventTarget = globalThis.EventTarget;
class DomEventTarget {
	#target = new NativeEventTarget();

	addEventListener(...arguments_: Parameters<EventTarget['addEventListener']>) {
		this.#target.addEventListener(...arguments_);
	}

	removeEventListener(...arguments_: Parameters<EventTarget['removeEventListener']>) {
		this.#target.removeEventListener(...arguments_);
	}

	dispatchEvent(event: Event) {
		return this.#target.dispatchEvent(event);
	}
}

globalThis.EventTarget = DomEventTarget;
assert.throws(() => setMaxListeners(Infinity, new DomEventTarget()), {code: 'ERR_INVALID_ARG_TYPE'});

// Import after replacing EventTarget, so PQueue extends the non-Node class.
const {default: PQueue} = await import('../../source/index.js');
const queue = new PQueue({concurrency: 1, autoStart: false});
const completed: unknown[] = [];
queue.addEventListener('completed', event => {
	completed.push(event.detail);
});

const tasks = [
	queue.add(() => 'regular'),
	queue.add(() => 'urgent', {priority: 10}),
];
queue.start();
assert.deepEqual(await Promise.all(tasks), ['regular', 'urgent']);
await queue.onIdle();
assert.deepEqual(completed, ['urgent', 'regular']);
assert.equal(queue.pending, 0);
assert.equal(queue.size, 0);

queue.pause();
const controller = new AbortController();
const reason = new Error('cancelled before starting');
const cancelled = queue.add(() => assert.fail('The cancelled task must not run'), {signal: controller.signal});
controller.abort(reason);
await assert.rejects(cancelled, error => error === reason);
assert.equal(queue.size, 0);
queue.start();
await queue.onIdle();
