const cache = new Map();

export function getFromCache(req, { controller }) {
	if (cache.has(req.url)) {
		controller.abort('Serving from cache.');
		return cache.get(req.url);
	}
}

export function setCache(resp, { request }) {
	cache.set(request.url, resp);
}
