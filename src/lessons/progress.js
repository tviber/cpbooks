import { createMapLesson } from './dijkstra.js';
import { MAP_SCENARIOS } from './towns.js';

export function restoreLesson(saved) {
  const scenario = MAP_SCENARIOS.find(item => item.id === saved?.scenario);
  if (!scenario?.stops.some(stop => stop.id === saved.source)) return null;
  const lesson = createMapLesson(scenario.id, saved.source);
  if (scenario.stops.some(stop => stop.id === saved.target)) lesson.target = saved.target;
  lesson.comparing = saved.comparing === true;
  if (scenario.stops.some(stop => stop.id === saved.inspected)) lesson.inspected = saved.inspected;
  // Source edits can change every step. Only a newly executed trace has valid indices.
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

