import { MAP_SCENARIOS } from '../lessons/towns.js';
import { icons } from './shared.js';

export function homeView() {
  return `<main class="book-home" id="book-home">
    <div class="book-stage">
      <section class="open-spread" aria-label="第一章" inert>
        <div class="spread-page spread-left">
          <span class="chapter-kicker">第一章</span>
          <h1>Dijkstra <br>最短路</h1>
          <p>两地之间，经过的站点最少，路上用的时间也最短吗？</p>
          <p>选一张地图，从出发站开始推演。每走一步，看看沿途哪块站牌上的用时变短了。</p>
          <button id="resume-lesson" class="text-button" data-action="resume-lesson" hidden>继续上次推演</button>
        </div>
        <div class="spread-page spread-right">
          <h2 id="contents-title" tabindex="-1">选择地图</h2>
          <nav class="chapter-scenes" aria-label="第一章地图">${MAP_SCENARIOS.map(({ id, name, stops }) => `<a class="scene-link" href="#dijkstra/${id}"><span><strong>${name}</strong><small>${stops[0].name} → ${stops.at(-1).name}</small></span><span class="scene-count">${stops.length} 站</span>${icons.arrow}</a>`).join('')}</nav>
          <a class="close-book" href="./" data-action="home-page">合上书本</a>
        </div>
      </section>
      <div class="book-cover"><div class="cover-face">
        <div class="cover-imprint" aria-hidden="true">${icons.book}</div>
        <h1>纸上算法</h1>
        <p class="cover-subtitle">互动立体书</p>
        <div class="cover-landscape" aria-hidden="true"></div>
        <a href="#contents" class="open-book" aria-label="翻开第一章 · Dijkstra 最短路"><small>第一章</small><span>Dijkstra 最短路 ${icons.arrow}</span></a>
      </div></div>
    </div>
  </main>`;
}
