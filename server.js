import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { HTTPRequest } from './HTTPRequest.js';
import { RequestCookieMap } from './RequestCookieMap.js';
import { HTTPError } from './HTTPError.js';
import { getFileURL, resolveStaticPath, respondWithFile, resolveModulePath } from './utils.js';

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
 * @param {object} headers
 */
async function _send(resp, respMessage, headers = {}) {
	if (resp instanceof Response) {

		if (! respMessage.headersSent) {
			resp.headers.forEach((value, key) => {
				if (key !== 'set-cookie') {
					respMessage.setHeader(key, value);
				}
			});

			Object.entries(headers).forEach(([name, val]) => {
				if (! resp.headers.has(name)) {
					respMessage.setHeader(name, val);
				}
			});

			resp.headers.getSetCookie().forEach(cookie => respMessage.appendHeader('Set-Cookie', cookie));
			respMessage.writeHead(resp.status, resp.statusText);
		}

		if (respMessage.writable && resp.body instanceof ReadableStream) {
			for await (const chunk of resp.body) {
				respMessage.write(chunk);
			}
		}

		respMessage.end();
	} else if (typeof resp === 'object') {
		const { headers: respHeaders = {}, body = null, status = 200, statusText } = resp;

		await _send(new Response(body, {
			status,
			statusText,
			headers: Array.isArray(respHeaders) ? Object.fromEntries(respHeaders) : respHeaders,
		}), respMessage, headers);
	} else {
		throw new TypeError('Response must be a `Response` or regular object.');
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
 * @param {object} [config.headers] Optional headers to append to responses.
 * @param {Function} [config.logger=console.error] A function to log messages.
 * @param {boolean} [config.launch=false] Whether to open the application in the browser.
 * @param {AbortSignal} [config.signal] A signal to abort the server.
 * @returns {Promise<{server: Server<typeof IncomingMessage, typeof ServerResponse>, url: string, whenServerClosed: Promise<void>}>} An object containing the server instance, the URL it is listening on, and a promise that resolves when the server is closed.
 */
export async function serve({
	hostname = 'localhost',
	staticRoot = '/',
	port = 8080,
	pathname = '/',
	routes = {},
	headers = {},
	logger = console.error,
	launch = false,
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

		try {
			incomingMessage.once('close', () => setTimeout(() => controller.abort(incomingMessage.errored), 100));
			signal.addEventListener('abort', () => incomingMessage.removeAllListeners(), { once: true });
			const req = HTTPRequest.createFromIncomingMessage(incomingMessage, { signal });
			const url = new URL(req.url);
			const fileURL = getFileURL(url, staticRoot);
			const pattern = ROUTES.keys().find(pattern => pattern.test(req.url));
			console.info(`${req.method} <${req.url}>`);

			if (pattern instanceof URLPattern) {
				const moduleSpecifier = ROUTES.get(pattern);
				const module = await import(moduleSpecifier).catch(err => err);

				if (module instanceof Error) {
					throw module;
				} else if (! (module.default instanceof Function)) {
					throw new HTTPError('There was an error handling the request.', {
						status: 500,
						cause: new Error(`${moduleSpecifier} is missing a default export.`),
					});
				} else {
					const resp = await Promise.try(() => module.default(req, {
						matches: pattern.exec(req.url),
						ip: incomingMessage.socket.remoteAddress,
						cookies: new RequestCookieMap(req),
						pattern,
						controller,
					})).catch(err => err);

					if (resp instanceof Response) {
						await _send(resp, serverResponse, headers);
					} else if (resp instanceof URL) {
						return _send(Response.redirect(resp));
					} else if (resp instanceof Error) {
						throw resp;
					} else {
						throw new TypeError(`${moduleSpecifier} did not return a response.`);
					}
				}
			} else if (existsSync(fileURL)) {
				const resolved = await resolveStaticPath(fileURL.pathname);

				if (typeof resolved === 'string') {
					const resp = await respondWithFile(resolved);
					await _send(resp, serverResponse, headers);
				} else {
					throw new HTTPError(`<${req.url}> not found.`, { status: 404 });
				}
			} else {
				throw new HTTPError(`<${req.url}> not found.`, { status: 404 });
			}
		} catch(err) {
			if (logger instanceof Function) {
				Promise.try(() => logger(err));
			}

			if (err instanceof HTTPError) {
				await _send(err.response, serverResponse, headers);
			} else {
				await _send(new HTTPError('An unknown error occured', { cause: err, status: 500 }), serverResponse, headers);
			}
		}
	});

	server.listen(port, hostname);

	if (passedSignal instanceof AbortSignal) {
		passedSignal.addEventListener('abort', () => server.close(), { once: true });
	}

	await new Promise(resolve =>  server.once('listening', resolve));
	server.once('close', resolveClosed);

	// Check if a given signal abouted during server start-up
	if (passedSignal instanceof AbortSignal && passedSignal.aborted) {
		server.close();

		throw passedSignal.reason;
	}

	if (launch) {
		_open(url).catch(console.error);
	}

	return Object.freeze({ server, url, whenServerClosed });
}
