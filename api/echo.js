export default async function(req, { ip }) {
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
		ip,
		body: req.body instanceof ReadableStream ? await req.text() : null,
		signal: { aborted: req.signal.aborted },
	})
}
