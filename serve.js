import { serve } from './server.js';

// Let's test this server module out...
const controller = new AbortController();

const { url, whenServerClosed } = await serve({
	// pathname: '/test/',
	staticRoot: '/static/',
	routes: {
		'/favicon.svg': '@aegisjsproject/http-server/api/favicon.js',
		// '/test/': './home.js',
		'/tasks': '@aegisjsproject/http-server/api/tasks.js',
		// '/:path/*': './js/routes/handler.js',
	},
	staticPaths: ['/'],
	signal: controller.signal,
	port: 8000,
	launch: true,
});

console.info(`Now listening on ${url}`);
whenServerClosed.then(console.log);
// controller.abort('done');
