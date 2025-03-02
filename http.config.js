import { useRateLimit } from '@shgysk8zer0/http-server/plugins/rate-limit.js';
import { useCSP } from '@shgysk8zer0/http-server/plugins/csp.js';
import { useCORS } from '@shgysk8zer0/http-server/plugins/cors.js';
import { checkCacheItem, setCacheItem } from '@shgysk8zer0/http-server/plugins/cache.js';
import { useGeo } from './plugins/geo.js';
import { useCompression } from './plugins/compression.js';
import { HTTPError } from './HTTPError.js';
import { key, cert } from './keys.js';

const visits = new Map();

export default {
	key, cert,
	staticRoot: '/static/',
	routes: {
		'/': '@shgysk8zer0/http-server/api/home.js',
		'/socket': './api/socket.js',
		'/favicon.svg': '@shgysk8zer0/http-server/api/favicon.js',
		'/video': './api/video.js',
		'/tasks': '@shgysk8zer0/http-server/api/tasks.js',
		'/tasks/:id([a-z0-9\\-]{36})': '@shgysk8zer0/http-server/api/tasks.js',
		'/echo': '@shgysk8zer0/http-server/api/echo.js',
		'/server': '@shgysk8zer0/http-server/api/server.js',
		'/redirect': '@shgysk8zer0/http-server/api/redirect.js',
		'/cache': '@shgysk8zer0/http-server/api/cache.js',
		'/posts/:year(20\\d{2})/:month(0?\\d|[0-2])/:day(0?[1-9]|[12]\\d|3[01])/:slug([a-z0-9\\-]+[a-z0-9])': (req, { params }) => Response.json({
			date: new Date(parseInt(params.year), parseInt(params.month) - 1, parseInt(params.day)).toISOString(),
			slug: params.slug,
			year: params.year,
			month: params.month,
			day: params.day,
			url: req.url,
		}),
		'/foo/:path([A-Za-z0-9]+)': (req, {
			params: { path = '' }
		}) => {
			return Response.redirect(new URL(`/${path}`, req.url));
		}
	},
	staticPaths: ['/'],
	port: 4043,
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
		'@shgysk8zer0/http-server/plugins/req-id.js',
		checkCacheItem,
		(req, { searchParams, controller }) => {
			if (searchParams.has('secure') && ! req.headers.has('Authorization')) {
				controller.abort(new HTTPError('I\'m sorry, Dave, I\'m afraid I can\'t do that.', { status: 401 }));
			}
		},
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
		(response, { request }) => {
			if (request.destination === 'document') {
				response.headers.append('Link', '<https://unpkg.com/@shgysk8zer0/polyfills@0.4.9/browser.min.js>; rel="preload"; as="script"; fetchpriority="high"; crossorigin="anonymous"; referrerpolicy="no-referrer"');
				response.headers.append('Link', '</js/index.js>; rel="preload"; as="script"; fetchpriority="high"; referrerpolicy="no-referrer"');
			}
		}
	],
};
