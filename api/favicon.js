export default async () => {
	return new Response(`<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
		<rect x="0" y="0" rx="1" ry="1" width="10" height="10" fill="#${crypto.getRandomValues(new Uint8Array(3)).toHex()}"></rect>
	</svg>`, {
		headers: { 'Content-Type': 'image/svg+xml' },
	});
};
