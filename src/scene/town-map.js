import * as THREE from 'three';
import { box } from './materials.js';
import { makeTree } from './book.js';
import { roadInk } from '../lessons/dijkstra.js';
import { cutout, disk, groupAt, mesh as solid } from './town-paper.js';
import { pointOnPath, roadPath, townLayout } from './town-layouts.js';
import { landscapes } from './town-landscapes.js';
import { localLandmarks } from './station-props.js';

function house(group, m, bookshop) {
  const width = bookshop ? 1.12 : 0.94;
  box(group, [width, 0.65, 0.72], m.cream, [0, 0.40, 0]);
  cutout(group, [[-width / 2, 0], [width / 2, 0], [0, 0.39]], m.paper, 0, 0.725, -0.36, 0.72);
  const roofWidth = Math.hypot(width / 2 + 0.09, 0.44);
  for (const side of [-1, 1]) {
    const roof = box(group, [roofWidth, 0.065, 0.91], bookshop ? m.green : m.rust, [side * (width / 4 + 0.03), 0.92, 0]);
    roof.rotation.z = -side * Math.atan2(0.44, width / 2 + 0.09);
  }
  box(group, [0.19, 0.37, 0.035], m.sand, [-0.26, 0.28, 0.375]);
  box(group, [0.38, 0.28, 0.04], m.blue, [0.12, 0.4, 0.38]);
  box(group, [0.025, 0.29, 0.045], m.cream, [0.12, 0.4, 0.40]);
  if (bookshop) {
    for (let stripe = 0; stripe < 7; stripe += 1) {
      const awning = box(group, [0.152, 0.06, 0.32], stripe % 2 ? m.cream : m.mint, [(stripe - 3) * .152, .61, .45]);
      awning.rotation.x = .29;
    }
    for (let i = 0; i < 3; i++) box(group, [.26, .07, .18], [m.rust, m.paper, m.blue][i], [.65, .11 + i * .07, .22]);
  } else {
    box(group, [.35, .25, .20], m.red, [.59, .39, .21]);
    box(group, [.055, .32, .055], m.green, [.59, .19, .21]);
    box(group, [.22, .025, .02], m.ink, [.59, .43, .32]);
    const envelope = box(group, [.38, .25, .045], m.cream, [0, .84, .39]);
    cutout(envelope, [[-.17,.095],[.17,.095],[0,-.035]], m.rust, 0, 0, .024, .012);
  }
}

function clockTower(group, m) {
  box(group, [.74, .11, .73], m.edge, [0, .12, 0]);
  box(group, [.55, 1.10, .5], m.paper, [0, .72, 0]);
  box(group, [.70, .085, .64], m.sand, [0, 1.24, 0]);
  const roof = solid(group, new THREE.ConeGeometry(.53, .54, 4), m.green, 0, 1.52, 0);
  roof.rotation.y = Math.PI / 4;
  box(group, [.04, .2, .04], m.rust, [0, 1.83, 0]);
  const face = disk(group, 0, .93, .269, .212, .038, m.cream);
  face.rotation.x = Math.PI / 2;
  box(group, [.031, .145, .02], m.ink, [0, 1.0, .30]);
  box(group, [.110, .027, .02], m.ink, [.05, .93, .30]);
  box(group, [.17, .35, .025], m.rust, [0, .32, .26]);
}

function garden(group, m) {
  box(group, [1.20, .11, .73], m.pale, [0, .14, 0]);
  makeTree(group, m, [-.32, .20, -.06], .64);
  makeTree(group, m, [.24, .20, -.17], .47);
  for (const [x, y, z] of [[.28,.39,.18],[.48,.34,.09],[-.08,.36,.22]]) {
    box(group, [.035, y - .15, .035], m.green, [x, (y + .15) / 2, z]);
    const petal = solid(group, new THREE.IcosahedronGeometry(.115, 0), m.red, x, y, z);
    petal.scale.z = .58;
  }
}

function pier(group, m) {
  const water = disk(group, .12, .10, -.10, .77, .05, m.blue);
  water.scale.z = .77;
  for (let i = 0; i < 5; i++) box(group, [.19, .07, .38], m.sand, [-.58 + i * .17, .17, .28]);
  cutout(group, [[-.47,.18],[.5,.18],[.29,0],[-.27,0]], m.rust, .13, .18, -.06, .23);
  box(group, [.045, 1.00, .045], m.ink, [.11,.84,.02]);
  cutout(group, [[-.52,0],[0,.83],[0,0]], m.cream, .08, .46, .02);
  cutout(group, [[0,0],[0,.67],[.39,0]], m.red, .16, .46, .04);
}

const styles = {
  everyday: { road: 'biscuit', edge: 'sand', pad: 8, scale: { post: 1.07 } },
  riverside: { road: 'sand', edge: 'edge', pad: 12, scale: { ferry: 1.10, beacon: .94 }, colors: { rust: 'coral', blue: 'aqua' } },
  clock: { road: 'cream', edge: 'slate', pad: 4, scale: { hall: 1.03 }, colors: { green: 'navy' } },
  tie: { road: 'paper', edge: 'heather', pad: 6, scale: {}, colors: { rust: 'brick', blue: 'aqua' } },
};

function buildRoad(group, road, layout, theme, m) {
  const path = roadPath(layout, road.from, road.to);
  const style = styles[theme];
  const boardwalk = layout.boardwalks?.includes(`${road.from}-${road.to}`);
  const marks = [];
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1], [bx, bz] = path[i];
    const length = Math.hypot(bx - ax, bz - az);
    const strip = groupAt(group, (ax + bx) / 2, .153, (az + bz) / 2, Math.atan2(bx - ax, bz - az));
    const width = boardwalk ? .44 : .20;
    box(strip, [width, .032, length + .025], m[style.road]);
    if (boardwalk) for (let d = .12; d < length; d += .30) {
      box(strip, [width, .018, .035], m[style.edge], [0,.022,d-length/2]);
    }
    marks.push(box(strip, [.086,.014,length+.035], m[style.edge], [0,.040,0]));
  }
  return { road, marks };
}

export function buildTown(group, m, picks, scenario) {
  const { id: theme, stops } = scenario;
  const layout = townLayout(theme), style = styles[theme];
  landscapes[theme](group, m);
  const palette = { ...m };
  for (const [key, color] of Object.entries(style.colors ?? {})) palette[key] = m[color];
  const landmarks = { ...localLandmarks, post: (g,m) => house(g,m,false), books: (g,m) => house(g,m,true), clock: clockTower, hall: clockTower, garden, pier, ferry: pier };
  const pads = {};
  for (const { id } of stops) {
    const [x, z] = layout.stops[id];
    const onBridge = id === 'rope' || id === 'truss';
    const place = groupAt(group, x, onBridge ? 0 : .18, z);
    place.scale.setScalar(style.scale[id] ?? 1);
    place.userData.action = { type: 'stop', id };
    picks.push(place);
    pads[id] = disk(place, 0, onBridge ? .174 : .035, 0, onBridge ? .17 : .74, onBridge ? .016 : .065, m.paper, style.pad);
    pads[id].scale.z = .78;
    landmarks[id](place, palette);
  }
  const roads = scenario.roads.map(road => buildRoad(group, road, layout, theme, m));
  const courier = solid(group, new THREE.OctahedronGeometry(.12), m.rust, 0, .15, 0);
  const inks = { idle: m[style.edge], candidate: m.sand, fixed: m.green, traced: m.rust, rejected: m.rust, replaced: m[style.edge], equal: m.blue };
  let traveling = null;
  return {
    update({ frame, inspected, route }, reducedMotion) {
      for (const { road, marks } of roads) {
        const state = roadInk(road, frame, route);
        for (const ink of marks) {
          ink.material = inks[state];
          ink.scale.x = { traced: 2.35, equal: 2.35, rejected: 1.75, fixed: 1.75, replaced: .6 }[state] ?? 1;
        }
      }
      for (const { id } of stops) {
        pads[id].material = !inspected && id === frame.to ? m.rust : frame.popped.includes(id) ? m.mint : Number.isFinite(frame.distance[id]) ? m.sand : m.paper;
      }
      traveling = frame.kind === 'parent.write' && frame.from && !inspected && !reducedMotion
        ? { start: performance.now(), path: roadPath(layout, frame.from, frame.to) } : null;
      courier.visible = !!traveling;
    },
    tick(now) {
      if (!traveling) return;
      const { path, start } = traveling;
      const t = Math.min(1, Math.max(0, (now - start) / 820));
      const [x, z] = pointOnPath(path, t);
      courier.position.set(x, .34 + .09 * Math.sin(t * Math.PI), z);
      if (t === 1) { courier.visible = false; traveling = null; }
    },
  };
}
