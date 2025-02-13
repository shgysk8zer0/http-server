import { HTTPError } from './HTTPError.js';

/**
 * Creates an HTTP request handler to handle various HTTP methods.
 *
 * @param {Object.<string, (req: Request, context: object) => Response | Promise<Response>} handlers HTTP method handlers (e.g., { get: fn }).
 * @returns {(req: Request, context: object) => Promise<Response>}} HTTP request handler function.
 * @throws {TypeError} If handlers is empty.
 */
export function createHandler(handlers) {
	const methods = typeof handlers === 'object' ? Object.keys(handlers).map(method => method.toUpperCase()) : [];

	if (methods.length === 0) {
		throw new TypeError('Missing list of HTTP methods and handlers.');
	} else {
		/**
		 * @param {Request} request
		 * @param {object} context
		 * @returns {Promise<Response>}
		 * @throws {HTTPError}
		 */
		return async function(request, context) {
			try {
				if (handlers[request.method.toLowerCase()] instanceof Function) {
					return await handlers[request.method.toLowerCase()](request, context);
				} else {
					return new Response(null, {
						status: 405,
						statusText: 'Method Not Allowed',
						headers: { Allow: methods.join(', ') }
					});
				}
			} catch(err) {
				if (err instanceof HTTPError) {
					throw err;
				} else {
					throw new HTTPError('An unknown error occured.', { cause: err });
				}
			}
		};
	}
}
