import './style.css';
import { BookScene } from './scene/renderer.js';
import { createVector, vectorOperation, inspectElement } from './lessons/vector.js';
import { createSearch, probeSearch, chooseHalf, harvestWood, forestResult, SCENARIOS, validateProblem } from './lessons/binary.js';
import { shell } from './ui/shared.js';
import { vectorView } from './ui/vector-view.js';
import { binaryView } from './ui/binary-view.js';
import { studioView } from './ui/studio-view.js';
import { createMapLesson, mapDisplay } from './lessons/dijkstra.js';
import { lessonForLocation } from './lessons/progress.js';
import { MAP_SCENARIOS } from './lessons/towns.js';
import { dijkstraView, mapHelp } from './ui/dijkstra-view.js';
import { MapSigns } from './ui/map-signs.js';

const chapters = {
  dijkstra: { title: '第一章 · Dijkstra 最短路', folio: '第一章 · Dijkstra 最短路' },
};

function saveLessonState() {
  const { scenario, source, index, target, comparing, inspected, routeIndex } = model.map;
  const dijkstra = { scenario: scenario.id, source, index, target, comparing, inspected, routeIndex };
  try { localStorage.setItem('dijkstra.last', JSON.stringify(dijkstra)); } catch { /* Progress is optional. */ }
  history.replaceState({ ...history.state, lessonHash: location.hash, dijkstra }, '');
}

function syncChapterLink() {
  const { scenario, comparing } = model.map;
  const variant = model.chapter === 'dijkstra' && (scenario.id !== 'everyday' || comparing);
  const suffix = variant ? `/${scenario.id}${comparing ? '/compare' : ''}` : '';
  const hash = `#${model.chapter}${suffix}`;
  if (location.hash !== hash) history.pushState(null, '', hash);
}

const STORAGE_KEY = 'lessonProgress';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { saved = {}; }
const model = {
  chapter: 'dijkstra', map: lessonForLocation(),
  vector: createVector(), vectorHistory: [], vectorChallenge: false,
  vectorMilestones: { inspected: false, filled: false, migrated: false, reserved: false },
  nextValue: 48, reserveValue: 8, selectedIndex: null, prediction: null,
  binary: createSearch(), binaryMode: 'explore', binaryHint: '', binaryMessage: '',
  sawHeight: 14, cutResult: null, trials: [], scenarioIndex: 0,
  achievements: { vector: saved.vector === true, binary: saved.forest === true }, busy: false,
  drawerTab: 'learn',
};

document.querySelector('#app').innerHTML = shell();
const elements = Object.fromEntries(['lesson-title', 'lesson-subtitle', 'stats', 'controls', 'accessible-model', 'lesson-panel', 'code', 'code-caption', 'explanation', 'settings', 'feedback', 'drawer-feedback', 'drawer-chapter', 'progress-summary'].map(id => [id, document.getElementById(id)]));
const drawer = document.getElementById('study-drawer');
const mapSwitches = document.getElementById('map-switches');
const scenarioSelect = document.getElementById('map-scenario');
scenarioSelect.append(...MAP_SCENARIOS.map(({ id, name, stops }) => new Option(`${name} · ${stops.length} 站`, id)));
let scene;
try {
  scene = new BookScene(document.getElementById('scene'), action => {
    if (action.type === 'slot' && model.chapter === 'vector') inspect(action.index);
    if (['height', 'saw-height'].includes(action.type) && model.chapter === 'binary') selectHeight(action.value);
    if (action.type === 'stop' && model.chapter === 'dijkstra') inspectStop(action.id);
  });
} catch (error) {
  document.getElementById('scene').innerHTML = '<div class="scene-fallback"><h2>用平面模型继续实验</h2><p>此设备暂时无法显示三维画面。</p><button data-action="drawer" data-tab="settings">打开槽位与刻度</button></div>';
  console.warn('WebGL scene unavailable:', error.message);
}
const signs = new MapSigns(document.getElementById('scene'));
if (!scene) signs.useFlatMap();
let mapTimer = null;

function stopPlayback() {
  clearTimeout(mapTimer);
  mapTimer = null;
  model.map.playing = false;
}

function showMapStep(index, autoplay = false) {
  stopPlayback();
  const lesson = model.map;
  lesson.index = Math.min(lesson.frames.length - 1, Math.max(0, index));
  lesson.inspected = null;
  lesson.routeIndex = 0;
  lesson.playing = autoplay && lesson.index < lesson.frames.length - 1;
  render();
  drawCurrent();
  if (lesson.playing) mapTimer = setTimeout(() => showMapStep(lesson.index + 1, true), 3400);
}

function inspectStop(id) {
  stopPlayback();
  const lesson = model.map;
  if (lesson.comparing) lesson.target = id;
  else {
    lesson.inspected = lesson.inspected === id ? null : id;
    if (lesson.inspected) lesson.target = id;
  }
  lesson.routeIndex = 0;
  render();
  drawCurrent();
}

function changeMapExample(scenarioId, source) {
  const previous = model.map;
  stopPlayback();
  model.map = createMapLesson(scenarioId, source);
  model.map.comparing = previous.comparing;
  if (previous.scenario.id === scenarioId) {
    model.map.target = previous.target === model.map.source ? previous.source : previous.target;
  }
  syncChapterLink();
  showMapStep(0);
}

function persistAchievement(chapter) {
  model.achievements[chapter] = true;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ vector: model.achievements.vector, forest: model.achievements.binary })); } catch {}
}

function render() {
  const focusedId = document.activeElement?.id;
  const focusedAction = document.activeElement?.dataset.action;
  const focusedIndex = document.activeElement?.dataset.index;
  const isMap = model.chapter === 'dijkstra';
  const display = isMap ? mapDisplay(model.map) : null;
  const detail = isMap ? dijkstraView(model.map, display) : model.chapter === 'vector' ? vectorView(model) : binaryView(model);
  const view = isMap ? detail : studioView(model, detail);
  elements['lesson-title'].textContent = view.title;
  elements['lesson-subtitle'].textContent = view.subtitle;
  elements.stats.innerHTML = view.stats;
  elements.controls.innerHTML = view.controls;
  elements.controls.setAttribute('aria-busy', String(model.busy));
  elements['accessible-model'].innerHTML = view.accessible;
  elements['lesson-panel'].innerHTML = view.panel;
  elements.code.innerHTML = view.code;
  elements['code-caption'].textContent = view.codeCaption;
  elements.explanation.innerHTML = view.explanation;
  elements.settings.innerHTML = view.settings;
  elements.feedback.textContent = view.message;
  elements.feedback.classList.remove('error');
  elements['drawer-feedback'].textContent = detail.message;
  elements['drawer-feedback'].classList.remove('error');
  elements['drawer-chapter'].textContent = chapters[model.chapter].folio;
  elements['progress-summary'].textContent = isMap ? '' : `已完成挑战 ${Number(model.achievements.vector) + Number(model.achievements.binary)} / 2 · 进度保存在此浏览器`;
  elements['progress-summary'].hidden = isMap;
  const studio = document.querySelector('.studio');
  studio.dataset.mode = model.chapter === 'binary' ? model.binaryMode : model.chapter;
  if (isMap) studio.dataset.town = model.map.scenario.id;
  else delete studio.dataset.town;
  signs.layer.hidden = !isMap;
  mapSwitches.hidden = !isMap;
  const legend = '圆牌 · 路段用时　方牌 · 总用时（分）';
  document.querySelector('.scene-hint').textContent = isMap ? (scene ? legend : `三维不可用，已切换平面地图。${legend}`) : '拖动旋转 · 双指缩放';
  document.querySelector('[data-action="home"]').hidden = !scene;
  if (isMap) {
    saveLessonState();
    scenarioSelect.value = model.map.scenario.id;
    const compareButton = document.getElementById('map-compare');
    compareButton.textContent = model.map.comparing ? '返回推演' : '比较路线';
    compareButton.setAttribute('aria-pressed', String(model.map.comparing));
    signs.update(display);
  }
  if (model.busy) document.querySelectorAll('[data-action="choose-half"], [data-action="next-problem"]').forEach(button => { button.disabled = true; });
  document.querySelector('[data-action="reset-current"]').disabled = model.busy;
  selectDrawerTab(model.drawerTab);
  if (focusedId) document.getElementById(focusedId)?.focus({ preventScroll: true });
  else if (drawer.open && focusedAction === 'inspect') drawer.querySelector(`[data-action="inspect"][data-index="${focusedIndex}"]`)?.focus({ preventScroll: true });
  else if (drawer.open && focusedAction === 'predict-vector') focusAction('predict-vector');
  document.title = isMap
    ? `${model.map.scenario.name}的最短路 · 纸上算法`
    : `纸上算法 · ${chapters[model.chapter].title}`;
}

function announce(message, error = false) {
  for (const element of [elements.feedback, elements['drawer-feedback']]) {
    element.textContent = message;
    element.classList.toggle('error', error);
  }
}

function focusAction(action) {
  requestAnimationFrame(() => {
    const scope = drawer.open ? drawer : document;
    [...scope.querySelectorAll(`[data-action="${action}"]:not(:disabled)`)].find(button => button.getClientRects().length)?.focus({ preventScroll: true });
  });
}

function selectDrawerTab(tab) {
  model.drawerTab = ['learn', 'code', 'settings'].includes(tab) ? tab : 'learn';
  for (const name of ['learn', 'code', 'settings']) {
    const selected = name === model.drawerTab;
    document.getElementById(`${name}-pane`).hidden = !selected;
    document.getElementById(`${name}-tab`).setAttribute('aria-selected', String(selected));
    document.getElementById(`${name}-tab`).tabIndex = selected ? 0 : -1;
  }
}

function openDrawer(tab) {
  if (model.map.playing) { stopPlayback(); render(); }
  selectDrawerTab(tab);
  if (!drawer.open) drawer.showModal();
  document.getElementById(`${model.drawerTab}-tab`).focus({ preventScroll: true });
}

function drawCurrent(animate = false, previousRange = null) {
  if (model.chapter === 'dijkstra') return scene?.setMap(mapDisplay(model.map), signs);
  if (model.chapter === 'vector') return scene?.setVector(model.vector);
  const exploring = model.binaryMode === 'explore';
  const state = exploring ? { ...model.binary, lo: 0, hi: Math.max(...model.binary.heights), done: false, answer: null } : model.binary;
  return scene?.setBinary(state, forestResult(model), previousRange, { interactive: exploring, animate, measured: !exploring || !!model.cutResult });
}

async function animateForest(previousRange = null) {
  model.busy = !!scene;
  render();
  try { await drawCurrent(!previousRange, previousRange); }
  finally { model.busy = false; render(); }
}

function changeChapter(chapter) {
  if (model.busy || !Object.hasOwn(chapters, chapter)) return;
  stopPlayback();
  model.chapter = chapter;
  syncChapterLink();
  render();
  drawCurrent();
  scene?.reopen();
  scene?.home();
}

async function mutateVector(operation) {
  if (model.busy) return;
  const value = operation === 'push' ? model.nextValue : model.reserveValue;
  try {
    const previous = model.vector;
    const next = vectorOperation(previous, operation, value);
    drawer.close();
    model.vectorHistory.push({ vector: previous, milestones: { ...model.vectorMilestones } });
    model.vector = next;
    model.selectedIndex = null;
    model.prediction = null;
    if (operation === 'push') model.nextValue = Math.min(999, value + 12);
    if (next.values.length === next.capacity && next.capacity) model.vectorMilestones.filled = true;
    if (next.moved > previous.moved) model.vectorMilestones.migrated = true;
    if (operation === 'reserve') model.vectorMilestones.reserved = true;
    if (model.vectorChallenge && next.values.length >= 8 && next.moved === 0) persistAchievement('vector');
    model.busy = !!scene && next.allocation !== previous.allocation && previous.values.length > 0;
    render();
    await scene?.setVector(next, previous);
    model.busy = false;
    render();
    focusAction(operation === 'pop' ? 'pop' : 'push');
  } catch (error) {
    model.busy = false;
    announce(error.message, true);
  }
}

function resetVector(challenge = false) {
  drawer.close();
  model.vector = createVector(challenge);
  model.vectorHistory = [];
  model.vectorMilestones = { inspected: false, filled: false, migrated: false, reserved: false };
  model.vectorChallenge = challenge;
  model.selectedIndex = null;
  model.prediction = null;
  model.nextValue = challenge ? 12 : 48;
  model.reserveValue = 8;
  render();
  scene?.setVector(model.vector);
  focusAction('push');
}

function inspect(index) {
  if (model.busy) return;
  if (index >= model.vector.values.length) {
    announce(`v[${index}] 超出 size，空位不能访问。请先添加元素。`, true);
    return;
  }
  const item = inspectElement(model.vector, index);
  model.vectorMilestones.inspected = true;
  model.selectedIndex = index;
  model.vector = { ...model.vector, message: `v[${index}] = ${item.value}。示意字节地址：${item.address}，即起始字节地址 + ${index} × sizeof(int)。C++ 的 data() + ${index} 已自动按元素大小偏移。` };
  render();
}

function resetBinary(heights = model.binary.heights, target = model.binary.target) {
  model.binary = createSearch(heights, target);
  model.sawHeight = Math.floor(Math.max(...heights) * 0.7);
  model.cutResult = null;
  model.trials = [];
  model.binaryHint = '';
  model.binaryMessage = '';
  render();
  drawCurrent();
}

let forestFrame = null;
function selectHeight(value) {
  if (model.busy) return;
  if (model.binaryMode === 'search') {
    announce('二分挑战需要检验当前区间的中点。切换到“自由试砍”可以选择任意合法高度。');
    return;
  }
  if (model.sawHeight === value) return;
  const result = harvestWood(model.binary.heights, model.binary.target, value);
  model.sawHeight = value;
  model.cutResult = null;
  model.binaryMessage = `实时预览 H = ${value} 米：${result.contributions.join(' + ')} = ${result.wood} 米，${result.feasible ? '木材足够，还可以尝试抬高锯片。' : '木材不足，需要降低锯片。'}`;
  document.getElementById('height-output').textContent = value;
  document.getElementById('saw-height').value = value;
  const detail = binaryView(model);
  const view = studioView(model, detail);
  elements.stats.innerHTML = view.stats;
  elements['accessible-model'].innerHTML = view.accessible;
  elements.code.innerHTML = view.code;
  elements['code-caption'].textContent = view.codeCaption;
  elements.feedback.textContent = view.message;
  elements.feedback.classList.remove('error');
  elements['drawer-feedback'].textContent = model.binaryMessage;
  elements['drawer-feedback'].classList.remove('error');
  if (drawer.open) drawer.querySelector(`[data-action="ruler"][data-value="${value}"]`)?.focus({ preventScroll: true });
  if (forestFrame !== null) cancelAnimationFrame(forestFrame);
  forestFrame = requestAnimationFrame(() => {
    forestFrame = null;
    if (model.chapter === 'binary' && !model.busy) drawCurrent();
  });
}

function openManual(custom = false) {
  drawer.close();
  const dialog = document.getElementById('manual');
  document.getElementById('manual-title').textContent = custom ? '设计你的森林题目' : '这本书，怎么读？';
  dialog.querySelector('.manual-content').innerHTML = custom
    ? `<form id="problem-form"><p>输入 2 到 6 棵树的高度，用空格或逗号分隔。每棵树 1–50 米，顺序无需调整。</p><label class="forest-input">树高 / 米<input name="heights" type="text" required value="${model.binary.heights.join(', ')}" autocomplete="off"></label><label class="custom-target">至少需要多少米木材？<input name="target" type="number" min="1" max="500" step="1" required value="${model.binary.target}"></label><p id="form-error" role="alert"></p><button class="primary" type="submit">开始这道题</button></form>`
    : model.chapter === 'dijkstra' ? mapHelp : `<p class="manual-lead">先动手，再把变化看清楚。</p><ol><li><strong>翻开章节。</strong> 上方可以切换章节，各章分别保留本次操作。</li><li><strong>探索模型。</strong> 拖动书本改变视角，用滚轮或双指缩放。点击小屋查看元素；拖动橙色手柄或滑块调整锯片。</li><li><strong>需要时再翻讲解。</strong> 右上角打开讲解与 C++ 代码；实验设置里可以 reserve、换题、修改树高和木材需求，也提供槽位与刻度按钮。</li><li><strong>完成挑战。</strong> 点击底部“开始挑战”，跟随当前问题进行下一步。撤销回到上一轮，右下角重置当前实验。</li></ol><div class="manual-note"><strong>模型说明</strong><p>vector 使用逻辑存储区块，假定 int 为 4 字节；C++ 实际大小和增长策略依实现而定。预留空槽没有元素。</p><p>每次试砍基于原始树高，统计的是高度差而非体积。H = 0 合法，木材总量不足时单独提示无解。二分使用闭区间和向上取整的中点。</p></div>`;
  dialog.showModal();
}

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const { action } = button.dataset;
  if (model.busy && !['home', 'home-page', 'drawer', 'drawer-tab', 'close-drawer', 'manual', 'close-manual'].includes(action)) return;
  try {
    switch (action) {
      case 'home-page':
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        stopPlayback();
        if (location.hash) history.pushState(null, '', button.href);
        render();
        break;
      case 'chapter': changeChapter(button.dataset.chapter); break;
      case 'home': scene?.home(); break;
      case 'drawer': openDrawer(button.dataset.tab); break;
      case 'drawer-tab': selectDrawerTab(button.dataset.tab); break;
      case 'close-drawer': drawer.close(); break;
      case 'reset-current':
        if (model.chapter === 'dijkstra') { model.map.comparing = false; syncChapterLink(); showMapStep(0); }
        else if (model.chapter === 'vector') resetVector(model.vectorChallenge);
        else resetBinary();
        break;
      case 'map-play': {
        if (model.map.playing) { stopPlayback(); render(); }
        else showMapStep(model.map.index === model.map.frames.length - 1 ? 0 : model.map.index + 1, true);
        break;
      }
      case 'map-next': showMapStep(model.map.index + 1); break;
      case 'map-back': showMapStep(model.map.index - 1); break;
      case 'map-inspect': inspectStop(button.dataset.stop); break;
      case 'map-compare': {
        stopPlayback();
        const lesson = model.map;
        lesson.comparing = !lesson.comparing;
        lesson.routeIndex = 0;
        syncChapterLink();
        render();
        drawCurrent();
        break;
      }
      case 'map-alternate': {
        const count = mapDisplay(model.map).routes.length;
        if (count > 1) {
          model.map.routeIndex = (model.map.routeIndex + 1) % count;
          render();
          drawCurrent();
        }
        break;
      }
      case 'reopen': scene?.reopen(); break;
      case 'manual': openManual(); break;
      case 'close-manual': document.getElementById('manual').close(); break;
      case 'push': case 'pop': case 'reserve': await mutateVector(action); break;
      case 'predict-vector': {
        const needs = model.vector.values.length === model.vector.capacity;
        const correct = (button.dataset.choice === 'yes') === needs;
        model.prediction = { correct, message: `${correct ? '✓ 判断正确。' : '再看一眼：'}${needs ? 'size 等于 capacity，添加前需要新存储。' : `还剩 ${model.vector.capacity - model.vector.values.length} 个空槽位，可以直接添加。`}` };
        render();
        announce(model.prediction.message);
        break;
      }
      case 'inspect': inspect(Number(button.dataset.index)); break;
      case 'undo-vector': {
        const snapshot = model.vectorHistory.pop();
        if (!snapshot) break;
        model.vector = snapshot.vector;
        model.vectorMilestones = snapshot.milestones;
        model.selectedIndex = null;
        model.prediction = null;
        render();
        scene?.setVector(model.vector);
        announce('已撤销上一步，恢复操作前的值、容量与存储区块。');
        focusAction('undo-vector');
        break;
      }
      case 'reset-vector': resetVector(model.vectorChallenge); break;
      case 'challenge-vector': resetVector(true); break;
      case 'exit-vector-challenge': resetVector(false); break;
      case 'binary-mode': {
        drawer.close();
        if (model.binaryMode === button.dataset.mode) break;
        model.binaryMode = button.dataset.mode;
        model.binaryHint = '';
        model.binaryMessage = '';
        render();
        drawCurrent();
        break;
      }
      case 'ruler': selectHeight(Number(button.dataset.value)); break;
      case 'cut': {
        model.cutResult = harvestWood(model.binary.heights, model.binary.target, model.sawHeight);
        model.trials = [...model.trials, model.cutResult];
        const result = model.cutResult;
        model.binaryMessage = `H = ${result.height} 米：${result.contributions.join(' + ')} = ${result.wood} 米，${result.feasible ? '足够，可以继续尝试抬高锯片。' : '不足，更高的锯片也不可能满足需求。'}本次基于原始树高试砍。`;
        await animateForest();
        focusAction('cut');
        break;
      }
      case 'probe': {
        model.binary = probeSearch(model.binary);
        model.binaryHint = '';
        const result = model.binary.pending;
        model.binaryMessage = `检验 H = ${result.height} 米：得到 ${result.wood} 米木材，需求 ${model.binary.target} 米。根据是否足够，选择要保留的半个高度区间。`;
        await animateForest();
        focusAction('choose-half');
        break;
      }
      case 'choose-half': {
        const before = model.binary;
        const next = chooseHalf(before, button.dataset.direction);
        model.binary = next;
        if (next.mistakes > before.mistakes) {
          model.binaryHint = before.pending.feasible ? '木材足够，还可以尝试更高的锯片。保留右段，并留下 mid。' : '木材不足，更高的锯片只会得到更少或同样多的木材。保留左段，排除 mid。';
          render();
          announce(model.binaryHint, true);
          break;
        }
        model.binaryHint = '';
        model.binaryMessage = next.done
          ? `找到了！最高可行锯片高度为 ${next.answer} 米。${next.answer === 0 ? '必须从地面切割，0 是合法答案。' : '这个高度足够，再高一米就不够。'}`
          : `判断正确。${before.pending.feasible ? '木材足够，保留 mid 并尝试更高。' : '木材不足，排除 mid 和更高的值。'}新区间为 [${next.lo}, ${next.hi}]。`;
        if (next.done && next.possible) persistAchievement('binary');
        await animateForest([before.lo, before.hi]);
        focusAction(next.done ? 'next-problem' : 'probe');
        break;
      }
      case 'undo-binary': {
        const current = model.binary;
        if (current.pending) model.binary = { ...current, pending: null };
        else if (current.history.length) {
          const last = current.history.at(-1);
          model.binary = { ...current, lo: last.before[0], hi: last.before[1], history: current.history.slice(0, -1), pending: null, done: false, answer: null };
        }
        model.binaryHint = '';
        model.binaryMessage = '已撤销本轮，恢复到检验中点之前。';
        render();
        drawCurrent();
        focusAction('probe');
        break;
      }
      case 'reset-binary': resetBinary(); break;
      case 'next-problem': {
        drawer.close();
        model.scenarioIndex = (model.scenarioIndex + 1) % SCENARIOS.length;
        const problem = SCENARIOS[model.scenarioIndex];
        resetBinary(problem.heights, problem.target);
        break;
      }
      case 'change-target': {
        const target = Number(document.getElementById('wood-target').value);
        validateProblem(model.binary.heights, target);
        model.scenarioIndex = -1;
        resetBinary(model.binary.heights, target);
        announce(`需求已改为 ${target} 米，树高保持不变，开始新的实验。`);
        break;
      }
      case 'custom-problem': openManual(true); break;
      default: break;
    }
  } catch (error) { announce(error.message, true); }
});

document.addEventListener('input', event => {
  if (event.target.id === 'element-value') model.nextValue = event.target.value === '' ? NaN : Number(event.target.value);
  if (event.target.id === 'reserve-value') model.reserveValue = event.target.value === '' ? NaN : Number(event.target.value);
  if (event.target.id === 'saw-height') selectHeight(Number(event.target.value));
});

document.addEventListener('change', event => {
  if (event.target.id === 'map-scenario') { changeMapExample(event.target.value); return; }
  if (event.target.id === 'map-target') { inspectStop(event.target.value); return; }
  if (event.target.id === 'map-source') {
    const source = event.target.value;
    drawer.close();
    changeMapExample(model.map.scenario.id, source);
    return;
  }
  if (event.target.id === 'map-seek') {
    model.map.comparing = false;
    syncChapterLink();
    showMapStep(Number(event.target.value) - 1);
    return;
  }
  if (event.target.id !== 'scenario-select') return;
  model.scenarioIndex = Number(event.target.value);
  const problem = SCENARIOS[model.scenarioIndex];
  if (problem) resetBinary(problem.heights, problem.target);
});

document.addEventListener('submit', event => {
  if (event.target.id !== 'problem-form') return;
  event.preventDefault();
  const data = new FormData(event.target);
  const heights = String(data.get('heights')).trim().split(/[\s,，、]+/).map(Number);
  const target = Number(data.get('target'));
  try {
    validateProblem(heights, target);
    model.scenarioIndex = -1;
    resetBinary(heights, target);
    document.getElementById('manual').close();
  } catch (error) { document.getElementById('form-error').textContent = error.message; }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target.id === 'element-value') mutateVector('push');
  if (event.key === 'Enter' && event.target.id === 'reserve-value') mutateVector('reserve');
  if (event.target.matches('[role="tab"]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const tabs = ['learn', 'code', 'settings'];
    const index = tabs.indexOf(model.drawerTab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : -1) + 3) % 3;
    selectDrawerTab(tabs[next]);
    document.getElementById(`${tabs[next]}-tab`).focus();
  }
});
window.addEventListener('popstate', () => {
  stopPlayback();
  model.map = lessonForLocation();
  model.chapter = 'dijkstra';
  model.drawerTab = 'learn';
  render();
  drawCurrent();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && model.map.playing) { stopPlayback(); render(); }
});
document.getElementById('scene').addEventListener('scene-error', event => announce(event.detail, true));
for (const dialog of [drawer, document.getElementById('manual')]) {
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
}
render();
drawCurrent();
scene?.home();
