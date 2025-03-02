// Extend `Response to allow 1xx status codes.
const STATUS_SYMBOL = Symbol('http:status');

export class HTTPResponse extends Response {
	constructor(body, { headers, status = 200 } = {}) {
		super(body, { headers });

		if (! Number.isSafeInteger(status)) {
			throw new TypeError('Cannot set status to a non-integer.');
		} else if (status !== 0 && (status < 100 || status > 599)) {
			throw new RangeError(`Invalid HTTP status code: ${status}. Only status code between 100 & 399 are allowed.`);
		} else {
			this[STATUS_SYMBOL] = status;
		}
	}

	get ok() {
		return this.status > 199 && this.status < 300;
	}

	get status() {
		return this[STATUS_SYMBOL];
	}
}
