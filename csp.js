export function useCSP(policy = {
	'default-src': ['\'self\''],
}) {
	const policyStr = Object.entries(policy).map(([name, values]) => {
		return `${name} ${Array.isArray(values) ? values.join(' ') : values}`;
	}).join('; ');

	return function (resp, { request }) {
		if (request.destination === 'document' && ! resp.headers.has('Content-Security-Policy')) {
			resp.headers.set('Content-Security-Policy', policyStr);
		}
	};
}
