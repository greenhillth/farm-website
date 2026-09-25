// Minimal stand-in for gbros-api used by scripts/smoke-test.sh: echoes what it received.
import { createServer } from 'node:http';

const port = Number(process.env.STUB_PORT ?? 8099);
const host = process.env.STUB_HOST ?? '127.0.0.1';

createServer((req, res) => {
	let bytes = 0;
	req.on('data', (chunk) => (bytes += chunk.length));
	req.on('end', () => {
		res.setHeader('content-type', 'application/json');
		res.end(JSON.stringify({ method: req.method, path: req.url, bytes }));
	});
}).listen(port, host, () => console.log(`stub backend on ${host}:${port}`));
