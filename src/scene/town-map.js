import * as THREE from 'three';
import { box } from './materials.js';
import { makeTree } from './book.js';
import { STOPS, ROADS, roadInk } from '../lessons/dijkstra.js';

const stopById = Object.fromEntries(STOPS.map(stop => [stop.id, stop]));

function solid(group, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function disk(group, x, y, z, radius, depth, material, sides = 32) {
  return solid(group, new THREE.CylinderGeometry(radius, radius, depth, sides), material, x, y, z);
}

// A folded sheet with its coloured face and visible paper edge.
function cutout(group, outline, material, x, y, z, thickness = 0.045) {
  const shape = new THREE.Shape(outline.map(([a, b]) => new THREE.Vector2(a, b)));
  return solid(group, new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false }), material, x, y, z);
}

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

export function buildTown(group, m, picks) {
  const landmarks = { post: g => house(g, m, false), clock: g => clockTower(g, m), garden: g => garden(g, m), books: g => house(g, m, true), pier: g => pier(g, m) };
  const pads = {};
  for (const { id, x, z } of STOPS) {
    const place = new THREE.Group();
    place.position.set(x, .035, z);
    place.userData.action = { type: 'stop', id };
    group.add(place);
    picks.push(place);
    pads[id] = disk(place, 0, .035, 0, .74, .065, m.paper, 32);
    pads[id].scale.z = .78;
    landmarks[id](place);
  }
  const roads = ROADS.map(road => {
    const a = stopById[road.from], b = stopById[road.to];
    const length = Math.hypot(a.x - b.x, a.z - b.z);
    const strip = new THREE.Group();
    strip.position.set((a.x + b.x) / 2, .03, (a.z + b.z) / 2);
    strip.rotation.y = Math.atan2(a.x - b.x, a.z - b.z);
    group.add(strip);
    box(strip, [.18, .018, length], m.paper);
    const ink = box(strip, [.082, .012, length], m.edge, [0,.018,0]);
    return { road, ink };
  });
  // A few folded trees frame the diagram without marking extra stops.
  for (const [x,z,s] of [[-4.8,-2.7,.38],[-4.43,-2.84,.25],[4.7,-2.60,.4],[4.31,-2.82,.28],[-4.7,2.70,.27]]) makeTree(group, m, [x,.01,z], s);
  const courier = solid(group, new THREE.OctahedronGeometry(.12), m.rust, 0, .15, 0);
  const inks = { idle: m.edge, candidate: m.sand, fixed: m.green, traced: m.rust, rejected: m.rust, replaced: m.edge, equal: m.blue };
  let traveling = null;
  return {
    update({ frame, inspected, route }, reducedMotion) {
      for (const { road, ink } of roads) {
        const state = roadInk(road, frame, route);
        ink.material = inks[state];
        ink.scale.x = { traced: 2.35, equal: 2.35, rejected: 1.75, fixed: 1.75, replaced: .6 }[state] ?? 1;
      }
      for (const { id } of STOPS) {
        pads[id].material = frame.settled.includes(id) ? m.mint : Number.isFinite(frame.distance[id]) ? m.sand : m.paper;
      }
      traveling = frame.kind === 'road' && !inspected && !reducedMotion
        ? { start: performance.now(), from: stopById[frame.from], to: stopById[frame.to] } : null;
      courier.visible = !!traveling;
    },
    tick(now) {
      if (!traveling) return;
      const { from, to, start } = traveling;
      const t = Math.min(1, Math.max(0, (now - start) / 820));
      courier.position.set(THREE.MathUtils.lerp(from.x,to.x,t), .22 + .10 * Math.sin(t * Math.PI), THREE.MathUtils.lerp(from.z,to.z,t));
      if (t === 1) { courier.visible = false; traveling = null; }
    },
  };
}
