import * as THREE from 'three';
import { box } from './materials.js';

export function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z);
  part.castShadow = part.receiveShadow = true;
  parent.add(part);
  return part;
}

export function groupAt(parent, x, y, z, angle = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = angle;
  parent.add(group);
  return group;
}

export function disk(group, x, y, z, radius, depth, material, sides = 24) {
  return mesh(group, new THREE.CylinderGeometry(radius, radius, depth, sides), material, x, y, z);
}

export function cutout(group, outline, material, x, y, z, thickness = .045) {
  const shape = new THREE.Shape(outline.map(([a, b]) => new THREE.Vector2(a, b)));
  return mesh(group, new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false }), material, x, y, z);
}

// An irregular piece of coloured cardstock lying on the page, with a real edge.
export function ground(group, outline, material, top = .035, thickness = .025) {
  const part = cutout(group, outline.map(([x, z]) => [x, -z]), material, 0, top - thickness, 0, thickness);
  part.rotation.x = -Math.PI / 2;
  return part;
}

export function beam(parent, start, end, width, material, depth = width) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const middle = a.clone().lerp(b, .5);
  const axis = b.sub(a);
  const part = box(parent, [width, axis.length(), depth], material, middle.toArray());
  part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
  return part;
}
