import { useRateLimit } from '@shgysk8zer0/http-server/rate-limit.js';
import { useCSP } from '@shgysk8zer0/http-server/csp.js';
import { useCORS } from '@shgysk8zer0/http-server/cors.js';
import { checkCacheItem, setCacheItem } from '@shgysk8zer0/http-server/cache.js';
import { useRequestId } from './req-id.js';
import { useGeo } from './geo.js';
import { useCompression } from './compression.js';
import { HTTPError } from './HTTPError.js';

const visits = new Map();

export default {
	staticRoot: '/static/',
	routes: {
		'/': '@shgysk8zer0/http-server/api/home.js',
		'/favicon.svg': '@shgysk8zer0/http-server/api/favicon.js',
		'/video': './api/video.js',
		'/tasks': '@shgysk8zer0/http-server/api/tasks.js',
		'/echo': '@shgysk8zer0/http-server/api/echo.js',
		'/server': '@shgysk8zer0/http-server/api/server.js',
		'/redirect': '@shgysk8zer0/http-server/api/redirect.js',
		'/cache': '@shgysk8zer0/http-server/api/cache.js',
		'/posts/:year(20\\d{2})/:month(0?\\d|[0-2])/:day(0?[1-9]|[12]\\d|3[01])/:post([a-z0-9\\-]+[a-z0-9])': (req, { params }) => Response.json(params),
		'/foo/:path([A-Za-z0-9]+)': (req, {
			matches: {
				pathname: {
					groups: {
						path = '',
					}
				}
			}
		}) => {
			return Response.redirect(new URL(`/${path}`, req.url));
		}
	},
	staticPaths: ['/'],
	port: 8000,
	open: true,
	requestPreprocessors: [
		(req) => {
			visits.emplace(req.url, {
				insert() {
					return 1;
				},
				update(oldValue) {
					return oldValue + 1;
				}
			});

			console.log(`${req.url} visit count: ${visits.get(req.url)}`);
		},
		useRateLimit({ timeout: 60_000, maxRequests: 100 }),
		useGeo(process.env.IPGEOLOCATION_KEY),
		useRequestId,
		checkCacheItem,
		(req, { searchParams, controller }) => {
			if (searchParams.has('secure') && ! req.headers.has('Authorization')) {
				controller.abort(new HTTPError('I\'m sorry, Dave, I\'m afraid I can\'t do that.', { status: 401 }));
			}
		}
	],
	responsePostprocessors: [
		useCompression('deflate'),
		setCacheItem,
		useCORS({ allowCredentials: true }),
		useCSP({
			'default-src': '\'none\'',
			'script-src': ['\'self\'', 'https://unpkg.com/@shgysk8zer0/', 'https://unpkg.com/@shgysk8zer0/'],
			'img-src': '\'self\'',
			'media-src': '\'self\'',
			'connect-src': ['\'self\'', 'http://localhost:*/'],
		}),
	],
};
