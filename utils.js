import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const BASE = `file://${process.cwd()}/`;

export function resolveModulePath(path) {
	if (path instanceof URL || path instanceof Function) {
		return path;
	} else if (path[0] === '.' || path[0] === '/') {
		return `${BASE}${path.replaceAll(/(\.+\/)/g, '')}`;
	} else {
		// May require `--experimental-import-meta-resolve` to work as expected (resolve relative to project root and make use of `BASE`)

		try {
			return import.meta.resolve(path, BASE);
		} catch(err) {
			throw new Error(`Unable to import module ${path}. Try running again with \`node --experimental-import-meta-resolve\`.`, { cause: err });
		}
	}
}

export function getContentType(path) {
	switch(path.toString().toLowerCase().split('.').at(-1)) {
		// Documents
		case 'html':
		case 'htm':
			return 'text/html';

		case 'txt':
			return 'text/plain';

		case 'md':
			return 'text/markdown';

		case 'rtf':
			return 'application/rtf';

		case 'csv':
			return 'text/csv';

		case 'pdf':
			return 'application/pdf';

		case 'epub':
			return 'application/epub+zip';

		case 'xml':
			return 'application/xml';

		// Feeds
		case 'rss':
			return 'application/rss+xml';

		case 'atom':
			return 'application/atom+xml';

		// Calendar / Contacts
		case 'ics':
			return 'text/calendar';

		case 'vcf':
			return 'text/vcard';

		// Scripts & Data
		case 'js':
		case 'mjs':
			return 'application/javascript';

		case 'ts':
			return 'application/typescript';

		case 'json':
		case 'map':
		case 'topojson': // A GeoJSON extension
			return 'application/json';

		case 'jsonld':
    		return 'application/ld+json';

		// Geo
		case 'geojson':
			return 'application/geo+json';

		case 'kml':
			return 'application/vnd.google-earth.kml+xml';

		case 'kmz':
			return 'application/vnd.google-earth.kmz';

		case 'gpx':
			return 'application/gpx+xml';

		case 'yaml':
		case 'yml':
			return 'application/yaml';

		case 'wasm':
			return 'application/wasm';

		// Styles
		case 'css':
			return 'text/css';

		// Images
		case 'jpeg':
		case 'jpg':
			return 'image/jpeg';

		case 'png':
			return 'image/png';

		case 'apng':
			return 'image/apng';

		case 'gif':
			return 'image/gif';

		case 'webp':
			return 'image/webp';

		case 'avif':
			return 'image/avif';

		case 'svg':
		case 'svgz': // Would need to add the Content-Encoding header as well
			return 'image/svg+xml';

		case 'ico':
			return 'image/vnd.microsoft.icon';

		case 'heic':
			return 'image/heic';

		case 'heif':
			return 'image/heif';

		case 'jxl':
			return 'image/jxl';

		case 'tiff':
		case 'tif':
			return 'image/tiff';

		case 'bmp':
			return 'image/bmp';

		// Adobe
		case 'psd':
			return 'image/vnd.adobe.photoshop';

		case 'ai':
			return 'application/postscript';

		case 'eps':
			return 'application/postscript';

		case 'ps':
			return 'application/postscript';

		case 'indd':
			return 'application/x-indesign';

		case 'indt':
			return 'application/x-indesign-template';

		case 'idml':
			return 'application/vnd.adobe.indesign-idml-package';

		// Gimp
		case 'xcf':
			return 'image/x-xcf';

		// Fonts
		case 'woff':
			return 'font/woff';

		case 'woff2':
			return 'font/woff2';

		case 'ttf':
			return 'font/ttf';

		case 'otf':
			return 'font/otf';

		case 'eot':
			return 'application/vnd.ms-fontobject';

		// Video
		case 'mp4':
			return 'video/mp4';

		case 'webm':
			return 'video/webm';

		case 'ogv':
			return 'video/ogg';

		case 'mov':
			return 'video/quicktime';

		case 'mkv':
			return 'video/x-matroska';

		case 'avi':
			return 'video/x-msvideo';

		case 'm4v':
			return 'video/mp4';

		// Subtitles
		case 'vtt':
			return 'text/vtt';

		case 'srt':
			return 'text/plain';

		// Audio
		case 'mp3':
			return 'audio/mpeg';

		case 'wav':
			return 'audio/wav';

		case 'oga':
		case 'ogg':
			return 'audio/ogg';

		case 'aac':
			return 'audio/aac';

		case 'm4a':
			return 'audio/mp4';

		case 'flac':
			return 'audio/flac';

		case 'opus':
			return 'audio/opus';

		// Manifest
		case 'webmanifest':
			return 'application/manifest+json';

		// Compressed
		case 'gz':
			return 'application/gzip';

		case 'br':
			return 'application/brotli';

		case 'zip':
			return 'application/zip';

		case 'xz':
			return 'application/x-xz';

		case 'tar':
			return 'application/x-tar';

		case '7z':
			return 'application/x-7z-compressed';

		case 'rar':
			return 'application/vnd.rar';

		case 'bz2':
			return 'application/x-bzip2';

		// Microsoft Office
		case 'doc':
			return 'application/msword';

		case 'docx':
			return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

		case 'xls':
			return 'application/vnd.ms-excel';

		case 'xlsx':
			return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

		case 'ppt':
			return 'application/vnd.ms-powerpoint';

		case 'pptx':
			return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

		// LibreOffice / OpenDocument
		case 'odt':
			return 'application/vnd.oasis.opendocument.text';

		case 'ods':
			return 'application/vnd.oasis.opendocument.spreadsheet';

		case 'odp':
			return 'application/vnd.oasis.opendocument.presentation';

		// WebGL / 3D
		case 'glsl':
		case 'vert':
		case 'frag':
		case 'geom':
		case 'comp':
			return 'text/plain';

		case 'gltf':
			return 'model/gltf+json';

		case 'glb':
			return 'model/gltf-binary';

		case 'obj':
			return 'model/obj';

		case 'mtl':
			return 'model/mtl';

		case 'dae':
			return 'model/vnd.collada+xml';

		case 'hdr':
			return 'image/vnd.radiance';

		// WebGPU
		case 'wgsl':
			return 'text/wgsl';

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
