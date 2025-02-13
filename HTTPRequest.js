import { HTTPError } from './HTTPError.js';

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
	} else {

		const stream = new ReadableStream({
			start(controller) {
				const abortCtrl = new AbortController();
				const enqueue = controller.enqueue.bind(controller);
				const close = () => {
					controller.close();
					abortCtrl.abort();
				};

				req.on('data', enqueue);
				req.once('end', close);

				if (signal instanceof AbortSignal) {
					if (signal.aborted) {
						controller.abort(signal.reason);
					} else {
						signal.addEventListener('abort', ({ target }) => {
							req.off('data', enqueue);
							req.off('end', close);
							controller.error(target.reason);
						}, { once: true, controller: abortCtrl });
					}
				}

			}
		});

		if (typeof req.headers['content-encoding'] !== 'string') {
			return stream;
		} else if (['gzip', 'deflate'].includes(req.headers['content-encoding'])) {
			return stream.pipeThrough(new DecompressionStream(req.headers['content-encoding']), { signal });
		} else {
			throw new HTTPError(`Unsupported Content-Encoding: ${req.headers['content-encoding']}.`, { status: 400 });
		}
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
