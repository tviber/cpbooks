import { createMapLesson, mapDisplay, traceFrames } from './dijkstra.js';
import { MAP_SCENARIOS } from './towns.js';

// Each history entry stores its own cursor. Entries for the same execution share one recording.
const recordings = new Map();

export function attachExecution(lesson, trace, code) {
  const runId = crypto.randomUUID();
  const frames = traceFrames(lesson, trace);
  recordings.set(runId, { trace, code });
  Object.assign(lesson, { runId, frames, executedCode: code, checks: trace.checks });
}

export function lessonSnapshot({ scenario, source, target, comparing, inspected, index, routeIndex, runId }) {
  return { scenario: scenario.id, source, target, comparing, inspected, index, routeIndex, runId };
}

export function restoreLesson(saved) {
  const scenario = MAP_SCENARIOS.find(item => item.id === saved?.scenario);
  if (!scenario?.stops.some(stop => stop.id === saved.source)) return null;
  const lesson = createMapLesson(scenario.id, saved.source);
  if (scenario.stops.some(stop => stop.id === saved.target)) lesson.target = saved.target;
  lesson.comparing = saved.comparing === true;
  if (scenario.stops.some(stop => stop.id === saved.inspected)) lesson.inspected = saved.inspected;
  const recording = recordings.get(saved.runId);
  if (recording?.trace.scenario === scenario.id && recording.trace.source === lesson.source) {
    Object.assign(lesson, { runId: saved.runId, frames: traceFrames(lesson, recording.trace),
      executedCode: recording.code, checks: recording.trace.checks });
  }
  if (lesson.runId === saved.runId) {
    if (Number.isInteger(saved.index) && saved.index >= 0 && saved.index < lesson.frames.length) lesson.index = saved.index;
    if (Number.isInteger(saved.routeIndex) && saved.routeIndex >= 0 && saved.routeIndex < mapDisplay(lesson).routes.length) lesson.routeIndex = saved.routeIndex;
  }
  return lesson;
}

export function lessonForLocation() {
  // A history snapshot belongs to its exact URL. A fresh shared link starts at its advertised map and mode.
  if (history.state?.lessonHash === location.hash) {
    const entry = restoreLesson(history.state.dijkstra);
    if (entry) return entry;
  }
  if (!location.hash) {
    try {
      const last = restoreLesson(JSON.parse(localStorage.getItem('dijkstra.last')));
      if (last) return last;
    } catch { /* A missing or unavailable local store starts at the first map. */ }
  }
  const [chapter, scenario, mode] = location.hash.slice(1).split('/');
  if (chapter !== 'dijkstra') return createMapLesson();
  const lesson = createMapLesson(scenario);
  lesson.comparing = lesson.scenario.id === scenario && mode === 'compare';
  return lesson;
}

