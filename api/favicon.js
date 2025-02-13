import { createHandler } from '../handler.js';
import { HTTPError } from '../HTTPError.js';

const favicon = new Blob([`<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
	<rect x="0" y="0" rx="1" ry="1" width="10" height="10" fill="#${crypto.getRandomValues(new Uint8Array(3)).toHex()}"></rect>
</svg>`], { type: 'image/svg+xml' });

export default createHandler({
	get(req) {
		console.log(req.destination);
		if (req.destination === 'image') {
			return new Response(favicon);
		} else {
			throw new HTTPError('Not a valid image request', { status: 400 });
		}
	}
});
