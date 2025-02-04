export class RequestCookieMap extends Map {
	constructor(req) {
		if (! (req instanceof Request)) {
			throw new TypeError('Request cookies can only be created from a `Request` object.');
		} else if (req.headers.has('Cookie')) {
			super(req.headers.get('Cookie').split(';').map(cookie => cookie.trim().split('=')));
		} else {
			super();
		}
	}

	get [Symbol.toStringTag]() {
		return 'RequestCookieMap';
	}

	toJSON() {
		return Object.fromEntries(this);
	}
}
