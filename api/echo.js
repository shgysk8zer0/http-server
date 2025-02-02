/**
 *
 * @param {Request} req
 * @param {*} param1
 * @returns
 */
export default async function(req, { ip }) {
	const headers = new Headers();
	headers.append('Set-Cookie', `updated=${Date.now()}`);
	headers.append('Set-Cookie', `client-ip=${ip}`);
	headers.append('X-Foo', 'bar');
	headers.append('X-Foo', 'bazz');

	const resp = Response.json({
		url: req.url,
		method: req.method,
		headers: Object.fromEntries(req.headers),
		mode: req.mode,
		destination: req.destination,
		referrer: req.referrer,
		credentials: req.credentials,
		cache: req.cache,
		priority: req.priority,
		cookies: headers.getSetCookie(),
		ip,
		body: req.body instanceof ReadableStream ? await req.text() : null,
		signal: { aborted: req.signal.aborted },
	}, {
		headers,
	});

	console.log(resp.headers.getSetCookie());
	return resp;
}
