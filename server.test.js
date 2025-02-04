import { serve } from '@shgysk8zer0/http-server';
import { test, describe } from 'node:test';
import { deepStrictEqual, ok, strictEqual, fail } from 'node:assert';

const timeout = AbortSignal.timeout(60_000);

describe('Test HTTP server', { concurrency: 5, signal: timeout }, async () => {
	let port = 8000;
	const staticRoot = '/static/';
	const routes = {
		'/tasks': '@shgysk8zer0/http-server/api/tasks.js',
	};
	const controller = new AbortController();

	test('Test basic, static requests', { signal: timeout }, async () => {
		try {
			const signal = AbortSignal.any([timeout, controller.signal]);

			const { url, server } = await serve({
				port: port++,
				signal,
				staticRoot,
				logger: fail,
				routes,
			});

			const resp = await fetch(url, { signal });

			ok(resp.ok, 'Should respond with an http 2xx status code');
			strictEqual(resp.headers.get('Content-Type'), 'text/html', 'Response should have the correct content-type.');
			server.close();
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Test 404 responses', { signal: timeout }, async () => {
		const signal = AbortSignal.any([timeout, controller.signal]);

		try {
			const { url, server } = await serve({
				port: port++,
				signal,
				staticRoot,
				logger: null, // Expected to error in 404
				routes,
			});

			const resp = await fetch(new URL('./dne', url), { signal });

			ok(! resp.ok, 'Invalid URLs should not have an ok status code.');
			strictEqual(resp.status, 404, 'Invalid URLs should have a status code of 404.');
			server.close();
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Test dynamic route.', { signal: timeout }, async () => {
		try {
			const signal = AbortSignal.any([timeout, controller.signal]);

			const { url, server } = await serve({
				port: port++,
				signal,
				staticRoot,
				logger: fail,
				routes,
			});

			const tasksURL = new URL('./tasks', url);
			const task = { title: 'Test Task', description: 'Test dynamic route handling' };
			const { id, created, completed } = await fetch(tasksURL, {
				method: 'POST',
				body: JSON.stringify(task),
				signal,
			}).then(resp => resp.json());

			const resp = await fetch(tasksURL, { signal });
			const tasks = await resp.json();
			deepStrictEqual(tasks, [{ id, created, completed, ...task }], 'Dynamic routes should work.');
			server.close();
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});
});
