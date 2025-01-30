
// pathname: '/test/',
export const staticRoot = '/static/';
export const routes = {
	'/favicon.svg': '@aegisjsproject/http-server/api/favicon.js',
	// '/test/': './home.js',
	'/tasks': '@aegisjsproject/http-server/api/tasks.js',
	// '/:path/*': './js/routes/handler.js',
};
export const staticPaths = ['/'];
// export const signal = AbortSignal.timeout(5_000);
export const port = 8000;
export const launch = true;
