import * as THREE from 'three';
import { box, label } from './materials.js';

export const FOREST_HEIGHT = 3.7;
export const FOREST_BASE = 0.1;

function clipAtHeight(points, height, above) {
  const clipped = [];
  const inside = point => above ? point[1] >= height : point[1] <= height;
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    const startInside = inside(start);
    const endInside = inside(end);
    if (startInside) clipped.push(start);
    if (startInside !== endInside) {
      const fraction = (height - start[1]) / (end[1] - start[1]);
      clipped.push([start[0] + (end[0] - start[0]) * fraction, height]);
    }
  }
  return clipped;
}

function paperFoliage(parent, points, material, rotation) {
  if (points.length < 3) return;
  const shape = new THREE.Shape();
  points.forEach(([horizontal, vertical], index) => index ? shape.lineTo(horizontal, vertical) : shape.moveTo(horizontal, vertical));
  shape.closePath();
  const leaf = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.055, bevelEnabled: false }), material);
  leaf.rotation.y = rotation;
  leaf.castShadow = leaf.receiveShadow = true;
  parent.add(leaf);
}

function treeModel(parent, materials, treeHeight, sawHeight, scale, width) {
  const root = new THREE.Group();
  parent.add(root);
  const lower = new THREE.Group();
  const upper = new THREE.Group();
  root.add(lower, upper);
  const height = treeHeight * scale;
  const cut = Math.min(height, sawHeight * scale);
  const points = [
    [-width * 0.13, height * 0.2], [-width * 0.52, height * 0.2],
    [-width * 0.29, height * 0.43], [-width * 0.43, height * 0.43],
    [-width * 0.18, height * 0.65], [-width * 0.31, height * 0.65],
    [0, height], [width * 0.31, height * 0.65],
    [width * 0.18, height * 0.65], [width * 0.43, height * 0.43],
    [width * 0.29, height * 0.43], [width * 0.52, height * 0.2],
    [width * 0.13, height * 0.2],
  ];
  for (const rotation of [0, Math.PI / 2]) {
    paperFoliage(lower, clipAtHeight(points, cut, false), materials.mint, rotation);
    paperFoliage(upper, clipAtHeight(points, cut, true), materials.rust, rotation);
  }
  const trunkHeight = height * 0.9;
  const lowerTrunk = Math.min(trunkHeight, cut);
  if (lowerTrunk > 0) box(lower, [0.19, lowerTrunk, 0.19], materials.sand, [0, lowerTrunk / 2, 0]);
  if (trunkHeight > cut) box(upper, [0.19, trunkHeight - cut, 0.19], materials.rust, [0, (trunkHeight + cut) / 2, 0]);
  box(root, [width * 0.75, 0.035, 0.65], materials.pale, [0, -0.018, 0]);
  return { root, upper, harvested: Math.max(treeHeight - sawHeight, 0) };
}

export function makeForest(parent, materials, search, result, measured = false) {
  const maximum = Math.max(...search.heights);
  const scale = FOREST_HEIGHT / maximum;
  const sawHeight = result?.height ?? Math.ceil(maximum / 2);
  const trees = [];
  const spacing = 7.6 / (search.heights.length - 1);
  const width = Math.min(1.5, spacing * 0.78);
  search.heights.forEach((height, index) => {
    const tree = treeModel(parent, materials, height, sawHeight, scale, width);
    tree.root.position.set(-3.8 + index * spacing, FOREST_BASE, -1.05);
    label(tree.root, `${height} m`, 1.0, 0.42, [0, height * scale + 0.31, 0.1], { bold: true });
    if (result && measured) label(tree.root, `+${tree.harvested} m`, 0.93, 0.32, [0, 0.02, 0.95], { flat: true, color: tree.harvested ? '#a25332' : '#727765' });
    trees.push(tree);
  });
  for (const horizontal of [-4.7, 4.7]) {
    box(parent, [0.07, FOREST_HEIGHT + 0.25, 0.07], materials.edge, [horizontal, FOREST_BASE + FOREST_HEIGHT / 2, -0.75]);
    box(parent, [0.4, 0.08, 0.5], materials.green, [horizontal, FOREST_BASE, -0.75]);
  }
  const step = maximum > 25 ? 10 : maximum > 10 ? 5 : 1;
  for (let height = 0; height <= maximum; height += step) {
    const vertical = FOREST_BASE + height * scale;
    box(parent, [0.17, 0.015, 0.02], materials.ink, [-4.7, vertical, -0.7]);
    label(parent, height, 0.38, 0.22, [-5.08, vertical, -0.68], { color: '#68705d' });
  }
  const saw = new THREE.Group();
  saw.position.set(0, FOREST_BASE + sawHeight * scale, -0.67);
  parent.add(saw);
  box(saw, [9.45, 0.035, 0.045], materials.rust);
  for (let index = 0; index < 48; index += 1) box(saw, [0.045, 0.07, 0.04], materials.rust, [-4.6 + index * 0.196, -0.027, 0]);
  label(saw, `H = ${sawHeight} m`, 1.75, 0.34, [0, 0.25, 0.05], { color: '#a25332', background: '#f5efdf', bold: true });
  const handle = box(saw, [0.48, 0.34, 0.29], materials.rust, [4.7, 0, 0.08]);
  handle.userData.action = { type: 'saw-handle' };
  label(saw, '↕', 0.28, 0.3, [4.7, 0, 0.235], { color: '#fffaf0' });

  const bars = [];
  if (!measured) return { trees, handle, bars, sawHeight, scale };
  const collected = new THREE.Group();
  parent.add(collected);
  const wood = result?.wood ?? 0;
  const meterScale = 8.5 / Math.max(wood, search.target, 1);
  const meterDepth = 1.15;
  box(collected, [8.5, 0.025, 0.31], materials.edge, [0, 0.04, meterDepth]);
  let offset = -4.25;
  (result?.contributions || []).forEach((amount, index) => {
    if (!amount) return;
    const segmentWidth = amount * meterScale;
    const segment = new THREE.Group();
    segment.position.set(offset, 0.1, meterDepth);
    box(segment, [segmentWidth, 0.11, 0.27], index % 2 ? materials.sand : materials.rust, [segmentWidth / 2, 0, 0]);
    collected.add(segment);
    bars.push(segment);
    offset += segmentWidth;
  });
  const targetPosition = -4.25 + search.target * meterScale;
  box(collected, [0.035, 0.32, 0.4], materials.green, [targetPosition, 0.17, meterDepth]);
  label(collected, `目标 ${search.target} m`, 1.25, 0.23, [Math.min(4.15, targetPosition), 0.025, 1.62], { flat: true });
  label(collected, result ? `${result.contributions.join(' + ')} = ${result.wood} m` : '木材累计尺 · 先检验中点', 5.7, 0.29, [0, 0.02, 0.58], { flat: true, color: '#935337' });
  return { trees, handle, bars, sawHeight, scale };
}
