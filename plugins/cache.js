const cache = new Map();
const cached = Symbol('cached');

const _getCachekey = req => `${req.method}:${req.url}`;

/**
 *
 * @param {Request} request
 * @param {object} context
 * @param {AbortController} context.controller
 * @param {AbortSignal} context.signal
 * @param {Function} context.resolve
 */
export function checkCacheItem(request, { signal, resolve }) {
	const key = _getCachekey(request);

	if (! (request instanceof Request)) {
		throw new TypeError('Response must be a `Response` object.');
	} else if ((request.method === 'GET' || request.method === 'DELETE') &&! signal.aborted && request.cache !== 'no-store' && cache.has(key)) {
		const resp = cache.get(key);
		const clone = resp.clone();
		clone.headers.set('X-Last-Cached', new Date(resp[cached]).toISOString());

		if (clone.bodyUsed) {
			cache.delete(key);
		} else {
			resolve(clone);
		}
	}
}

/**
 *
 * @param {Response} response
 * @param {object} context
 * @param {Request} context.request
 */
export function setCacheItem(response, { request }) {
	if (! (response instanceof Response)) {
		throw new TypeError('Response must be a `Response` object.');
	} else if (! (request instanceof Request)) {
		throw new TypeError('Request must be a `Request` object.');
	} else if (response.ok && response.headers.get('Cache-Control') !== 'no-store' && ! response.hasOwnProperty(cached) && (request.method === 'GET' || request.method === 'DELETE') && ! request.signal.aborted && ! response.bodyUsed && response.status !== 206) {
		const clone = Object.defineProperty(response.clone(), cached, {
			value: Date.now(),
			enumerable: false,
		});

		clone.headers.delete('Content-Encoding');
		cache.set(_getCachekey(request), clone);
	}
}

export const getCacheSize = () => cache.size;

export const listCache = () => Array.from(cache.keys());

export const getCacheItem = key => cache.has(key) ? cache.get(key).clone() : null;

export const deleteCacheItem = key => cache.delete(key);

export const hasCacheItem = key => cache.has(key);

export const clearCache = () => cache.clear();
