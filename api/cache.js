import { getCacheItem, hasCacheItem, clearCache, deleteCacheItem, listCache } from '@shgysk8zer0/http-server/plugins/cache.js';
import { HTTPError } from '../HTTPError.js';

const headers = { 'Cache-Control': 'no-store' };

export default (req, { searchParams, url }) => {
	switch(req.method) {
		case 'GET': {
			if (! searchParams.has('id')) {
				return Response.json(listCache(), { headers });
			} else if (! hasCacheItem(searchParams.get('id'))) {
				throw new HTTPError(`Cache it with id "${searchParams.get('id')} not found.`, { status: 404, headers });
			} else {
				return getCacheItem(url.searchParams.get('id'));
			}
		}

		case 'DELETE':
			if (! searchParams.has('id')) {
				clearCache();
				return new Response(null, { status: 204, headers });
			} else if (hasCacheItem(searchParams.get('id'))) {
				deleteCacheItem(searchParams.get('id'));
				return new Response(null, { status: 204, headers });
			} else {
				throw new HTTPError(`No item found with id ${searchParams.get('id')}`, { status: 404, headers });
			}
	}
};
