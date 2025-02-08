import { getCacheItem, hasCacheItem, clearCache } from '@shgysk8zer0/http-server/cache.js';
import { HTTPError } from '../HTTPError.js';

export default (req, { url }) => {
	switch(req.method) {
		case 'GET': {
			if (! url.searchParams.has('id')) {
				throw new HTTPError('Request does not have required id.', { status: 400 });
			} else if (! hasCacheItem(url.searchParams.get('id'))) {
				throw new HTTPError(`Cache it with id "${url.searchParams.get('id')} not found.`, { status: 404 });
			} else {
				return getCacheItem(url.searchParams.get('id'));
			}
		}
		break;

		case 'DELETE':
			clearCache();
			return new Response(null, { status: 204 });
	}
}
