import { serve } from '@shgyk8zer0/http-server';

export default async (req) => {
	const { hostname } = new URL(req.url);
	const controller = new AbortController();

	req.signal.addEventListener('abort', ({ target }) => {
		console.log(target.reason);
		setTimeout(() => controller.abort(target.reason), 1000);
	}, { once: true });

	const path = crypto.randomUUID();

	const { whenServerClosed, url } = await serve({
		hostname,
		port: 1024 + crypto.getRandomValues(new Uint16Array(1))[0],
		pathname: path,
		signal: controller.signal,
		routes: {
			['/' + path]: '@shgysk8zer0/http-server/api/echo.js',
		}
	});

	console.log(`Opened server on ${url}`);

	whenServerClosed.then(() => console.log(`Shut down server on ${url}`));
	return Response.redirect(url, 307);
};
