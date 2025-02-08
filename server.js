import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { HTTPRequest } from './HTTPRequest.js';
import { RequestCookieMap } from './RequestCookieMap.js';
import { HTTPError } from './HTTPError.js';
import { getFileURL, resolveStaticPath, respondWithFile, resolveModulePath } from './utils.js';

const _noop = () => null;

async function _open(url) {
	if (typeof url === 'string') {
		return await _open(URL.parse(url));
	} else if (! (url instanceof URL)) {
		throw new TypeError('URL must be a string or URL.');
	} else if (url.protocol === 'http:' || url.protocol === 'https:') {
		const { exec } = await import('node:child_process');
		const { promise, resolve, reject } = Promise.withResolvers();

		switch(process.platform) {
			case 'darwin':
				exec(`open "${url}"`, reject, resolve);
				break;

			case 'win32':
				exec(`start "${url}"`, reject, resolve);
				break;

			case 'linux':
				exec(`xdg-open "${url}"`, reject, resolve);
				break;

			default:
				reject(new Error(`Unspoorted platform: ${process.platform}.`));
		}

		return await promise;
	} else {
		throw new TypeError(`Invalid URL: ${url.href}`);
	}
}

/**
 *
 * @param {Response} resp
 * @param {ServerResponse} respMessage
 * @param {object} details
 * @param {Function[]} [details.responsePostprocessors]
 * @param {object} [details.context]
 * @param {Request} [details.request]
 */
async function _send(resp, respMessage, { responsePostprocessors = [], context = {}, request } = {}) {
	if (context.signal.aborted) {
		respMessage.destroy(context.signal.reason);
	} else if (resp instanceof Response) {
		// Skip handling responses from `Response.redirect()`, which are immutable
		if (!(resp.status > 299 && resp.status < 309 && resp.headers.has('Location'))) {
			await Promise.allSettled(responsePostprocessors.map(postProcessor => Promise.try(() => postProcessor(resp, { request, context }))));
		}

		if (! respMessage.headersSent) {
			resp.headers.forEach((value, key) => {
				if (key !== 'set-cookie') {
					respMessage.setHeader(key, value);
				}
			});

			resp.headers.getSetCookie().forEach(cookie => respMessage.appendHeader('Set-Cookie', cookie));
			respMessage.writeHead(resp.status === 0 ? 500 : resp.status, resp.statusText);
		}

		if (context.signal.aborted) {
			respMessage.destroy(context.signal.reason);
		} else if (respMessage.writable && resp.body instanceof ReadableStream) {
			const reader = resp.body.getReader();
			const cancel = reason => {
				if (resp.body.locked) {
					reader.closed.then(() => {
						resp.body.cancel(reason).catch(_noop);
					}).catch(_noop);

					reader.releaseLock();
				} else {
					resp.body.cancel(reason).catch(_noop);
				}
			};

			try {
				const signal = context.signal;
				signal.addEventListener('abort', ({ target }) => cancel(target.reason), { once: true });

				while (! signal.aborted && resp.body.locked) {
					const { done, value } = await reader.read();

					if (done) {
						reader.releaseLock();
						respMessage.end();
						resp.body.cancel('Done').catch(_noop);
						break;
					} else {
						respMessage.write(value);
					}
				}
			} catch(err) {
				respMessage.destroy(err);
				cancel(err);
			}
		} else {
			respMessage.end();
		}

	} else if (typeof resp === 'object') {
		const { headers: respHeaders = {}, body = null, status = 200, statusText } = resp;

		await _send(new Response(body, {
			status,
			statusText,
			headers: Array.isArray(respHeaders) ? Object.fromEntries(respHeaders) : respHeaders,
		}), respMessage, { responsePostprocessors, context, request });
	} else {
		await _send(new HTTPError('Invalid response.'), respMessage, { responsePostprocessors, context, request });
	}
}

/**
 * Starts a development server.
 *
 * @param {object} config Configuration options for the server.
 * @param {string} [config.hostname="localhost"] The hostname to listen on.
 * @param {string} [config.staticRoot="/"] The path to the directory containing static files.
 * @param {number} [config.port=8080] The port to listen on.
 * @param {string} [config.pathname="/"] The URL path to serve the application on.
 * @param {object} [config.routes={}] A map of URL patterns to route handlers.
 * @param {Function} [config.logger=console.error] A function to log messages.
 * @param {boolean} [config.open=false] Whether to open the application in the browser.
 * @param {Function[]} [config.requestPreprocessors] Functions run before request handling, capable of modifying context, logging, validating, or aborting requests.
 * @param {Function[]} [config.responsePostProcessors] Functions to modify a response after being created but before being sent.
 * @param {AbortSignal} [config.signal] A signal to abort the server.
 * @returns {Promise<{server: Server<typeof IncomingMessage, typeof ServerResponse>, url: string, whenServerClosed: Promise<void>}>} An object containing the server instance, the URL it is listening on, and a promise that resolves when the server is closed.
 */
export async function serve({
	hostname = 'localhost',
	staticRoot = '/',
	port = 8080,
	pathname = '/',
	routes = {},
	logger = console.error,
	open = false,
	requestPreprocessors = [],
	responsePostprocessors = [],
	signal: passedSignal,
} = {}) {
	const { promise: whenServerClosed, resolve: resolveClosed } = Promise.withResolvers();
	const url = new URL(pathname, `http://${hostname}:${port}`).href;
	const ROUTES = new Map(Object.entries(routes).map(([pattern, module]) => [new URLPattern(pattern, url), resolveModulePath(module)]));

	const server = createServer(async function(incomingMessage, serverResponse) {
		const controller = new AbortController();
		const signal = passedSignal instanceof AbortSignal
			? AbortSignal.any([passedSignal, controller.signal])
			: controller.signal;

		const request = HTTPRequest.createFromIncomingMessage(incomingMessage, { signal });
		const url = new URL(request.url);
		const fileURL = getFileURL(url, staticRoot);
		const pattern = ROUTES.keys().find(pattern => pattern.test(request.url));
		const cookies = new RequestCookieMap(request);
		const { resolve: resolveRequest, reject: rejectRequest, promise } = Promise.withResolvers();
		let settled = false;

		const resolve = result => {
			if (! settled) {
				resolveRequest(result);
				settled = true;
			}
		};

		const reject = reason => {
			if (! settled) {
				rejectRequest(reason);
				settled = true;

				if (! controller.signal.aborted) {
					controller.abort(reason);
				}
			}
		};

		const context = Object.freeze({
			url,
			matches: pattern instanceof URLPattern ? pattern.exec(request.url) : null,
			cookies, ip: incomingMessage.socket.remoteAddress,
			controller,
			signal: controller.signal,
			resolve,
			reject,
		});

		try {
			incomingMessage.socket.once('close', () => controller.abort('Socket closed'));
			signal.addEventListener('abort', () => incomingMessage.removeAllListeners(), { once: true });

			const hookErrs = await Promise.allSettled(requestPreprocessors.map(plugin => plugin(request, context)))
				.then(results => results.filter(result => result.status === 'rejected').map(result => result.reason));

			if (hookErrs.length === 1) {
				reject(hookErrs[0]);
			} else if (hookErrs.length !== 0) {
				reject(new AggregateError(hookErrs));
			} else if (controller.signal.aborted) {
				// Controller would be aborted if any of the pre-hooks aborted it.
				reject(controller.signal.reason);
			} else if (! settled && pattern instanceof URLPattern) {
				const moduleSpecifier = ROUTES.get(pattern);
				const module = await import(moduleSpecifier).catch(err => err);

				if (module instanceof Error) {
					reject(module);
				} else if (! (module.default instanceof Function)) {
					reject(HTTPError('There was an error handling the request.', {
						status: 500,
						cause: new Error(`${moduleSpecifier} is missing a default export.`),
					}));
				} else {
					const resp = await Promise.try(() => module.default(request, context)).catch(err => err);

					if (resp instanceof Response) {
						resolve(resp);
					} else if (resp instanceof URL) {
						resolve(Response.redirect(resp));
					} else if (resp instanceof Error) {
						reject(resp);
					} else {
						reject(new TypeError(`${moduleSpecifier} did not return a response.`));
					}
				}
			} else if (! settled && existsSync(fileURL)) {
				const resolved = await resolveStaticPath(fileURL.pathname);

				if (typeof resolved === 'string') {
					const resp = await respondWithFile(resolved);

					resolve(resp);
				} else {
					reject(new HTTPError(`<${request.url}> not found.`, { status: 404 }));
				}
			} else if (! settled) {
				reject(new HTTPError(`<${request.url}> not found.`, { status: 404 }));
			}
		} catch(err) {
			reject(err);
		}

		await promise
			.then(resp =>  _send(resp, serverResponse, { responsePostprocessors, request, context }))
			.catch(async err => {
				if (logger instanceof Function) {
					Promise.try(() => logger(err));
				}

				if (err instanceof HTTPError) {
					await _send(err.response, serverResponse, { responsePostprocessors, request, context });
				} else {
					await _send(new HTTPError('An unknown error occured', { cause: err, status: 500 }).response, serverResponse, { responsePostprocessors, context });
				}
			});
	});

	server.listen(port, hostname);

	if (passedSignal instanceof AbortSignal) {
		passedSignal.addEventListener('abort', () => server.close(), { once: true });
	}

	await new Promise(resolve =>  server.once('listening', resolve));
	server.once('close', resolveClosed);

	// Check if a given signal aborted during server start-up
	if (passedSignal instanceof AbortSignal && passedSignal.aborted) {
		server.close();

		throw passedSignal.reason;
	}

	if (open) {
		_open(url).catch(console.error);
	}

	return Object.freeze({ server, url, whenServerClosed });
}
