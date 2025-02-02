const src = 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4';

// export default () => Response.redirect(src);

export default async function(req) {
	return fetch(src, {
		headers: req.headers,
		method: req.method,
		duplex: 'half',
	});
}
