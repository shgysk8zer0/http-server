/**
 *
 * @param {object} options
 * @param {boolean} [options.allowCredentials=false]
 * @returns {Function}
 */
export function useCORS({ allowCredentials = false } = {}) {
	return function(response, { request }) {
		if (! response.redirected && request.headers.has('Origin') && ! response.headers.has('Access-Control-Allow-Origin')) {
			if (allowCredentials) {
				response.headers.set('Access-Control-Allow-Origin', request.headers.get('Origin'));
				response.headers.set('Access-Control-Allow-Credentials', 'true');
			} else {
				response.headers.set('Access-Control-Allow-Origin', '*');
			}
		}
	};
}
