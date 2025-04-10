import { HTTPResponse } from '../HTTPResponse.js'; // Extends `Response` to allow 1xx status codes.

const MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const opcodes = [
	'Continuation',
	'Text Frame',
	'Binary Frame',
	'Reserved',
	'Reserved',
	'Reserved',
	'Reserved',
	'Reserved',
	'Close',
	'Ping',
	'Pong',
	'Reserved',
	'Reserved',
	'Reserved',
	'Reserved',
	'Reserved',
];

function generateWebSocketResponse(message) {
	// Convert the message to a buffer
	const payload = Buffer.from(message, 'utf-8');

	// Generate a masking key (random 4 bytes)
	const mask = Buffer.alloc(4);
	for (let i = 0; i < 4; i++) {
	  mask[i] = Math.floor(Math.random() * 256);
	}

	// Mask the payload
	for (let i = 0; i < payload.length; i++) {
	  payload[i] ^= mask[i % 4];
	}

	// Construct the frame header
	let frameHeader = Buffer.alloc(2);
	// First byte: FIN (1) + Opcode (Text frame 0x1)
	frameHeader[0] = 0x81; // FIN + Text Frame (Opcode 0x1)

	// Second byte: Masked + Payload Length
	frameHeader[1] = 0x80 | payload.length; // Masked + length (for short messages)

	// Combine the header, masking key, and payload
	const responseFrame = Buffer.concat([frameHeader, mask, payload]);

	return responseFrame;
}

/**
 *
 * @param {Request} req
 * @param {object} context
 * @param {import('node:net').Socket} context.socket
 */
export default async function(req, { socket }) {
	socket.setKeepAlive(true);
	socket.setNoDelay(true);
	let count = 0;
	const interval = setInterval(() => socket.write(generateWebSocketResponse('tick')), 1000);
	socket.on('data', buffer => {
		// const fin = (buffer[0] & 0b10000000) !== 0; // FIN bit
		const opcode = buffer[0] & 0b00001111; // Opcode
		const masked = (buffer[1] & 0b10000000) !== 0;
		let mask;
		let length = buffer[1] & 0b01111111;
		let offset = 2;

		if (length === 126) {
			length = buffer.readUInt16BE(offset);
			offset += 2;
		} else if (length === 127) {
			length = Number(buffer.readBigUInt64BE(offset));
			offset += 8;
		}
		if (masked) {
			mask = buffer.slice(offset, offset + 4);
			offset += 4;
		}

		let payload = buffer.slice(offset, offset + length);

		if (masked) {
			for (let i = 0; i < payload.length; i++) {
				payload[i] ^= mask[i % 4];
			}
		}

		console.log(opcodes[opcode]);

		if (opcodes[opcode] === 'Text Frame') {
			const text = new TextDecoder().decode(payload);
			console.log('Message:', text);
			socket.write(generateWebSocketResponse('Echo: ' + text + ` [${++count}]`));
		} else if (opcodes[opcode] === 'Ping') {
			const buffer = Buffer.alloc(length + 2);

			// FIN + opcode (Pong)
			buffer[0] = 0b10001010; // 0x8A

			// Payload length (no masking, server frames are never masked)
			buffer[1] = length;

			if (length > 0) {
				buffer.write(payload, 2);
			}

			socket.write(buffer);
		} else if (opcodes[opcode] === 'Close') {
			socket.end();
			socket.destroy();
			console.log('Closed');
			clearInterval(interval);
		} else {
			console.log(new TextDecoder().decode(payload));
		}
	});

	const encoded = new TextEncoder().encode(req.headers.get('Sec-WebSocket-Key') + MAGIC_STRING);
	const hash = await crypto.subtle.digest('SHA-1', encoded);

	return new HTTPResponse(null, {
		status: 101,
		headers: {
			Upgrade: 'websocket',
			Connection: 'Upgrade',
			'Sec-WebSocket-Accept': new Uint8Array(hash).toBase64({ alphabet: 'base64' }),
			'Cache-Control': 'no-store',
		}
	});
}
