export default {
	staticRoot: '/static/',
	routes: {
		'/favicon.svg': '@aegisjsproject/http-server/api/favicon.js',
		'/video': './api/video.js',
		'/tasks': '@aegisjsproject/http-server/api/tasks.js',
		'/echo': '@aegisjsproject/http-server/api/echo.js',
		'/server': '@aegisjsproject/http-server/api/server.js',
		'/redirect': '@aegisjsproject/http-server/api/redirect.js',
	},
	headers: {
		'Content-Security-Policy': [
			'default-src \'none\'',
			'script-src \'self\' https://unpkg.com/@shgysk8zer0/ https://unpkg.com/@aegisjsproject/',
			'img-src \'self\'',
			'media-src \'self\'',
			'connect-src \'self\' http://localhost:*/',
		].join(';'),
	},
	staticPaths: ['/'],
	port: 8000,
	launch: true,
};
