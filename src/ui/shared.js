export const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export const icons = {
  book: '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M3 5c5-2 9-1 13 2 4-3 8-4 13-2v23c-5-2-9-1-13 1-4-2-8-3-13-1V5Z" stroke="currentColor" stroke-width="1.6"/><path d="M16 7v22M7 10c2-.3 4 .1 6 1M7 14c2-.3 4 .1 6 1M20 11c2-1 4-1.3 6-1M20 15c2-1 4-1.3 6-1" stroke="currentColor" stroke-width="1.2"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 4-5 5 5 5M3 9h10a6 6 0 0 1 0 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 7a9 9 0 1 0 1 9M20 2v6h-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 6-5 6 5 6m10-12 5 6-5 6M14 3l-4 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 5h18M3 12h18M3 19h18" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="5" r="2.5" fill="var(--surface)" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="12" r="2.5" fill="var(--surface)" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="19" r="2.5" fill="var(--surface)" stroke="currentColor" stroke-width="1.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  view: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
};

export function stepList(steps) {
  return `<ol class="journey">${steps.map(([title, description, done], index) => `<li class="${done ? 'is-done' : ''}"><span class="step-number">${done ? '✓' : index + 1}</span><div><strong>${title}</strong><p>${description}</p></div></li>`).join('')}</ol>`;
}

export function codeBlock(lines, active = lines.length - 1) {
  return `<ol class="code-lines">${lines.map((line, index) => `<li class="${index === active ? 'active' : ''}"><code>${escapeHtml(line)}</code></li>`).join('')}</ol>`;
}

export function shell() {
  return `<header class="site-header">
    <a class="brand" href="/" data-action="home-page" aria-label="纸上算法首页">${icons.book}<span>纸上算法</span></a>
    <div class="header-tools"><button class="icon-button" data-action="drawer" aria-haspopup="dialog" aria-controls="study-drawer" title="播放设置" aria-label="播放设置">${icons.settings}</button></div>
  </header>
  <main class="studio" data-mode="dijkstra">
    <section class="intro" aria-labelledby="lesson-title"><h1 id="lesson-title"></h1><p id="lesson-subtitle"></p></section>
    <div class="map-switches" id="map-switches"><label for="map-scenario">场景</label><select id="map-scenario" name="map-scenario"><button><selectedcontent></selectedcontent></button></select><button id="map-compare" data-action="map-compare">比较路线</button></div>
    <div id="stats" class="live-stats" aria-label="当前状态"></div>
    <section class="scene-wrap" aria-label="立体书实验台"><div id="scene" class="scene"></div></section>
    <div class="interaction-area">
      <div id="controls" class="control-dock" aria-label="实验操作"></div>
      <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
    </div>
    <span class="scene-hint">拖动旋转 · 双指缩放</span>
    <div class="scene-tools"><button class="round-button" data-action="home" title="恢复视角" aria-label="恢复视角">${icons.view}</button><button class="round-button" data-action="reset-current" title="重置实验" aria-label="重置实验">${icons.reset}</button></div>
  </main>
  <dialog id="study-drawer" class="study-drawer" aria-labelledby="drawer-title">
    <div class="drawer-heading"><h2 id="drawer-title">播放设置</h2><button class="icon-button" data-action="close-drawer" aria-label="关闭设置">${icons.close}</button></div>
    <div class="drawer-content"><div id="settings"></div><div id="accessible-model"></div></div>
  </dialog>`;
}
