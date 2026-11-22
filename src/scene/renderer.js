import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createMaterials, box, label, releaseGroup } from './materials.js';
import { makeBook, makeScenery, makeHouse } from './book.js';
import { makeForest, FOREST_BASE } from './forest.js';
import { buildTown } from './town-map.js';

const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const fraction = clamp(value); return fraction * fraction * (3 - 2 * fraction); };

export class BookScene {
  constructor(container, onSelect) {
    this.container = container;
    this.onSelect = onSelect;
    this.materials = createMaterials();
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.domElement.setAttribute('aria-label', '可旋转的三维纸艺教学书；所有操作也可使用页面按钮完成');
    this.renderer.domElement.setAttribute('role', 'img');
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.addEventListener('change', () => { this.mapProjectionDirty = true; });
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 30;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = 1.18;
    this.controls.minAzimuthAngle = -0.65;
    this.controls.maxAzimuthAngle = 0.65;
    this.scene.add(new THREE.HemisphereLight(0xfffaed, 0xa8b5a4, 1.8));
    const sun = new THREE.DirectionalLight(0xfff0d7, 2.5);
    sun.position.set(-4, 12, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 0.5, far: 35 });
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.0001;
    sun.shadow.radius = 4;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xe2edf0, 0.7);
    fill.position.set(6, 7, -5);
    this.scene.add(fill);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: '#64533b', opacity: 0.19 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.03;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const made = makeBook(this.materials.materials);
    this.book = made.book;
    this.left = made.left;
    this.scene.add(this.book);
    this.content = new THREE.Group();
    this.content.position.y = 0.53;
    this.book.add(this.content);
    this.scenery = new THREE.Group();
    makeScenery(this.scenery, this.materials.materials);
    this.content.add(this.scenery);
    this.dynamic = new THREE.Group();
    this.content.add(this.dynamic);
    this.picks = [];
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.tween = null;
    this.openStart = performance.now();
    this.openDuration = this.reducedMotion ? 0 : 1600;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.home();
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', event => {
      if (!this.sawDraggable || this.tween || !this.sawHandle) return;
      this.updatePointer(event);
      if (!this.raycaster.intersectObject(this.sawHandle).length) return;
      event.stopImmediatePropagation();
      this.draggingSaw = true;
      this.controls.enabled = false;
      canvas.setPointerCapture(event.pointerId);
    }, true);
    canvas.addEventListener('pointermove', event => {
      if (!this.draggingSaw) return;
      event.stopImmediatePropagation();
      this.updatePointer(event);
      this.book.updateMatrixWorld(true);
      const cuttingPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.59).applyMatrix4(this.content.matrixWorld);
      const point = this.raycaster.ray.intersectPlane(cuttingPlane, new THREE.Vector3());
      if (!point) return;
      this.content.worldToLocal(point);
      const height = Math.max(0, Math.min(this.maximumSawHeight, Math.round((point.y - FOREST_BASE) / this.forestScale)));
      this.onSelect({ type: 'saw-height', value: height });
    }, true);
    const releaseSaw = event => {
      if (!this.draggingSaw) return;
      event.stopImmediatePropagation();
      this.draggingSaw = false;
      this.controls.enabled = true;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    canvas.addEventListener('pointerup', releaseSaw, true);
    canvas.addEventListener('pointercancel', releaseSaw, true);
    canvas.addEventListener('pointerdown', event => { this.down = [event.clientX, event.clientY]; });
    canvas.addEventListener('pointerup', event => {
      if (!this.down || Math.hypot(event.clientX - this.down[0], event.clientY - this.down[1]) > 6) return;
      const rect = canvas.getBoundingClientRect();
      this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.picks, true)[0];
      if (!hit || this.tween) return;
      let object = hit.object;
      while (object && !object.userData.action) object = object.parent;
      if (object?.userData.action) this.onSelect(object.userData.action);
    });
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      container.dispatchEvent(new CustomEvent('scene-error', { detail: '三维画面暂时中断，文字、状态和操作仍可使用；恢复后将自动重绘。' }));
    });
    canvas.addEventListener('webglcontextrestored', () => { this.resize(); });
    this.frame = this.frame.bind(this);
    this.renderer.setAnimationLoop(this.frame);
  }

  home() {
    const aspect = this.container.clientWidth / Math.max(1, this.container.clientHeight);
    const distance = Math.max(14.6, 7.1 / (Math.tan(THREE.MathUtils.degToRad(17)) * aspect));
    const forest = this.mode === 'forest';
    this.controls.maxDistance = Math.max(30, distance * 1.5);
    if (this.mode === 'map') this.camera.position.set(0, distance * 0.81, distance * 0.57);
    else this.camera.position.set(distance * (forest ? 0.025 : 0.09), distance * (forest ? 0.55 : 0.64), distance * (forest ? 0.84 : 0.77));
    this.controls.target.set(0, forest ? 1.1 : 0.35, 0.1);
    this.controls.update();
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.mapProjectionDirty = true;
    if (this.lastWidth && (Math.abs(this.lastWidth - width) > 30 || Math.abs(this.lastHeight - height) > 30)) this.home();
    this.lastWidth = width;
    this.lastHeight = height;
  }

  reopen() {
    this.openStart = performance.now();
    this.openDuration = this.reducedMotion ? 0 : 1600;
  }

  clear() {
    if (this.tween) {
      this.tween.finish?.();
      this.tween = null;
    }
    releaseGroup(this.dynamic);
    this.dynamic = new THREE.Group();
    this.content.add(this.dynamic);
    this.picks = [];
    this.sawHandle = null;
    this.town = null;
    this.signs = null;
  }

  setMap(display, signs) {
    if (this.mode !== 'map' || this.mapTheme !== display.scenario.id) {
      this.clear();
      this.mode = 'map';
      this.mapTheme = display.scenario.id;
      this.scenery.visible = false;
      this.sawDraggable = false;
      this.town = buildTown(this.dynamic, this.materials.materials, this.picks, this.mapTheme);
      this.signs = signs;
      this.mapProjectionDirty = true;
      this.projectedPoint = new THREE.Vector3();
      this.projectMapPoint = (x, y, z) => {
        const v = this.projectedPoint.set(x, y, z).applyMatrix4(this.dynamic.matrixWorld).project(this.camera);
        return { horizontal: (1 + v.x) * 50, vertical: (1 - v.y) * 50 };
      };
    }
    this.town.update(display, this.reducedMotion);
  }

  updatePointer(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  slotPosition(index, capacity, depth = 0) {
    const columns = Math.min(capacity, 8);
    const step = capacity <= 4 ? 1.55 : 1.1;
    return [(index % 8 - (columns - 1) / 2) * step, 0, depth + (capacity > 8 ? (Math.floor(index / 8) - 0.5) * 1.9 : 0)];
  }

  vectorGroup(state, depth = 0, ghost = false) {
    const root = new THREE.Group();
    this.dynamic.add(root);
    const { materials } = this.materials;
    const houses = [];
    const width = state.capacity <= 4 ? 1.28 : 0.92;
    for (let index = 0; index < state.capacity; index += 1) {
      const position = this.slotPosition(index, state.capacity, depth);
      const slot = new THREE.Group();
      slot.position.set(...position);
      slot.userData.action = { type: 'slot', index };
      root.add(slot);
      box(slot, [width + 0.08, 0.055, width + 0.06], materials.paper, [0, 0.025, 0]);
      for (const side of [-1, 1]) {
        box(slot, [width + 0.08, 0.015, 0.022], materials.mint, [0, 0.06, side * width / 2]);
        box(slot, [0.022, 0.015, width], materials.mint, [side * (width + 0.08) / 2, 0.06, 0]);
      }
      label(slot, `[${index}]`, 0.57, 0.24, [0, 0.07, width / 2 + 0.23], { flat: true, color: '#727b6d' });
      if (index < state.values.length) {
        const house = makeHouse(slot, materials, state.values[index], width);
        house.position.y = 0.06;
        houses.push(house);
      } else {
        label(slot, '空位', width * 0.75, 0.24, [0, 0.062, 0], { flat: true, color: '#8d9583' });
      }
      if (!ghost) this.picks.push(slot);
    }
    if (!state.capacity) label(root, '尚未分配存储 · 先 reserve 或添加元素', 6.6, 0.38, [0, 0.02, 0], { flat: true });
    if (state.capacity) label(root, ghost ? `旧存储 / 区块 ${state.allocation}` : `连续存储 / 区块 ${state.allocation}`, 3.6, 0.28, [0, 0.085, depth - (state.capacity > 8 ? 1.7 : 1.15)], { flat: true, color: '#667e68' });
    return { root, houses };
  }

  setVector(state, previous = null) {
    this.clear();
    this.mode = 'vector';
    this.scenery.visible = true;
    this.sawDraggable = false;
    const migration = previous && state.allocation !== previous.allocation && previous.values.length;
    if (!migration || this.reducedMotion) {
      this.vectorGroup(state);
      return Promise.resolve();
    }
    const old = this.vectorGroup(previous, -1.5, true);
    const next = this.vectorGroup(state, 1.1);
    const moving = [];
    for (let index = 0; index < previous.values.length; index += 1) {
      const source = this.slotPosition(index, previous.capacity, -1.5);
      const target = this.slotPosition(index, state.capacity, 1.1);
      const parcel = new THREE.Group();
      this.dynamic.add(parcel);
      box(parcel, [0.62, 0.43, 0.37], this.materials.materials.rust, [0, 0.22, 0]);
      label(parcel, previous.values[index], 0.5, 0.3, [0, 0.24, 0.19], { color: '#fffaf0' });
      moving.push({ parcel, source, target });
    }
    next.houses.forEach(house => { house.userData.heightScale = house.scale.y; house.scale.y = 0.001; });
    return new Promise(resolve => {
      this.tween = {
        start: performance.now(), duration: 1900,
        update: progress => {
          moving.forEach(({ parcel, source, target }, index) => {
            const phase = ease((progress - index * 0.035) / 0.7);
            parcel.position.set(THREE.MathUtils.lerp(source[0], target[0], phase), 0.65 + Math.sin(phase * Math.PI) * 1.7, THREE.MathUtils.lerp(source[2], target[2], phase));
            parcel.visible = phase < 0.98;
            if (next.houses[index]) next.houses[index].scale.y = Math.max(0.001, ease((phase - 0.75) * 4) * next.houses[index].userData.heightScale);
          });
          old.root.scale.y = Math.max(0.001, 1 - ease((progress - 0.72) / 0.28));
          if (next.houses.length > previous.values.length) next.houses.at(-1).scale.y = Math.max(0.001, ease((progress - 0.76) / 0.24) * next.houses.at(-1).userData.heightScale);
        },
        finish: () => {
          releaseGroup(this.dynamic);
          this.dynamic = new THREE.Group();
          this.content.add(this.dynamic);
          this.picks = [];
          this.vectorGroup(state);
          resolve();
        },
      };
    });
  }

  setBinary(search, result, previousRange = null, options = {}) {
    this.clear();
    this.mode = 'forest';
    this.scenery.visible = false;
    const { materials } = this.materials;
    const maximum = Math.max(...search.heights);
    const forest = makeForest(this.dynamic, materials, search, result, options.measured);
    this.sawDraggable = !!options.interactive;
    this.sawHandle = forest.handle;
    this.maximumSawHeight = maximum;
    this.forestScale = forest.scale;
    const hinges = [];
    const rulerStep = Math.min(0.78, 10 / (maximum + 1));
    for (let value = 0; value <= maximum; value += 1) {
      const hinge = new THREE.Group();
      hinge.position.set((value - maximum / 2) * rulerStep, 0.06, 2.1);
      hinge.userData.action = { type: 'height', value };
      this.dynamic.add(hinge);
      const inside = options.interactive || search.possible && value >= search.lo && value <= search.hi;
      const previousInside = previousRange && value >= previousRange[0] && value <= previousRange[1];
      const winner = search.done && search.possible && value === search.answer;
      const material = winner ? materials.green : result?.height === value ? materials.rust : inside ? materials.cream : materials.edge;
      box(hinge, [rulerStep - 0.035, 0.065, 0.72], material, [0, 0.025, 0.36]);
      if (maximum <= 10 || value % 5 === 0 || value === result?.height || winner) label(hinge, value, Math.min(0.45, rulerStep - 0.015), 0.3, [0, 0.061, 0.36], { flat: true, color: winner || result?.height === value ? '#fffaf0' : '#34473c' });
      if (!inside) hinge.rotation.x = -1.18;
      if (previousInside && !inside) hinges.push(hinge);
      this.picks.push(hinge);
    }
    if (search.done) label(this.dynamic, search.possible ? `最高 ${search.answer} m` : '木材总量不足', 2.7, 0.3, [0, 0.015, 3.15], { flat: true });
    if (this.reducedMotion || (!hinges.length && !options.animate)) return Promise.resolve();
    return new Promise(resolve => {
      this.tween = {
        start: performance.now(), duration: options.animate ? 1150 : 650,
        update: progress => {
          hinges.forEach(hinge => { hinge.rotation.x = -1.18 * ease(progress); });
          if (!options.animate) return;
          forest.trees.forEach(tree => {
            if (!tree.harvested) return;
            tree.upper.position.y = Math.sin(progress * Math.PI) * 0.35;
            tree.upper.position.z = Math.sin(progress * Math.PI) * 0.13;
          });
          forest.bars.forEach((segment, index) => { segment.scale.x = Math.max(0.001, ease((progress - index * 0.09) / 0.65)); });
        },
        finish: resolve,
      };
    });
  }

  frame(now) {
    const opened = this.openDuration ? ease((now - this.openStart) / this.openDuration) : 1;
    this.left.rotation.z = -Math.PI * (1 - opened);
    this.content.visible = opened > 0.62;
    this.content.scale.y = Math.max(0.001, ease((opened - 0.62) / 0.38));
    if (this.tween) {
      const progress = clamp((now - this.tween.start) / this.tween.duration);
      this.tween.update(progress);
      if (progress === 1) {
        const finish = this.tween.finish;
        this.tween = null;
        finish?.();
      }
    }
    this.controls.update();
    this.town?.tick(now);
    this.renderer.render(this.scene, this.camera);
    if (this.town && (this.mapProjectionDirty || opened < 1)) {
      this.signs.layer.style.visibility = opened > .95 ? 'visible' : 'hidden';
      if (opened > .95) this.signs.project(this.projectMapPoint);
      this.mapProjectionDirty = opened < 1;
    }
  }
}
