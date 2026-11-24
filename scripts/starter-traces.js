// Regenerate only from actual verified runs. A failed run leaves the bundle intact.
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { execute } from '../server/execute.js';
import { MAP_SCENARIOS } from '../src/lessons/towns.js';

const code = await readFile(new URL('../src/lessons/dijkstra.cpp', import.meta.url), 'utf8');
const target = new URL('../src/lessons/starter-traces.json', import.meta.url);
const traces = [];
for (const scenario of MAP_SCENARIOS) {
  for (const { id: source } of scenario.stops) {
    const trace = await execute({ code, scenario: scenario.id, source });
    assert.ok(trace.checks?.every(c => c.passed), `Starter failed on ${scenario.id}/${source}: ${JSON.stringify(trace.error ?? trace.checks)}`);
    traces.push(trace);
  }
}
// One recording per line keeps diffs local to the changed maps.
const bundle = `{\n"code":${JSON.stringify(code)},\n"traces":[\n${traces.map(t => JSON.stringify(t)).join(',\n')}\n]}\n`;
if (process.argv.includes('--check')) assert.equal(await readFile(target, 'utf8') === bundle, true, 'Run npm run traces:generate to update the starter recordings');
else await writeFile(target, bundle);
console.log(`Verified ${traces.length} starter recordings.`);
