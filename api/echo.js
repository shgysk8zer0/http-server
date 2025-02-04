import { Cookie } from '../Cookie.js';

/**
 *
 * @param {Request} req
 * @param {object} context
 * @returns {Response}
 */
export default async function(req, { ip, cookies }) {
	const headers = new Headers();
	headers.append('X-Foo', 'bar');
	headers.append('X-Foo', 'bazz');

	headers.append('Set-Cookie', new Cookie({
		name: 'client-ip',
		value: ip,
		secure: true,
		httpOnly: true,
		partitioned: true,
		sameSite: 'strict',
	}));

	headers.append('Set-Cookie', new Cookie({
		name: 'updated',
		value: new Date().toISOString(),
		secure: true,
		httpOnly: true,
		partitioned: true,
		sameSite: 'strict',
	}));

	return Response.json({
		url: req.url,
		method: req.method,
		headers: Object.fromEntries(req.headers),
		mode: req.mode,
		destination: req.destination,
		referrer: req.referrer,
		credentials: req.credentials,
		cache: req.cache,
		priority: req.priority,
		cookies: cookies,
		ip,
		body: req.body instanceof ReadableStream ? await req.text() : null,
		signal: { aborted: req.signal.aborted, reason: req.signal.reason ?? null },
	}, {
		headers,
	});
}
