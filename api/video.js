const src = 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4';

export default async function(req) {
	return await fetch(src, {
		headers: req.headers,
		method: req.method,
		signal: req.signal,
		duplex: 'half',
	}).catch(() => Response.error());
}
