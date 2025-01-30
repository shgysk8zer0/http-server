import { serve } from '@aegisjsproject/http-server';
import { test, describe } from 'node:test';
import { deepStrictEqual, ok, strictEqual } from 'node:assert';


// const signal = AbortSignal.timeout(1000);
const signal = new AbortController().signal;

describe('Test HTTP server', async () => {
	const { url } = await serve({
		signal,
		staticRoot: '/static/',
		logger: null,
		routes: {
			'/tasks': '@aegisjsproject/http-server/api/tasks.js',
		}
	});

	test('Test basic, static requests', { signal }, async () => {
		const resp = await fetch(url, { signal });

		ok(resp.ok, 'Should respond with an http 2xx status code');
		strictEqual(resp.headers.get('Content-Type'), 'text/html', 'Response should have the correct content-type.');
	});

	test('Test 404 responses', { signal }, async () => {
		const resp = await fetch(new URL('./dne', url), { signal });

		ok(! resp.ok, 'Invalid URLs should not have an ok status code.');
		strictEqual(resp.status, 404, 'Invalid URLs should have a status code of 404.');
	});

	test('Test dynamic route.', { signal }, async () => {
		const tasksURL = new URL('./tasks', url);
		const task = { title: 'Test Task', description: 'Test dynamic route handling' };
		const { id, created, completed } = await fetch(tasksURL, {
			method: 'POST',
			body: JSON.stringify(task),
			signal,
		}).then(resp => resp.json());

		const resp = await fetch(tasksURL);
		const tasks = await resp.json();
		deepStrictEqual(tasks, [{ id, created, completed, ...task }], 'Dynamic routes should work.');
	});
});
