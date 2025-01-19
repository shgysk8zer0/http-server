/* eslint-disable */
import '@shgysk8zer0/polyfills'; // Adds polyfills for eg `Promise.try()`, `URLPattern`, `URL.parse` and `URL.canParse`, etc... All new APIs in JS.
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
		const body = getBody(req);

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

function createErrorHandler(resp, controller, logger) {
	return logger instanceof Function
		? async (err, { status = 500, headers = { 'Content-Type': 'text/plain' }} = {}) => {
			Promise.try(() => logger(err));
			controller.abort(err);
			return sendError(err, resp, { status, headers });
		}
		: async (err, { status = 500, headers = { 'Content-Type': 'text/plain' }} = {}) => {
			controller.abort(err);
			return sendError(err, resp, { status, headers });
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
function getBody(req, { signal: passedSignal } = {}) {
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

async function send(resp, respMessage) {
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
		await send(new Response(body, {
			status,
			headers: Array.isArray(headers) ? Object.fromEntries(headers) : headers,
		}), respMessage);
	} else {
		throw new TypeError('Response must be a `Response` or regular object.');
	}
}

async function sendError(err, respMessage, {
	status = 500,
	headers = { 'Content-Type': 'text/plain' },
} = {}) {
	return await send(new Response(err.message, {
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
				throw new Error(`Invalid file path.`);
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
 * @param {string} [options.type="application/octet-stream"]
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

export async function serve({
	hostname = 'localhost',
	port = 8080,
	pathname = '/',
	routes = {},
	logger = console.error,
	signal: passedSignal,
	staticPaths = [],
} = {}) {
	const url = new URL(pathname, `http://${hostname}:${port}`).href;
	const map = new Map(Object.entries(routes).map(([pattern, module]) => [new URLPattern(pattern, url), module]));
	const [
		{ createServer },
		{ stat },
		{ join },
		{ existsSync },
	] = await Promise.all([
		import('node:http'),
		import('node:fs/promises'),
		import('node:path'),
		import('node:fs'),
	]);

	async function resolveStaticPath(path, { indexFiles = ['index.html', 'index.htm'] } = {}) {
		if (existsSync(path)) {
			const stats = await stat(path);

			if (stats.isFile()) {
				return path;
			} else if (stats.isDirectory()) {
				// Try each potential index file
				return indexFiles.map(index => join(path, index)).find(existsSync);
			}
		}
	}

	const server = createServer(async function(incomingMessage, serverResponse) {
		const controller = new AbortController();
		const errHandler = createErrorHandler(serverResponse, controller, logger);

		try {
			incomingMessage.once('close', () => setTimeout(() => controller.abort(incomingMessage.errored), 100));
			controller.signal.addEventListener('abort', () => incomingMessage.removeAllListeners(), { once: true });
			const req = HTTPRequest.createFromIncomingMessage(incomingMessage, { signal: controller.signal });
			const url = new URL(req.url);
			const fileURL = new URL('.' + url.pathname ?? '/', `file://${process.cwd()}/`);
			const pattern = map.keys().find(pattern => pattern.test(req.url));
			console.info(`${req.method} <${req.url}>`);

			if (staticPaths.some(path => url.pathname.startsWith(path))) {
				const resolved = await resolveStaticPath(fileURL.pathname);

				if (typeof resolved === 'string') {
					const resp = await respondWithFile(resolved);
					await send(resp, serverResponse);
				} else {
					await errHandler(new Error(`<${req.url}> not found.`, { status: 404 }));
				}
			} else if (pattern instanceof URLPattern) {
				const moduleSpecifier = map.get(pattern);
				const module = await import(moduleSpecifier).catch(err => err);

				if (module instanceof Error) {
					await sendError(module, serverResponse);
				} else if (module.default instanceof Function) {
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
						await send(resp, serverResponse);
					} else if (resp instanceof URL) {
						return send(Response.redirect(resp));
					} else if (resp instanceof Error) {
						await errHandler(resp);
					} else {
						await errHandler(new TypeError(`${moduleSpecifier} did not return a response.`));
					}
				} else {
					await errHandler(new Error(`${moduleSpecifier} is missing a default export.`));
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

	return { server, url };
}

// Let's test this server module out...
const controller = new AbortController();

const { url } = await serve({
	pathname: '/test/',
	routes: {
		'/test/': './home.js',
		'/tasks': './tasks.js',
		// '/:path/*': './js/routes/handler.js',
	},
	staticPaths: ['/favicon.ico', '/img/', '/js/', '/css/', '/_site/'],
	signal: controller.signal,
	port: 8000,
});

console.info(`Now listening on ${url}`);

// const resp = await fetch(url, {
// 	method: 'PUT',
// 	body: getFileStream(import.meta.url).pipeThrough(new CompressionStream('deflate')),
// 	signal: controller.signal,
// 	referrer: 'https://example.com',
// 	mode: 'same-origin',
// 	referrerPolicy: 'origin',
// 	priority: 'high',
// 	duplex: 'half',
// 	headers: {
// 		Accept: 'application/json',
// 		'Content-Encoding': 'deflate',
// 		'Content-Type': 'application/javascript',
// 		Priority: 'u=2',
// 		Cookie: 'foo=bar',
// 	}
// });
// console.log(await resp.json());
// const resp = await fetch('http://localhost:8000/_site/', { signal: controller.signal });

// console.log(await resp.text());
// controller.abort('done');

