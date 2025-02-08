export class HTTPError extends Error {
	#status = 0;
	#headers;

	constructor(message, { status = 500, headers, cause } = {}) {
		if (! Number.isSafeInteger(status) && status > 0 && status < 600) {
			throw new TypeError(`Invalid status: ${status}.`);
		} else {
			super(message, { cause });
			this.#status = status;

			if (headers instanceof Headers) {
				this.#headers = headers;
			} else {
				this.#headers = new Headers(headers);
			}
		}
	}

	[Symbol.toStringTag]() {
		return 'HTTPError';
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			status: this.#status,
		};
	}

	get name() {
		return 'HTTPError';
	}

	get headers() {
		return this.#headers;
	}

	get status() {
		return this.#status;
	}

	get response() {
		return Response.json({
			error: this,
		}, {
			status: this.#status,
			headers: this.#headers,
		});
	}

	static async from(resp) {
		if (! (resp instanceof Response)) {
			throw new TypeError('Cannot create an HTTPError without a Response.');
		} else {
			const { error: { status, headers, message } = {}} = await resp.json();

			return new HTTPError(message, status, { headers });
		}
	}
}
