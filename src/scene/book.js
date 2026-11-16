import * as THREE from 'three';
import { box, label, COLORS } from './materials.js';

export function makeBook(materials) {
  const book = new THREE.Group();
  const left = new THREE.Group();
  const right = new THREE.Group();
  left.position.y = right.position.y = 0.45;
  book.add(left, right);
  for (const [page, side] of [[left, -1], [right, 1]]) {
    box(page, [5.95, 0.18, 7.65], materials.green, [side * 2.98, -0.40, 0]);
    box(page, [5.69, 0.29, 7.31], materials.edge, [side * 2.89, -0.18, 0]);
    for (let layer = 0; layer < 8; layer += 1) {
      box(page, [5.70 - layer * 0.012, 0.013, 7.3 - layer * 0.015], layer % 2 ? materials.cream : materials.paper, [side * 2.89, -0.32 + layer * 0.04, 0]);
    }
    box(page, [5.70, 0.06, 7.22], materials.cream, [side * 2.89, 0.035, 0]);
    box(page, [0.015, 0.004, 6.7], materials.edge, [side * 0.15, 0.07, 0]);
    box(page, [5.1, 0.004, 0.014], materials.edge, [side * 2.9, 0.07, -3.2]);
  }
  const coverTitle = label(left, '纸 上 算 法', 3.8, 0.8, [-2.98, -0.5, -0.7], { color: '#e4d1a7', serif: true, bold: true });
  coverTitle.rotation.x = Math.PI / 2;
  coverTitle.rotation.z = Math.PI;
  const coverSubtitle = label(left, 'A LITTLE WORLD OF LOGIC', 4.0, 0.25, [-2.98, -0.5, 0.35], { color: '#c9c6a0', serif: true });
  coverSubtitle.rotation.x = Math.PI / 2;
  coverSubtitle.rotation.z = Math.PI;
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 7.64, 24), materials.green);
  spine.rotation.x = Math.PI / 2;
  spine.position.y = 0.14;
  book.add(spine);
  const bookmark = box(book, [0.25, 0.012, 1.25], materials.rust, [4.4, 0.07, 4.02]);
  bookmark.rotation.y = -0.12;
  return { book, left, right };
}

export function makeTree(parent, materials, position, scale = 1) {
  const root = new THREE.Group();
  root.position.set(...position);
  root.scale.setScalar(scale);
  box(root, [0.12, 0.55, 0.12], materials.sand, [0, 0.28, 0]);
  for (let layer = 0; layer < 3; layer += 1) {
    const shape = new THREE.Shape();
    const width = 0.44 - layer * 0.08;
    shape.moveTo(-width, 0);
    shape.lineTo(width, 0);
    shape.lineTo(0, 0.76);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false });
    for (const rotation of [0, Math.PI / 2]) {
      const leaf = new THREE.Mesh(geometry, materials.mint);
      leaf.position.y = 0.4 + layer * 0.32;
      leaf.rotation.y = rotation;
      leaf.castShadow = true;
      root.add(leaf);
    }
  }
  parent.add(root);
  return root;
}

export function makeScenery(parent, materials) {
  for (const [x, z, scale] of [[-5.1, -2.6, 0.8], [5.1, -2.6, 0.7], [-5.1, 2.7, 0.52], [5.1, 2.5, 0.5]]) {
    makeTree(parent, materials, [x, 0, z], scale);
  }
  for (const side of [-1, 1]) {
    const mountain = new THREE.Shape();
    mountain.moveTo(-1.7, 0);
    mountain.lineTo(-1, 0.5);
    mountain.lineTo(-0.6, 0.32);
    mountain.lineTo(0.1, 1.05);
    mountain.lineTo(0.65, 0.64);
    mountain.lineTo(1, 0.7);
    mountain.lineTo(1.7, 0);
    mountain.closePath();
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(mountain, { depth: 0.035, bevelEnabled: false }), materials.pale);
    mesh.position.set(side * 2.65, 0, -2.9);
    mesh.castShadow = true;
    parent.add(mesh);
  }
}

export function makeHouse(parent, materials, value, width = 1) {
  const root = new THREE.Group();
  root.scale.setScalar(width);
  box(root, [0.8, 0.75, 0.76], materials.paper, [0, 0.4, 0]);
  const gable = new THREE.Shape();
  gable.moveTo(-0.4, 0);
  gable.lineTo(0.4, 0);
  gable.lineTo(0, 0.42);
  gable.closePath();
  const facade = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.76, bevelEnabled: false }), materials.cream);
  facade.position.set(0, 0.775, -0.38);
  facade.castShadow = true;
  root.add(facade);
  for (const side of [-1, 1]) {
    const roof = box(root, [0.64, 0.045, 0.95], materials.rust, [side * 0.22, 1.01, 0]);
    roof.rotation.z = -side * 0.78;
  }
  box(root, [0.24, 0.22, 0.025], materials.green, [0, 0.88, 0.395]);
  box(root, [0.018, 0.22, 0.03], materials.cream, [0, 0.88, 0.41]);
  box(root, [0.24, 0.018, 0.03], materials.cream, [0, 0.88, 0.41]);
  box(root, [0.63, 0.37, 0.04], materials.rust, [0, 0.37, 0.4]);
  label(root, value, 0.57, 0.31, [0, 0.37, 0.425], { color: COLORS.white, serif: true });
  parent.add(root);
  return root;
}
