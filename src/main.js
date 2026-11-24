import './style.css';
import './ui/home.css';
import { homeView } from './ui/home-view.js';
import { BookScene } from './scene/renderer.js';
import { createMapLesson, mapDisplay } from './lessons/dijkstra.js';
import { lastReadLesson, lessonForLocation } from './lessons/progress.js';
import { MAP_SCENARIOS } from './lessons/towns.js';
import { dijkstraView } from './ui/dijkstra-view.js';
import { MapSigns } from './ui/map-signs.js';
import { shell } from './ui/shared.js';

const byId = id => document.getElementById(id);
document.querySelector('#app').innerHTML = shell() + homeView();
const studio = document.querySelector('.studio');
const bookHome = byId('book-home');
const spread = bookHome.querySelector('.open-spread');
const cover = bookHome.querySelector('.book-cover');
const drawer = byId('study-drawer');
const scenarioSelect = byId('map-scenario');
scenarioSelect.append(...MAP_SCENARIOS.map(({ id, name, stops }) => new Option(`${name} · ${stops.length} 站`, id)));
let lesson;
let timer;
let scene;
let signs;

function initializeScene() {
  try {
    scene = new BookScene(byId('scene'), action => {
      if (lesson && action.type === 'stop') inspectStop(action.id);
    });
  } catch (error) {
    console.warn('WebGL scene unavailable:', error.message);
  }
  signs = new MapSigns(byId('scene'));
  if (!scene) signs.useFlatMap();
  byId('scene').addEventListener('scene-error', event => { byId('feedback').textContent = event.detail; });
  document.querySelector('[data-action="home"]').hidden = !scene;
  document.querySelector('.scene-hint').textContent = `${scene ? '' : '平面地图 · '}圆牌 · 路段用时　方牌 · 总用时（分）`;
}

function saveProgress() {
  const { scenario, source, index, target, comparing, inspected, routeIndex } = lesson;
  const dijkstra = { scenario: scenario.id, source, index, target, comparing, inspected, routeIndex };
  try { localStorage.setItem('dijkstra.last', JSON.stringify(dijkstra)); } catch { /* Optional local progress. */ }
  history.replaceState({ ...history.state, lessonHash: location.hash, dijkstra }, '');
}

function lessonLink({ scenario, comparing }) {
  const suffix = scenario.id !== 'everyday' || comparing ? `/${scenario.id}${comparing ? '/compare' : ''}` : '';
  return `#dijkstra${suffix}`;
}

function syncLink() {
  const hash = lessonLink(lesson);
  if (location.hash !== hash) history.pushState(null, '', hash);
}

function render() {
  const focused = document.activeElement?.id;
  const display = mapDisplay(lesson);
  const view = dijkstraView(lesson, display);
  document.title = `${lesson.scenario.name}的最短路 · 纸上算法`;
  document.querySelector('.studio').dataset.town = lesson.scenario.id;
  byId('lesson-title').textContent = view.title;
  byId('lesson-subtitle').textContent = view.subtitle;
  byId('stats').innerHTML = view.stats;
  byId('controls').innerHTML = view.controls;
  byId('feedback').textContent = view.message;
  byId('settings').innerHTML = view.settings;
  byId('accessible-model').innerHTML = view.accessible;
  scenarioSelect.value = lesson.scenario.id;
  byId('map-compare').textContent = lesson.comparing ? '返回推演' : '比较路线';
  byId('map-compare').setAttribute('aria-pressed', String(lesson.comparing));
  signs.update(display);
  scene?.setMap(display, signs);
  saveProgress();
  if (focused) byId(focused)?.focus({ preventScroll: true });
}

function stopPlayback() {
  clearTimeout(timer);
  if (lesson) lesson.playing = false;
}

function showStep(index, autoplay = false) {
  stopPlayback();
  lesson.index = Math.max(0, Math.min(index, lesson.frames.length - 1));
  lesson.inspected = null;
  lesson.routeIndex = 0;
  lesson.playing = autoplay && lesson.index < lesson.frames.length - 1;
  render();
  if (lesson.playing) timer = setTimeout(() => showStep(lesson.index + 1, true), 3400);
}

function inspectStop(id) {
  stopPlayback();
  if (lesson.comparing) lesson.target = id;
  else {
    lesson.inspected = lesson.inspected === id ? null : id;
    if (lesson.inspected) lesson.target = id;
  }
  lesson.routeIndex = 0;
  render();
}

function changeMap(id, source) {
  const previous = lesson;
  stopPlayback();
  lesson = createMapLesson(id, source);
  lesson.comparing = previous.comparing;
  if (previous.scenario.id === id) lesson.target = previous.target === lesson.source ? previous.source : previous.target;
  syncLink();
  render();
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  switch (button.dataset.action) {
    case 'home-page':
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      stopPlayback();
      if (location.hash) history.pushState(null, '', button.href);
      showLocation(true);
      break;
    case 'resume-lesson': {
      const saved = lastReadLesson();
      history.pushState(null, '', saved ? lessonLink(saved) : '#dijkstra');
      showLocation(true, saved);
      break;
    }
    case 'home': scene?.home(); break;
    case 'drawer': stopPlayback(); render(); drawer.showModal(); break;
    case 'close-drawer': drawer.close(); break;
    case 'reset-current': lesson.comparing = false; syncLink(); showStep(0); break;
    case 'map-play':
      if (lesson.playing) { stopPlayback(); render(); }
      else showStep(lesson.index === lesson.frames.length - 1 ? 0 : lesson.index + 1, true);
      break;
    case 'map-next': showStep(lesson.index + 1); break;
    case 'map-back': showStep(lesson.index - 1); break;
    case 'map-inspect': inspectStop(button.dataset.stop); break;
    case 'map-compare':
      stopPlayback();
      lesson.comparing = !lesson.comparing;
      lesson.routeIndex = 0;
      syncLink();
      render();
      break;
    case 'map-alternate': {
      const count = mapDisplay(lesson).routes.length;
      if (count > 1) { lesson.routeIndex = (lesson.routeIndex + 1) % count; render(); }
      break;
    }
  }
});

document.addEventListener('change', ({ target }) => {
  switch (target.id) {
    case 'map-scenario': changeMap(target.value); break;
    case 'map-target': inspectStop(target.value); break;
    case 'map-source': drawer.close(); changeMap(lesson.scenario.id, target.value); break;
    case 'map-seek': lesson.comparing = false; syncLink(); showStep(Number(target.value) - 1); break;
  }
});
drawer.addEventListener('click', event => {
  if (event.target !== drawer) return;
  const rect = drawer.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) drawer.close();
});
function showLocation(focus = false, saved = null) {
  stopPlayback();
  if (drawer.open) drawer.close();
  const onBook = !location.hash || location.hash === '#contents';
  const opening = location.hash === '#contents';
  const enteringLesson = studio.hidden || !signs;
  studio.hidden = onBook;
  bookHome.hidden = !onBook;
  document.querySelector('.header-tools').hidden = onBook;
  if (onBook) {
    lesson = null;
    scene?.renderer.setAnimationLoop(null);
    bookHome.classList.toggle('is-open', opening);
    cover.inert = opening;
    spread.inert = !opening;
    if (opening) byId('resume-lesson').hidden = !lastReadLesson();
    document.title = opening ? '第一章 · Dijkstra 最短路 · 纸上算法' : '纸上算法 · 互动立体书';
    if (focus) (opening ? byId('contents-title') : bookHome.querySelector('.open-book')).focus({ preventScroll: true });
    return;
  }
  lesson = saved ?? lessonForLocation();
  if (!signs) initializeScene();
  render();
  if (enteringLesson && scene) {
    scene.resize();
    scene.home();
    scene.reopen();
    scene.renderer.setAnimationLoop(scene.frame);
  }
  if (focus && enteringLesson) byId('lesson-title').focus({ preventScroll: true });
}
window.addEventListener('popstate', () => showLocation(true));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && lesson?.playing) { stopPlayback(); render(); }
});
showLocation();
