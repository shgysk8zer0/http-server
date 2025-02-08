export default (req, { ip, cookies }) => new Response(`<!DOCTYPE html>
<html lang="en" dir="ltr">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width" />
		<meta name="color-scheme" content="light dark" />
		<meta name="referrer" content="no-referrer" />
		<base href="${req.url}" />
		<title>http-server test</title>
		<script referrerpolicy="no-referrer" fetchpriority="auto" crossorigin="anonymous" integrity="sha384-T7G03xAxCsbFKNRRvaId3sokCOoB1pV75XfybfcqIauhaQ4JyKdTYoBFpLuTS4ul" src="https://unpkg.com/@shgysk8zer0/polyfills@0.4.9/browser.min.js" defer=""></script>
		<script type="module" src="/js/index.js" referrerpolicy="no-referrer"></script>
		<link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />
	</head>
	<body>
		<pre><code>${JSON.stringify({
			url: req.url,
			method: req.method,
			headers: Object.fromEntries(req.headers),
			mode: req.mode,
			destination: req.destination,
			referrer: req.referrer,
			credentials: req.credentials,
			cache: req.cache,
			priority: req.priority,
			cookies,
			ip,
		}, null, 4)}</code></pre>
		<video src="/video" preload="metadata" controls=""></video>
	</body>
</html>`, {
	headers: {
		'Content-Type': 'text/html',
	}
});
