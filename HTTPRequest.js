
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
