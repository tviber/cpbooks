import { execute } from './execute.js';

let running = false;
export async function executionApi(req, res, next) {
  if (req.url !== '/api/execute') return next();
  const reply = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  const reject = (status, message) => reply(status, { error: { phase: 'request', message } });
  // This plugin is a local teaching service. Do not enable execution on a public Vite host.
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(req.headers.host?.replace(/:\d+$/, '')) ||
      (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)) return reject(403, 'Local same-origin requests only');
  if (req.method !== 'POST') return reject(405, 'POST required');
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') return reject(415, 'JSON required');
  try {
    let bytes = 0;
    const chunks = [];
    for await (const chunk of req) {
      if ((bytes += chunk.length) > 100000) return reject(413, 'Request too large');
      chunks.push(chunk);
    }
    const job = JSON.parse(Buffer.concat(chunks));
    if (running) return reject(429, 'Another execution is in progress');
    running = true;
    try {
      const result = await execute(job);
      reply(result.error?.phase === 'service' ? 503 : result.error ? 422 : 200, result);
    } finally { running = false; }
  } catch (err) { reject(400, err.message); }
}
