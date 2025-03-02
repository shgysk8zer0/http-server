export default req => new Response(
	ReadableStream.from(req.body ?? 'Hello, World!')
		// .pipeThrough(new TextEncoderStream(), { signal: req.signal })
		.pipeThrough(
			new TransformStream({
				start() {
					req.signal.addEventListener('abort', ({ target }) => console.log(target.reason), { once: true });
				},
				async transform(chunk, controller) {
					console.log({ chunk });
					await scheduler.postTask(() => controller.enqueue(chunk), {
						signal: req.signal,
						priority: 'user-blocking',
						delay: 500,
					});
				}
			}), { signal: req.signal }
		)
		.pipeThrough(new CompressionStream('gzip'), { signal: req.signal }),
	{
		headers: {
			'Content-Type': 'text/plain',
			'Cache-Control': 'no-store',
			'Content-Encoding': 'gzip',
		}
	}
);
