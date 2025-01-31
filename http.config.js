export default {
	staticRoot: '/static/',
	routes: {
		'/favicon.svg': '@aegisjsproject/http-server/api/favicon.js',
		// '/test/': './home.js',
		'/tasks': '@aegisjsproject/http-server/api/tasks.js',
		// '/:path/*': './js/routes/handler.js',
	},
	staticPaths: ['/'],
	port: 8000,
	launch: true,
};
