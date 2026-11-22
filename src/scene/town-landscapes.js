import * as THREE from 'three';
import { box } from './materials.js';
import { makeTree } from './book.js';
import { beam, cutout, disk, ground, groupAt, mesh } from './town-paper.js';
import { riverBank, valleyEast, valleyWest } from './town-layouts.js';

function umbrella(group, m, x, z, scale, canopy) {
  const stand = groupAt(group, x, .06, z);
  stand.scale.setScalar(scale);
  disk(stand, 0, .52, 0, .045, 1.04, m.ink);
  disk(stand, 0, .43, 0, .48, .12, m.sand, 8);
  for (let i = 0; i < 8; i++) {
    const panel = new THREE.ConeGeometry(.77, .43, 1, 1, true, i * Math.PI / 4, Math.PI / 4);
    mesh(stand, panel, i % 2 ? m.cream : canopy, 0, 1.06, 0);
  }
  disk(stand, 0, 1.31, 0, .05, .10, m.sand);
}

function townhouse(group, m, x, z, width, height, wall, roof) {
  const row = groupAt(group, x, .04, z);
  box(row, [width, height, .72], wall, [0, height / 2, 0]);
  cutout(row, [[-width * .55, 0], [width * .55, 0], [width * .31, .33], [-width * .31, .33]], roof, 0, height, -.43, .86);
  for (const dx of [-.26, .26]) {
    box(row, [.19, .27, .025], m.ink, [dx * width, height * .66, .372]);
    box(row, [.25, .035, .06], m.cream, [dx * width, height * .66 - .14, .381]);
  }
  box(row, [.22, .35, .035], roof, [0, .18, .37]);
}

function market(group, m) {
  ground(group, [[-5.46,-2.94],[-3.17,-3.17],[-2.50,-2.66],[-2.98,-1.78],[-4.99,-1.53],[-5.48,-1.95]], m.clay);
  ground(group, [[-1.35,-.75],[.27,-1.01],[1.60,-.34],[1.42,.54],[.30,1.04],[-1.21,.82]], m.biscuit);
  ground(group, [[2.38,2.23],[4.85,1.87],[5.34,2.43],[5.08,3.10],[2.66,3.02]], m.clay);
  townhouse(group, m, -4.88, -2.52, .97, .95, m.biscuit, m.brick);
  townhouse(group, m, -3.76, -2.63, 1.12, 1.27, m.rose, m.rust);
  townhouse(group, m, 3.64, -2.59, 1.04, 1.02, m.rose, m.brick);
  townhouse(group, m, 4.77, -2.48, 1.02, .83, m.biscuit, m.green);
  umbrella(group, m, 3.06, 2.66, .87, m.red);
  umbrella(group, m, 4.48, 2.55, .72, m.mustard);
  // Sagging string and triangular flags across the back of the market square.
  for (const x of [-1.72, 1.80]) box(group, [.052,1.76,.052], m.sand, [x,.88,-2.98]);
  const sag = t => 1.76 - .25 * Math.sin(t * Math.PI);
  for (let i = 0; i < 8; i++) {
    const x = -1.72 + i * .44;
    beam(group, [x,sag(i / 8),-2.98], [x+.44,sag((i+1)/8),-2.98], .021, m.ink);
    cutout(group, [[0,0],[.29,0],[.12,-.28]], [m.red,m.mustard,m.turquoise][i % 3], x+.06, sag((i+.5)/8)-.02, -2.96, .018);
  }
  for (const [x,z,s] of [[-4.8,2.42,.49],[-4.23,2.62,.34],[5.11,-1.35,.39]]) makeTree(group,m,[x,.04,z],s);
}

export function lighthouse(tower, m) {
  disk(tower, 0, .04, 0, .65, .08, m.cream, 12);
  for (let i = 0; i < 4; i++) {
    mesh(tower, new THREE.CylinderGeometry(.42-i*.046,.47-i*.046,.39,10), i % 2 ? m.coral : m.white, 0, .26+i*.39, 0);
  }
  disk(tower, 0, 1.66, 0, .45, .11, m.navy, 10);
  disk(tower, 0, 1.86, 0, .26, .32, m.mustard, 8);
  for (const dx of [-.23,.23]) box(tower,[.045,.38,.04],m.navy,[dx,1.87,.16]);
  mesh(tower,new THREE.ConeGeometry(.47,.40,8),m.coral,0,2.22,0);
  box(tower,[.17,.32,.055],m.navy,[0,.24,.45]);
}

function sailboat(parent, m, x, z, scale, angle) {
  const boat = groupAt(parent, x, .085, z, angle);
  boat.scale.setScalar(scale);
  cutout(boat,[[-.80,.22],[.68,.22],[.40,0],[-.46,0]],m.navy,0,0,-.13,.33);
  box(boat,[.045,1.52,.045],m.ink,[.04,.84,0]);
  cutout(boat,[[-.71,0],[0,1.20],[0,0]],m.white,-.02,.31,-.01);
  cutout(boat,[[0,0],[.48,0],[0,.81]],m.coral,.12,.29,0);
}

function riverside(group, m) {
  const lowerCorners = [[5.58,3.32],[-5.58,3.32]];
  ground(group, [...riverBank.map(([x,z]) => [x,z-.14]), ...lowerCorners], m.sand, .032);
  ground(group, [...riverBank, ...lowerCorners], m.aqua, .057);
  // Cut a second band of deeper water, following the shoreline instead of a rectangle.
  ground(group, [...riverBank.map(([x,z]) => [x,z+.97]), ...lowerCorners], m.turquoise, .072, .012);
  for (const [x,z,w] of [[-4.95,.26,.56],[-4.59,1.02,.29],[-1.94,.02,.52],[-.94,1,.31],[.63,.64,.45],[1.62,.92,.36],[3.17,1.08,.47],[4.63,1.45,.56],[.62,2.81,.65],[4.27,2.86,.39],[-1.41,2.8,.58]]) {
    ground(group, [[x-w/2,z],[x,z+.036],[x+w/2,z-.023],[x+.02,z+.082]], m.foam, .084, .008);
  }
  ground(group, [[-3.91,1.36],[-3.29,1.02],[-2.50,1.08],[-1.84,1.59],[-2.16,2.12],[-3.27,2.28],[-3.86,1.95]], m.pale, .13, .05);
  ground(group, [[3.74,-2.98],[5.06,-3.08],[5.49,-2.26],[5.05,-1.67],[3.91,-1.86]],m.pale,.10,.07);
  sailboat(group,m,-4.47,2.29,.92,-.29);
  sailboat(group,m,2.12,3.00,.54,.36);
  for (const [x,z,s] of [[-4.91,-2.89,.53],[-4.21,-2.77,.39],[1.48,-2.9,.33]]) makeTree(group,m,[x,.03,z],s);
}

function railLine(group, m, x1, x2, z) {
  box(group,[x2-x1,.045,.71],m.slate,[(x1+x2)/2,.045,z]);
  for (let x=x1+.13; x<x2; x+=.32) box(group,[.10,.035,.61],m.sand,[x,.08,z]);
  for (const dz of [-.22,.22]) box(group,[x2-x1,.065,.044],m.navy,[(x1+x2)/2,.118,z+dz]);
}

function train(group, m, x, z) {
  const engine = groupAt(group,x,.13,z);
  for (const offset of [0,1.84,3.61]) {
    const car = groupAt(engine,offset,0,0);
    const front = offset === 0;
    box(car,[1.59,.12,.63],m.navy,[0,.22,0]);
    for (const dx of [-.55,.52]) for (const dz of [-.33,.33]) {
      const wheel = disk(car,dx,.15,dz,.16,.085,m.ink,12);
      wheel.rotation.x = Math.PI/2;
    }
    if (front) {
      const boiler = disk(car,-.21,.46,0,.28,.94,m.navy,16);
      boiler.rotation.z = Math.PI/2;
      mesh(car,new THREE.CylinderGeometry(.14,.085,.31,8),m.ink,-.50,.82,0);
      box(car,[.56,.69,.63],m.mustard,[.48,.61,0]);
      box(car,[.75,.09,.83],m.navy,[.47,1,0]);
      box(car,[.28,.24,.03],m.navy,[.47,.72,.325]);
    } else {
      box(car,[1.55,.49,.64],m.mustard,[0,.53,0]);
      box(car,[1.68,.12,.78],m.navy,[0,.84,0]);
      for (const dx of [-.5,-.17,.17,.5]) box(car,[.19,.23,.028],m.white,[dx,.59,.333]);
    }
    if (offset) box(car,[.34,.055,.095],m.ink,[-.91,.25,0]);
  }
}

function station(group, m) {
  ground(group,[[-5.50,-3.20],[5.46,-3.20],[5.46,1.31],[3.92,1.61],[.98,1.32],[-2.02,2.24],[-5.50,2.18]],m.platform,.037);
  ground(group,[[-5.48,2.25],[5.48,2.25],[5.48,3.34],[-5.48,3.34]],m.slate,.055);
  railLine(group,m,-5.35,5.33,2.82);
  train(group,m,-1.49,2.82);
  // Single folded sawtooth station roof behind the clock, with open steel columns.
  const shed = groupAt(group,-3.87,.07,-2.89);
  shed.scale.setScalar(.86);
  box(shed,[2.88,.11,1.0],m.slate,[0,.055,0]);
  for (const dx of [-1.23,0,1.23]) for (const dz of [-.35,.35]) box(shed,[.06,1.0,.06],m.navy,[dx,.53,dz]);
  for (let i=0;i<3;i++) {
    const dx = -.96+i*.96;
    cutout(shed,[[-.52,0],[.48,.50],[.48,0]],m.aqua,dx,1.05,-.44,.88);
    const roof = box(shed,[1.15,.067,1.1],m.navy,[dx,1.32,0]);
    roof.rotation.z = .46;
  }
  const signal = groupAt(group,5.17,.08,2.79);
  box(signal,[.081,1.26,.081],m.navy,[0,.63,0]);
  box(signal,[.31,.55,.16],m.ink,[0,1.26,0]);
  for (const [dy,col] of [[1.39,m.red],[1.17,m.mint]]) disk(signal,0,dy,.104,.085,.037,col).rotation.x=Math.PI/2;
}

export function peak(group,m,x,z,width,height) {
  const h = height, w = width/2;
  cutout(group,[[-w,0],[0,h],[w,0]],m.heather,x,.12,z,.22);
  cutout(group,[[0,h],[w,0],[w*.21,0]],m.plum,x,.12,z+.225,.015);
  cutout(group,[[-w*.32,h*.68],[0,h],[w*.31,h*.69],[w*.12,h*.76],[-w*.03,h*.69],[-w*.16,h*.77]],m.white,x,.13,z+.244,.012);
}

export function bridge(crossing, m, truss) {
  const span = 2.75, deck = .135, half = span/2;
  box(crossing,[span,.10,.59],m.sand,[0,deck-.065,0]);
  for (let i=0;i<13;i++) box(crossing,[.031,.019,.56],m.edge,[-half+.12+i*.205,deck-.010,0]);
  for (const side of [-.32,.32]) {
    if (truss) {
      beam(crossing,[-half,.19,side],[half,.19,side],.07,m.brick);
      beam(crossing,[-half+.26,.63,side],[half-.26,.63,side],.074,m.brick);
      for (let i=0;i<6;i++) {
        const x0=-half+i*span/6, x1=x0+span/6;
        beam(crossing,[x0,i%2 ? .63:.19,side],[x1,i%2 ? .19:.63,side],.06,m.brick);
      }
    } else {
      for (const xEnd of [-half,half]) box(crossing,[.09,.91,.09],m.green,[xEnd,.48,side]);
      const cable = t => .86 - .43*Math.sin(Math.PI*t);
      for (let i=0;i<8;i++) {
        const t=i/8, dx=-half+t*span;
        beam(crossing,[dx,cable(t),side],[dx+span/8,cable(t+1/8),side],.041,m.green);
        if (i) beam(crossing,[dx,deck,side],[dx,cable(t),side],.028,m.green);
      }
    }
  }
}

function valley(group,m) {
  ground(group,[[-5.55,-3.36],...valleyWest,[-5.55,3.36]],m.heath,.096,.09);
  ground(group,[[5.55,-3.36],...valleyEast,[5.55,3.36]],m.heath,.096,.09);
  ground(group,[...valleyWest,...[...valleyEast].reverse()],m.turquoise,.033);
  // The pale lower bank forms a second contour of the gorge on each page.
  for (const [bank,side] of [[valleyWest,-1],[valleyEast,1]]) {
    ground(group,[...bank,...bank.map(([x,z])=>[x+side*.23,z]).reverse()],m.heather,.105,.012);
  }
  peak(group,m,-4.37,-2.88,2.13,1.77);
  peak(group,m,-3.23,-2.97,1.66,1.21);
  peak(group,m,4.88,-3.04,1.28,1.14);
  for (const [x,z,s] of [[-4.99,2.33,.64],[-4.44,2.69,.46],[4.92,2.83,.48]]) makeTree(group,m,[x,.10,z],s);
}

export const landscapes = { everyday: market, riverside, clock: station, tie: valley };
