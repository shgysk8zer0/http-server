export default {
	staticRoot: '/static/',
	routes: {
		'/favicon.svg': '@shgysk8zer0/http-server/api/favicon.js',
		'/video': './api/video.js',
		'/tasks': '@shgysk8zer0/http-server/api/tasks.js',
		'/echo': '@shgysk8zer0/http-server/api/echo.js',
		'/server': '@shgysk8zer0/http-server/api/server.js',
		'/redirect': '@shgysk8zer0/http-server/api/redirect.js',
	},
	headers: {
		'Content-Security-Policy': [
			'default-src \'none\'',
			'script-src \'self\' https://unpkg.com/@shgysk8zer0/ https://unpkg.com/@shgysk8zer0/',
			'img-src \'self\'',
			'media-src \'self\'',
			'connect-src \'self\' http://localhost:*/',
		].join(';'),
	},
	staticPaths: ['/'],
	port: 8000,
	open: true,
	responsePostProcessors: [(resp) => {
		resp.headers.set('Access-Control-Allow-Origin', '*');
	}],
	requestPreprocessors: [async (req, { controller }) => {
		if (req.headers.has('Referer')) {
			const { HTTPError } = await import('@shgysk8zer0/http-server/HTTPError.js');
			controller.abort(new HTTPError('Requests should not have a referrer.'));
		}
	}],
};
