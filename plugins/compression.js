export function useCompression(format = 'deflate') {
	return function(response, { request }) {
		if (
			response instanceof Response
			&& response.body instanceof ReadableStream
			&& ! response.headers.has('Content-Encoding')
			&& response.headers.get('Content-Type').startsWith('text/')
			&& request.headers.has('Accept-Encoding')
			&& request.headers.get('Accept-Encoding').split(',').some(encoding => encoding.trim() === format)
		) {
			response.headers.set('Content-Encoding', format);
			return new CompressionStream(format);
		}
	};
}

export const useGzip = useCompression('gzip');
export const useDeflate = useCompression('deflate');
export default useCompression;
