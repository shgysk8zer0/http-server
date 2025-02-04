import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

export function getContentType(path) {
	switch(path.toLowerCase().split('.').at(-1)) {
		case 'html':
			return 'text/html';

		case 'js':
			return 'application/javascript';

		case 'css':
			return 'text/css';

		case 'jpeg':
			return 'image/jpeg';

		case 'png':
			return 'image/png';

		case 'svg':
			return 'image/svg+xml';

		case 'txt':
			return 'text/plain';

		default:
			return 'application/octet-stream';
	}
}

/**
 *
 * @param {string} path
 * @param {string} base
 * @returns {ReadableStream}
 */
export const getFileStream = (path, base = `file://${process.cwd()}/`) => new ReadableStream({
	async start(controller) {
		try {
			const url = URL.parse(path, base);

			if (! (url instanceof URL) || url.protocol !== 'file:') {
				throw new Error('Invalid file path.');
			} else {
				const { createReadStream } = await import('node:fs');
				const fileStream = createReadStream(url.pathname);

				for await (const chunk of fileStream) {
					controller.enqueue(chunk);
				}
			}
		} catch(err) {
			controller.error(err);
		} finally {
			controller.close();
		}
	}
});

/**
 *
 * @param {string} path
 * @param {object} [options]
 * @param {string} [options.base]
 * @param {string|null} [options.compression=null]
 * @returns {Promise<Response>}
 */
export async function respondWithFile(path, {
	base = `file://${process.cwd()}/`,
	compression = null,
	...headers
} = {}) {
	const stream = getFileStream(path, base);

	if (typeof compression === 'string') {
		return new Response(stream.pipeThrough(new CompressionStream(compression), {
			headers: {
				'Content-Type': getContentType(path),
				'Content-Encoding': compression,
				...headers,
			}
		}));
	} else {
		return new Response(stream, {
			headers: {
				'Content-Type': getContentType(path),
				...headers,
			},
		});
	}
}


/**
 * Creates a `file:` URL relative from the `pathname` of a URL, relative to project root.
 *
 * @param {string|URL} url The URL to resolve using `pathname`.
 * @param {string} [root="/"] The root directory, relative to the project root/working directory.
 * @returns {URL} The resolved file URL (`file:///path/to/project/:root/:pathname`).
 * @throws {TypeError} If `url` is not a string or URL.
 */
export function getFileURL(url, root = '/') {
	if (typeof url === 'string') {
		return getFileURL(URL.parse(url), root);
	} else if (! (url instanceof URL)) {
		throw new TypeError('`url` must be a string or `URL`.');
	} else {
		const base = `file:${process.cwd()}/`;

		const path = './' + [
			...root.split('/').filter(seg => seg.length !== 0),
			...url.pathname.split('/').filter(seg => seg.length !== 0),
		].join('/');

		return new URL(path, base);
	}
}

/**
 *
 * @param {string} path
 * @param {object} options
 * @param {string[]} [options.indexFiles=["index.html","index.html"]]
 * @returns {Promise<string|null>}
 */
export async function resolveStaticPath(path, { indexFiles = ['index.html', 'index.htm'] } = {}) {
	if (existsSync(path)) {
		const stats = await stat(path);

		if (stats.isFile()) {
			return path;
		} else if (stats.isDirectory()) {
			// Try each potential index file
			return indexFiles.map(index => join(path, index)).find(existsSync) ?? null;
		}
	} else {
		return null;
	}
}
