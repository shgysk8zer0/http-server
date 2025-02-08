import { useRateLimit } from '@shgysk8zer0/http-server/rate-limit.js';
import { useCsp } from '@shgysk8zer0/http-server/csp.js';
import { useCors } from '@shgysk8zer0/http-server/cors.js';
import { checkCacheItem, setCacheItem } from './cache.js';

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
	},
	staticPaths: ['/'],
	port: 8000,
	open: true,
	responsePostprocessors: [
		useCors({ allowCredentials: true }),
		useCsp({
			'default-src': '\'none\'',
			'script-src': ['\'self\'', 'https://unpkg.com/@shgysk8zer0/', 'https://unpkg.com/@shgysk8zer0/'],
			'img-src': '\'self\'',
			'media-src': '\'self\'',
			'connect-src': ['\'self\'', 'http://localhost:*/'],
		}),
		setCacheItem,
	],
	requestPreprocessors: [
		useRateLimit({ timeout: 60_000, maxRequests: 100 }),
		checkCacheItem,
	],
};
