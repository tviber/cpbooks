import * as THREE from 'three';

export const COLORS = {
  paper: '#e5d7bb', cream: '#f0e6cf', edge: '#c5ad86', green: '#274c3b',
  mint: '#879f73', pale: '#b4c19d', ink: '#34473c', rust: '#ac5d3e',
  sand: '#cfad77', blue: '#93adb3', red: '#be715b', white: '#fffaf0',
  clay: '#d5aa93', biscuit: '#e0bb7b', brick: '#904631', rose: '#de9581', mustard: '#dda748',
  aqua: '#a4d1c6', turquoise: '#58aaa7', foam: '#dbebe1', coral: '#c95b43',
  navy: '#2c5261', platform: '#bcc7cb', slate: '#8798a2', heath: '#c7bfaa', heather: '#948d9e', plum: '#655f77',
};

export function paperTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  const data = context.createImageData(256, 256);
  let seed = 513;
  for (let index = 0; index < data.data.length; index += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const color = 232 + (seed / 4294967296) * 23;
    data.data.set([color, color, color, 255], index);
  }
  context.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createMaterials() {
  const grain = paperTexture();
  const materials = Object.fromEntries(Object.entries(COLORS).map(([name, color]) => [
    name, new THREE.MeshStandardMaterial({ color, map: grain, bumpMap: grain, bumpScale: 0.017, roughness: 0.94 }),
  ]));
  return { materials, grain };
}

export function box(parent, dimensions, material, position = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function label(parent, text, width, height, position, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(256, Math.round(width * 180));
  canvas.height = Math.max(96, Math.round(height * 180));
  const context = canvas.getContext('2d');
  if (options.background) {
    context.fillStyle = options.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.fillStyle = options.color || COLORS.ink;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `${options.bold ? '600' : '400'} ${canvas.height * 0.59}px ${options.serif ? 'Georgia, "Songti SC"' : '"SF Mono", Menlo, "PingFang SC"'}, sans-serif`;
  context.fillText(String(text), canvas.width / 2, canvas.height / 2 + 1, canvas.width * 0.94);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(...position);
  if (options.flat) mesh.rotation.x = -Math.PI / 2;
  parent.add(mesh);
  return mesh;
}

export function releaseGroup(group) {
  group.traverse(object => {
    object.geometry?.dispose();
    if (object.material?.isMeshBasicMaterial && object.material.map) {
      object.material.map.dispose();
      object.material.dispose();
    }
  });
  group.removeFromParent();
}
