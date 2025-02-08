const cache = new Map();

/**
 *
 * @param {Request} request
 * @param {object} context
 * @param {AbortController} context.controller
 * @param {AbortSignal} context.signal
 * @param {Function} context.resolve
 */
export function checkCacheItem(request, { signal, resolve }) {
	if (! (request instanceof Request)) {
		throw new TypeError('Response must be a `Response` object.');
	} else if (! signal.abort && cache.has(request.url)) {
		const resp = cache.get(request.url);

		if (resp.bodyUsed) {
			cache.delete(request.url);
		} else {
			resolve(resp);
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
	} else if (! request.signal.aborted && response.ok && ! response.bodyUsed && response.status !== 206) {
		cache.set(request.url, response.clone());
	}
}

export const getCacheSize = () => cache.size;

export const getCacheItem = key => cache.has(key) ? cache.get(key).clone() : null;

export const deleteCacheItem = key => cache.delete(key);

export const hasCacheItem = key => cache.has(key);

export const clearCache = () => cache.clear();
