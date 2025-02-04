/* eslint-env browser */
/* global document */
fetch('/tasks').then(resp => resp.json()).then(console.log).catch(console.error);

fetch('/redirect', {
	method: 'PUT',
	body: new File(['Hello, World!'], 'hi.txt', { type: 'text/plain' }),
	priority: 'high',
}).then(async resp => {
	const data = await resp.json();
	const pre = document.createElement('pre');
	const code = document.createElement('code');
	code.textContent = JSON.stringify({
		req: data,
		resp: {
			url: resp.url,
			redirected: resp.redirected,
			ok: resp.ok,
			status: resp.status,
			type: resp.type,
			headers: Object.fromEntries(resp.headers),
		}
	}, null, 4);

	pre.append(code);
	document.body.append(pre);
});
