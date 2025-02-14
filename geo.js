const ENDPOINT = 'https://api.ipgeolocation.io/ipgeo';
const ENV_NAME = 'IPGEOLOCATION';
const cache = new Map();
let warned = false;

/**
 * Adds a `geo` object containing geoip data to the request context object.
 *
 * @param {string} [apiKey=process.env.IPGEOLOCATION] The API key for `api.ipgeolocation.io`, defaulting to one provided by an environment variable.
 * @returns {Function} The middleware context modifying callback.
 */
export function useGeo(apiKey = process.env[ENV_NAME]) {
	/**
	 * @async
	 * @param {Request} req Unused request object.
	 * @param {object} context The context object to add geoip data to.
	 */
	return async function(req, context) {
		if (typeof context.ip !== 'string' || context.signal.aborted) {
			return;
		} else if (cache.has(context.ip)) {
			context.geo = cache.get(context.ip);
		} else if (typeof apiKey === 'string') {
			const url = new URL(ENDPOINT);
			url.searchParams.set('apiKey', apiKey);

			// Defaults to own IP if not provided
			if (context.ip !== '::1' && context.ip !== '127.0.0.1' && context.ip !== '0.0.0.0') {
				url.searchParams.set('ip', context.ip);
			}

			const resp = await fetch(url, {
				headers: { Accept: 'application/json' },
				signal: context.signal,
			}).catch(err => {
				console.error(err);
				return Response.error();
			});

			if (resp.ok) {
				const {
					city,
					country_name: name,
					country_code2: code,
					latitude,
					longitude,
					zipcode: postalCode,
					time_zone: { name: timezone },
					state_code,
					state_prov,
				} = await resp.json();

				const geo = Object.freeze({
					city, latitude, longitude, postalCode, timezone,
					country: { name, code },
					subdivision: { name: state_prov, code: state_code },
				});

				cache.set(context.ip, geo);
				context.geo = Object.freeze(geo);
			}
		} else if (! warned) {
			console.warn('No API key given. Visit https://ipgeolocation.io/ if you need to create an API key.');
			warned = true;
		}
	};
}
