import { HTTPError } from '../HTTPError.js';

/**
 *
 * @param {object} options
 * @param {number} [options.timeout=6000]
 * @param {number} [options.maxRequests=9]
 * @returns {Function}
 */
export function useRateLimit({ timeout = 60_000, maxRequests = 60 } = {}) {
	const reqs = new Map();

	setInterval(() => {
		const threshold = Date.now() - timeout;

		reqs.entries().forEach(([ip, times]) => {
			const updated = times.filter(time => time > threshold);

			if (updated.length === 0) {
				reqs.delete(ip);
			} else {
				reqs.set(ip, times.filter(time => time > threshold));
			}
		});
	}, timeout);

	return function(req, { controller, ip }) {
		if (! reqs.has(ip)) {
			reqs.set(ip, [Date.now()]);
		} else {
			const times = reqs.get(ip);
			times.push(Date.now());

			if (times.length > maxRequests) {
				controller.abort(new HTTPError('Too many requests', {
					status: 429,
					headers: { 'Retry-After': Math.round(timeout / 1000) },
				}));
			}
		}
	};
}
