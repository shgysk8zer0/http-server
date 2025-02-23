// import { HTTPError } from './HTTPError.js';

/**
 *
 * @param {IncomingMessage} req
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {ReadableStream|null}
 */
function _getBody(req, { signal } = {}) {
	if (typeof req.headers['content-type'] !== 'string' || ['HEAD', 'DELETE', 'GET'].includes(req.method)) {
		return null;
	} else if (signal instanceof AbortSignal && signal.aborted) {
		throw signal.reason;
	} else if (typeof req.headers['content-encoding'] === 'string') {
		return ReadableStream.from(req).pipeThrough(new DecompressionStream(req.headers['content-encoding']), { signal });
	} else {
		// Pipe through no-op transform stream for `signal` support
		return ReadableStream.from(req).pipeThrough(new TransformStream({}), { signal });
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
		const body = _getBody(req, { signal });
		const headers = Object.fromEntries(Array.from(
			Object.keys(req.headers).filter(key => typeof key === 'string' && key[0] !== ':'),
			key => [key, req.headers[key]],
		));

		if (typeof req.headers[':authority'] === 'string') {
			headers.host = req.headers[':authority'];
		}

		const url = URL.parse(req.url, (req.headers[':scheme'] ?? 'http') + '://' + (req.headers[':authority'] ?? headers.host));

		return new HTTPRequest(url?.href, {
			headers: new Headers(headers),
			body, // null or a readable stream
			method: req.method,
			referrer: typeof req.headers.referer === 'string' && URL.canParse(req.headers.referer) ? req.headers.referer : 'about:client',
			signal,
			duplex: body instanceof ReadableStream ? 'half' : undefined,
		});
	}
}
