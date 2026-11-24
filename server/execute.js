import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { casesFor, verify } from './verify.js';

export async function execute({ code, scenario, source }) {
  if (typeof code !== 'string' || !code.trim() || Buffer.byteLength(code) > 16384) throw new Error('Enter up to 16 KiB of C++ source');
  const cases = casesFor(scenario, source);
  const name = `cpbooks-${randomUUID()}`;
  const args = ['run', '--rm', '-i', '--pull=never', '--name', name, '--network=none', '--read-only',
    '--user=65534:65534', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=32',
    '--memory=512m', '--memory-swap=512m', '--cpus=1', '--ulimit', 'nofile=64:64',
    '--tmpfs', '/tmp:rw,exec,nosuid,nodev,size=64m,mode=1777', 'cpbooks-dijkstra:1'];
  const payload = await new Promise(resolve => {
    const child = execFile('docker', args, { timeout: 40000, killSignal: 'SIGKILL', maxBuffer: 300000 }, (err, stdout) => {
      if (err) {
        // Killing the attached CLI alone does not reliably stop its container.
        execFile('docker', ['rm', '-f', name], { timeout: 5000 }, () => {});
        const timedOut = err.killed;
        resolve({ error: { phase: timedOut ? 'timeout' : 'service', message: timedOut ? 'Job exceeded 40s' : 'Runner unavailable or resource limit exceeded. Check Docker and npm run runner:build.' } });
        return;
      }
      try { resolve(JSON.parse(stdout)); }
      catch { resolve({ error: { phase: 'service', message: 'Invalid runner response' } }); }
    });
    child.stdin.on('error', () => {}); // Docker can fail before consuming the request.
    child.stdin.end(JSON.stringify({ code, cases }));
  });
  if (payload.error) return payload;
  const [{ events, result }] = payload.runs;
  return { version: 1, algorithm: 'dijkstra', scenario, source, events, result,
    checks: cases.map((c, i) => verify(c, payload.runs[i].result)) };
}
