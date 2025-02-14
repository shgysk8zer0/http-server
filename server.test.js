import { serve } from '@shgysk8zer0/http-server';
import { test, describe } from 'node:test';
import { deepStrictEqual, ok, strictEqual, fail } from 'node:assert';
import { checkCacheItem, setCacheItem } from '@shgysk8zer0/http-server/cache.js';
import net from 'node:net';

const timeout = AbortSignal.timeout(10_000);
const controller = new AbortController();
const signal = AbortSignal.any([timeout, controller.signal]);

describe('Test HTTP server', { concurrency: true, signal }, async () => {
	let port = 8001;
	const staticRoot = '/static/';
	const routes = {
		'/': '@shgysk8zer0/http-server/api/home.js',
		'/tasks': '@shgysk8zer0/http-server/api/tasks.js',
		'/echo': '@shgysk8zer0/http-server/api/echo.js',
		'/error': () => Response.error(),
		'/text': req => req.text().then(text => new Response(text, { headers: { 'Content-Type': 'text/plain' }})),
	};

	const requestPreprocessors = [checkCacheItem];
	const responsePostprocessors = [setCacheItem];

	test('Test basic, static requests', { signal }, async () => {
		try {
			const { url, server } = await serve({
				port: port++,
				signal,
				staticRoot,
				logger: fail,
				routes,
			});

			ok(server.listening, 'Server should start correctly.');

			const resp = await fetch(url, { signal });

			ok(resp.ok, 'Should respond with an http 2xx status code');
			strictEqual(resp.headers.get('Content-Type'), 'text/html', 'Response should have the correct content-type.');
			server.close();
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Ensure that server shuts down correctly.', { signal }, async () => {
		try {
			const { server } = await serve({ signal });

			server.close();
			ok(! server.listening, 'Server should close correctly.');
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Ensure that server shuts down on signal abort.', { signal }, async () => {
		try {
			const controller = new AbortController();
			const { server } = await serve({ signal: AbortSignal.any([signal, controller.signal]) });

			controller.abort('Shut down!');
			ok(! server.listening, 'Server should close correctly on signal abort.');
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Test 404 responses', { signal: timeout }, async () => {
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

	test('Test 500 responses', { signal: timeout }, async () => {
		try {
			const { url, server } = await serve({
				port: port++,
				signal,
				staticRoot,
				logger: null, // Expected to error in 500
				routes,
			});

			const resp = await fetch(new URL('./error', url), { signal });

			ok(! resp.ok, 'Invalid URLs should not have an ok status code.');
			strictEqual(resp.status, 500, 'Invalid URLs should have a status code of 500.');
			server.close();
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Test dynamic route.', { signal: timeout }, async () => {
		try {
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

	test('Check pre/post processors.', { signal: timeout }, async () => {
		try {
			const { url, server } = await serve({
				port: port++,
				signal,
				staticRoot,
				logger: null,
				routes,
				requestPreprocessors: [
					(req, { reject }) => {
						if (req.headers.has('X-Foo')) {
							reject(new Error('That is not allowed.'));
						}
					}
				],
				responsePostprocessors: [
					resp => resp.headers.set('Access-Control-Allow-Origin', '*'),
				]
			});

			const allowed = await fetch(url);
			const blocked = await fetch(url, { headers: { 'X-Foo': 'bar' }});
			ok(allowed.ok, '`requestPreprocessors` should allow valid requests.');
			ok(! blocked.ok, '`requestPreprocessors` should not allow invalid requests.');
			strictEqual(allowed.headers.get('Access-Control-Allow-Origin'), '*', '`responsePostprocessors` should add CORS headers to allowed requests.');
			strictEqual(blocked.headers.get('Access-Control-Allow-Origin'), '*', '`responsePostprocessors` should add CORS headers to disallowed requests.');
			server.close();
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Verify that server does not crash if signal aborts.', { signal: timeout }, async () => {
		try {
			const { url, server } = await serve({
				port: port++,
				signal,
				staticRoot,
				logger: null,
				routes,
				requestPreprocessors: [
					(req, { controller }) => {
						controller.abort('Just testing...');
					}
				]
			});

			const resp = await fetch(url, { signal: controller.signal });
			strictEqual(resp.status, 408, 'Aborted requests should have a 4xx status code.');
			strictEqual(resp.headers.get('Content-Type'), 'application/json', 'Aborted requests should should respond with an error as JSON.');
			server.close();
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Check that it handles multiple concurrent requests.', { signal: timeout }, async () => {
		try {
			const reqCount = 100;

			const { url, server } = await serve({
				port: port++,
				signal,
				staticRoot,
				logger: fail,
				routes,
				requestPreprocessors,
				responsePostprocessors,
			});

			const reqs = Array(reqCount).fill(null).map(() => new Request(url));
			const resps = await Promise.all(reqs.map(req => fetch(req)));

			ok(resps.every(resp => resp.ok), 'Concurrent requests should be handled without error and have a status of 2xx.');
			server.close();
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Test slow request.', { signal }, async () => {
		try {
			const { url, server } = await serve({
				pathname: '/echo',
				port: port++,
				signal,
				staticRoot,
				logger: null,
				routes,
				requestPreprocessors,
				responsePostprocessors,
				timeout: 10,
			});

			const body = new ReadableStream({
				async start(controller) {
					const bytes = new TextEncoder().encode('Testing request timeout...');

					for (let n = 0; n < bytes.length; n++) {
						const chunk = await new Promise(resolve => setTimeout(() => resolve(bytes.subarray(n, n + 1)), 100));
						controller.enqueue(chunk);
					}

					controller.close();
				}
			});

			const resp = await fetch(url, {
				headers: { 'Content-Type': 'text/plain' },
				method: 'POST',
				duplex: 'half',
				body,
				signal,
			}).catch(() => Response.error());

			strictEqual(resp.status, 408, 'Connection should timeout.');
			server.close();
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Check requests with large payloads', { signal }, async () => {
		try {
			const blob = new Blob([Uint8Array.from({ length: 1024 * 1024})], { type: 'application/octet-stream'});
			const { url, server } = await serve({
				pathname: '/echo',
				port: port++,
				signal,
				staticRoot,
				logger: null,
				routes,
				requestPreprocessors,
				responsePostprocessors,
				timeout: 3_000,
			});

			const resp = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': blob.type },
				duplex: 'half',
				body: blob.stream(),
				signal,
			});

			ok(resp.ok, 'Large payloads should be handled correctly.');
			server.close();
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Test Invalid HTTP Version', { signal }, async () => {
		try {
			const { url, server } = await serve({ port: port++, signal, logger: null, routes });
			const reqURL = new URL(url);
			// Directly using socket to send raw TCP data for version testing
			let data = '';

			const client = net.connect({ port: reqURL.port, host: reqURL.hostname }, () => {
				client.write(`GET / HTTP/1.000\r\nHost: ${reqURL.host}\r\n\r\n`);
			});


			for await (const chunk of client) {
				data += chunk.toString();
				break; // Only need the first chunk with headers
			}
			client.destroy();
			ok(data.startsWith('HTTP/1.1 400'), 'Should respond with 400 for invalid HTTP version.');
			server.close();
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Test requests with invalid methods.', { signal }, async () => {
		try {
			const { url, server } = await serve({ port: port++, signal, logger: null, routes });
			const resp = await fetch(url, { method: 'DNE' }).catch(() => Response.error());
			ok(! resp.ok, 'Invalid request methods should error.');
			server.close();
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Test Missing Host Header', { signal }, async () => {
		try {
			const { url, server } = await serve({ port: port++, signal, routes, logger: null });
			const reqURL = new URL(url);
			let data = '';

			const client = net.connect({ port: reqURL.port, host: reqURL.hostname }, () => {
				client.write('GET / HTTP/1.1\r\n\r\n'); // No Host header included
			});

			for await (const chunk of client) {
				data += chunk.toString();
				break; // Only need the first chunk with headers
			}

			client.destroy();
			ok(data.startsWith('HTTP/1.1 400'), 'Should respond with 400 for missing Host header.');
			server.close();
		} catch (err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Test Invalid Chars in HTTP', { signal }, async () => {
		try {
			const { url, server } = await serve({ port: port++, signal, routes, logger: null });
			const reqURL = new URL(url);
			let data = '';

			const client = net.connect({ port: reqURL.port, host: reqURL.hostname }, () => {
				client.write('GET abc!<@#$%^&*()"\' HTTP/1.1\r\nHost: ${reqURL.host}\r\n\r\n'); // Invalid chars in URL
			});

			for await (const chunk of client) {
				data += chunk.toString();
				break;
			}

			client.destroy();
			ok(data.startsWith('HTTP/1.1 400'), 'Should respond with 400 for invalid URL.');
			server.close();
		} catch (err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Test Invalid Newlines in HTTP', { signal }, async () => {
		try {
			const { url, server } = await serve({ port: port++, signal, routes, logger: null });
			const reqURL = new URL(url);
			let data = '';

			const client = net.connect({ port: reqURL.port, host: reqURL.hostname }, () => {
				client.write('GET / HTTP/1.1\nHost: ${reqURL.host}\r\n\r\n'); // Invalid newline
			});

			for await (const chunk of client) {
				data += chunk.toString();
				break;
			}

			client.destroy();
			ok(data.startsWith('HTTP/1.1 400'), 'Should respond with 400 for invalid newline.');
			server.close();
		} catch (err) {
			controller.abort(err);
			fail(err);
		}
	});

	test('Test Handling of Compressed Requests.', { signal }, async () => {
		try {
			const { url, server } = await serve({ port: port++, signal, routes, pathname: '/text', logger: fail });
			const body = new ReadableStream({
				start(controller) {
					controller.enqueue('Hello, World!');
					controller.close();
				}
			}).pipeThrough(new TextEncoderStream()).pipeThrough(new CompressionStream('gzip'));

			const resp = await fetch(url, { method: 'PUT', body, duplex: 'half', headers: { 'Content-Type': 'text/plain', 'Content-Encoding': 'gzip' }});
			strictEqual(await resp.text(), 'Hello, World!', 'Compressed request bodies should be supported.');
			server.close();
		} catch(err) {
			controller.abort(err);
			fail(err);
		}
	});
});
