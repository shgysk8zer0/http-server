import '@shgysk8zer0/polyfills'; // Adds polyfills for eg `Promise.try()`, `URLPattern`, `URL.parse` and `URL.canParse`, etc... All new APIs in JS.
import { createServer } from 'node:http';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

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

// Have to extend `Request` since setting `destination` and `mode` in `RequestInit` throws, but we can use headers
export class HTTPRequest extends Request {
	get cache() {
		switch(this.headers.get('Cache-Control')) {
			case 'no-store':
				return 'no-store';

			case 'no-cache':
				return 'no-cache';

			default:
				return 'default';
		}

	}
	get credentials() {
		return this.headers.has('Cookie') ? 'include' : 'omit';
	}

	get destination() {
		return this.headers.get('Sec-Fetch-Dest') ?? 'empty';
	}

	get mode() {
		return this.headers.get('Sec-Fetch-Mode') ?? 'no-cors';
	}

	get priority() {
		if (! this.headers.has('Priority')) {
			return 'auto';
		} else {
			const priority = this.headers.get('Priority');
			const index = priority.indexOf('u=');

			if (index === -1) {
				return 'auto';
			} else {
				// @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Priority
				switch (parseInt(priority[index + 2])) {
					case 0:
					case 1:
					case 2:
						return 'high';

					case 3:
					case 4:
						return 'auto';

					case 5:
					case 6:
					case 7:
						return 'low';

					default: return 'auto';
				}
			}
		}
	}

	/**
	 * Creates a request using node's `IncomingMessage`
	 *
	 * @param {IncomingMessage} message
	 * @param {object} [options]
	 * @param {AbortSignal} [options.signal]
	 * @return {HTTPRequest}
	 */
	static createFromIncomingMessage(req, { signal } = {}) {
		const body = _getBody(req);

		return new HTTPRequest(URL.parse(req.url, 'http://' + req.headers.host)?.href, {
			headers: req.headers,
			body, // null or a readable stream
			method: req.method,
			referrer: typeof req.headers.referer === 'string' && URL.canParse(req.headers.referer) ? req.headers.referer : 'about:client',
			signal,
			duplex: body instanceof ReadableStream ? 'half' : undefined,
		});
	}
}

export class HTTPError extends Error {
	#status = 0;
	#headers;

	constructor(message, status = 500, { headers, cause }) {
		if (! Number.isSafeInteger(status) && status > 0 && status < 600) {
			throw new TypeError(`Invalid status: ${status}.`);
		} {
			super(message, { cause });
			this.#status = status;

			if (headers instanceof Headers) {
				this.#headers = headers;
			} else {
				this.#headers = new Headers(headers);
			}
		}
	}

	[Symbol.toStringTag]() {
		return 'HTTPError';
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			status: this.#status,
			headers: Object.fromEntries(this.#headers),
		};
	}

	get name() {
		return 'HTTPError';
	}

	get headers() {
		return this.#headers;
	}

	get status() {
		return this.#status;
	}

	get response() {
		return Response.json({
			error: this,
		}, {
			status: this.#status,
			headers: this.#headers,
		});
	}

	static async from(resp) {
		if (! (resp instanceof Response)) {
			throw new TypeError('Cannot create an HTTPError without a Response.');
		} else {
			const { error: { status, headers, message }} = await resp.json();

			return new HTTPError(message, status, { headers });
		}
	}
}

function _createErrorHandler(resp, controller, logger) {
	return logger instanceof Function
		? async (err, { status = 500, headers = { 'Content-Type': 'text/plain' }} = {}) => {
			Promise.try(() => logger(err));
			controller.abort(err);
			return _sendError(err, resp, { status, headers });
		}
		: async (err, { status = 500, headers = { 'Content-Type': 'text/plain' }} = {}) => {
			controller.abort(err);
			return _sendError(err, resp, { status, headers });
		};
}

export function getContentType(path) {
	switch(path.toLowerCase().split('.').at(-1)) {
		case 'html':
			return 'text/html';

		case 'js':
			return 'application/javascript';

		case 'css':
			return 'text/css';

		case 'jpeg':
			return 'image/jpeg';

		case 'png':
			return 'image/png';

		case 'svg':
			return 'image/svg+xml';

		case 'txt':
			return 'text/plain';

		default:
			return 'application/octet-stream';
	}
}

/**
 *
 * @param {IncomingMessage} req
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {ReadableStream|null}
 */
function _getBody(req, { signal: passedSignal } = {}) {
	if (typeof req.headers['content-type'] !== 'string' || ['HEAD', 'DELETE', 'GET'].includes(req.method)) {
		return null;
	} else {
		const abortCtrl = new AbortController();
		const signal = passedSignal instanceof AbortSignal
			? AbortSignal.any([passedSignal, abortCtrl.signal])
			: abortCtrl.signal;

		const stream = new ReadableStream({
			start(controller) {
				const enqueue = controller.enqueue.bind(controller);
				const close = controller.close.bind(controller);

				req.on('data', enqueue);
				req.once('end', close);

				signal.addEventListener('abort', ({ target }) => {
					if (! abortCtrl.signal.aborted) {
						abortCtrl.abort(target.reason);
					}

					req.off('data', enqueue);
					req.off('end', close);
					controller.error(target.reason);
					controller.close();
				});
			}
		});

		return typeof req.headers['content-encoding'] === 'string' && ['gzip', 'deflate'].includes(req.headers['content-encoding'])
			? stream.pipeThrough(new DecompressionStream(req.headers['content-encoding']), { signal })
			: stream;
	}
}

async function _send(resp, respMessage) {
	if (resp instanceof Response) {
		respMessage.writeHead(resp.status, Object.fromEntries(resp.headers));

		if (resp.body instanceof ReadableStream) {
			for await (const chunk of resp.body) {
				respMessage.write(chunk);
			}
		}

		respMessage.end();
	} else if (typeof resp === 'object') {
		const { headers = {}, body = null, status = 200 } = resp;
		await _send(new Response(body, {
			status,
			headers: Array.isArray(headers) ? Object.fromEntries(headers) : headers,
		}), respMessage);
	} else {
		throw new TypeError('Response must be a `Response` or regular object.');
	}
}

async function _sendError(err, respMessage, {
	status = 500,
	headers = { 'Content-Type': 'text/plain' },
} = {}) {
	return await _send(new Response(err.message, {
		status,
		headers,
	}), respMessage);
}

/**
 *
 * @param {string} path
 * @param {string} base
 * @returns {ReadableStream}
 */
export const getFileStream = (path, base = `file://${process.cwd()}/`) => new ReadableStream({
	async start(controller) {
		try {
			const url = URL.parse(path, base);

			if (! (url instanceof URL) || url.protocol !== 'file:') {
				throw new Error('Invalid file path.');
			} else {
				const { createReadStream } = await import('node:fs');
				const fileStream = createReadStream(url.pathname);

				for await (const chunk of fileStream) {
					controller.enqueue(chunk);
				}
			}
		} catch(err) {
			controller.error(err);
		} finally {
			controller.close();
		}
	}
});

/**
 *
 * @param {string} path
 * @param {object} [options]
 * @param {string} [options.base]
 * @param {string|null} [options.compression=null]
 * @returns {Promise<Response>}
 */
export async function respondWithFile(path, {
	base = `file://${process.cwd()}/`,
	compression = null,
	...headers
} = {}) {
	const stream = getFileStream(path, base);

	if (typeof compression === 'string') {
		return new Response(stream.pipeThrough(new CompressionStream(compression), {
			headers: {
				'Content-Type': getContentType(path),
				'Content-Encoding': compression,
				...headers,
			}
		}));
	} else {
		return new Response(stream, {
			headers: {
				'Content-Type': getContentType(path),
				...headers,
			},
		});
	}
}


/**
 * Creates a `file:` URL relative from the `pathname` of a URL, relative to project root.
 *
 * @param {string|URL} url The URL to resolve using `pathname`.
 * @param {string} [root="/"] The root directory, relative to the project root/working directory.
 * @returns {URL} The resolved file URL (`file:///path/to/project/:root/:pathname`).
 * @throws {TypeError} If `url` is not a string or URL.
 */
export function getFileURL(url, root = '/') {
	if (typeof url === 'string') {
		return getFileURL(URL.parse(url), root);
	} else if (! (url instanceof URL)) {
		throw new TypeError('`url` must be a string or `URL`.');
	} else {
		const base = `file:${process.cwd()}/`;

		const path = './' + [
			...root.split('/').filter(seg => seg.length !== 0),
			...url.pathname.split('/').filter(seg => seg.length !== 0),
		].join('/');

		return new URL(path, base);
	}
}

/**
 *
 * @param {string} path
 * @param {object} options
 * @param {string[]} [options.indexFiles=["index.html","index.html"]]
 * @returns {Promise<string|null>}
 */
async function _resolveStaticPath(path, { indexFiles = ['index.html', 'index.htm'] } = {}) {
	if (existsSync(path)) {
		const stats = await stat(path);

		if (stats.isFile()) {
			return path;
		} else if (stats.isDirectory()) {
			// Try each potential index file
			return indexFiles.map(index => join(path, index)).find(existsSync) ?? null;
		}
	} else {
		return null;
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
	logger = console.error,
	launch = false,
	signal: passedSignal,
} = {}) {
	const { promise: whenServerClosed, resolve: resolveClosed } = Promise.withResolvers();
	const url = new URL(pathname, `http://${hostname}:${port}`).href;
	const ROUTES = new Map(Object.entries(routes).map(([pattern, module]) => [new URLPattern(pattern, url), module]));

	const server = createServer(async function(incomingMessage, serverResponse) {
		const controller = new AbortController();
		const errHandler = _createErrorHandler(serverResponse, controller, logger);

		try {
			incomingMessage.once('close', () => setTimeout(() => controller.abort(incomingMessage.errored), 100));
			controller.signal.addEventListener('abort', () => incomingMessage.removeAllListeners(), { once: true });
			const req = HTTPRequest.createFromIncomingMessage(incomingMessage, { signal: controller.signal });
			const url = new URL(req.url);
			const fileURL = getFileURL(url, staticRoot);
			const pattern = ROUTES.keys().find(pattern => pattern.test(req.url));
			console.info(`${req.method} <${req.url}>`);


			if (pattern instanceof URLPattern) {
				const moduleSpecifier = ROUTES.get(pattern);
				const module = await import(moduleSpecifier).catch(err => err);

				if (module instanceof Error) {
					await _sendError(module, serverResponse);
				} else if (! (module.default instanceof Function)) {
					await errHandler(new Error(`${moduleSpecifier} is missing a default export.`));
				} else {
					const signal = passedSignal instanceof AbortSignal
						? AbortSignal.any([passedSignal, controller.signal])
						: controller.signal;

					const resp = await module.default(req, {
						matches: pattern.exec(req.url),
						pattern,
						controller,
						signal,
					}).catch(err => err);

					if (resp instanceof Response) {
						await _send(resp, serverResponse);
					} else if (resp instanceof URL) {
						return _send(Response.redirect(resp));
					} else if (resp instanceof Error) {
						await errHandler(resp);
					} else {
						await errHandler(new TypeError(`${moduleSpecifier} did not return a response.`));
					}
				}
			} else if (existsSync(fileURL)) {
				const resolved = await _resolveStaticPath(fileURL.pathname);

				if (typeof resolved === 'string') {
					const resp = await respondWithFile(resolved);
					await _send(resp, serverResponse);
				} else {
					await errHandler(new Error(`<${req.url}> not found.`, { status: 404 }));
				}
			} else {
				await errHandler(new Error(`${req.url} not found.`), { status: 404 });
			}
		} catch(err) {
			await errHandler(err);
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

/**
 *
 * @param {URL|string} url
 * @param {RequestInit} init
 */
export async function mockFetch(url, init) {
	try {
		const req = new HTTPRequest(url, init);
		console.log(req);
	} catch(err) {
		console.error(err);
		return Response.error();
	}

}
