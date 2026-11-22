import * as THREE from 'three';
import { box } from './materials.js';
import { makeTree } from './book.js';
import { beam, cutout, disk, groupAt, mesh } from './town-paper.js';
import { bridge, lighthouse, peak } from './town-landscapes.js';

function reeds(g, m) {
  for (const [x, z, h] of [[-.32, .13, .82], [-.19, -.16, 1.03], [.02, .18, .73], [.23, -.14, .97], [.36, .08, .83]]) {
    beam(g, [x, .05, z], [x + .07, h, z], .034, m.green);
    const ear = disk(g, x + .07, h, z, .064, .23, m.brick, 8);
    ear.rotation.z = -.09;
    cutout(g, [[0,0],[-.21,.53],[-.04,.35]], m.mint, x, .09, z);
  }
}

function lock(g, m) {
  box(g, [1.16,.09,.59], m.aqua, [0,.08,0]);
  for (const x of [-.53, .53]) box(g, [.18,.60,.67], m.slate, [x,.34,0]);
  for (const x of [-.23, .23]) {
    const gate = groupAt(g, x, .05, 0, x < 0 ? -.28 : .28);
    box(gate, [.51,.44,.08], m.sand, [0,.25,0]);
    beam(gate, [-.20,.07,.06], [.20,.43,.06], .05, m.brick);
  }
}

function dock(g, m) {
  box(g, [1.18,.12,.65], m.sand, [0,.14,0]);
  box(g, [.15,.94,.15], m.navy, [-.35,.61,0]);
  beam(g, [-.35,1.05,0], [.47,1.31,0], .10, m.mustard);
  beam(g, [-.35,.63,0], [.12,1.18,0], .06, m.mustard);
  beam(g, [.43,1.30,0], [.43,.56,0], .026, m.ink);
  box(g, [.31,.27,.30], m.clay, [.43,.44,0]);
}

function shoal(g, m) {
  disk(g, 0,.09,0,.75,.09,m.biscuit,10).scale.z = .70;
  disk(g, -.13,.50,0,.034,.82,m.sand);
  for (let i=0; i<8; i++) mesh(g, new THREE.ConeGeometry(.48,.27,1,1,true,i*Math.PI/4,Math.PI/4), i%2 ? m.coral : m.cream, -.13,.89,0);
}

function entrance(g, m) {
  for (const x of [-.51, .51]) box(g, [.16,.88,.30], m.slate, [x,.49,0]);
  box(g, [1.27,.22,.33], m.navy, [0,.99,0]);
  box(g, [.67,.08,.02], m.mustard, [0,1,.177]);
}

function kiosk(g, m) {
  box(g, [.89,.74,.60], m.mustard, [0,.44,0]);
  box(g, [.63,.34,.02], m.navy, [0,.53,.31]);
  box(g, [.74,.06,.24], m.cream, [0,.35,.35]);
  box(g, [1.12,.10,.79], m.navy, [0,.86,0]);
}

function turnstiles(g, m) {
  for (const x of [-.40, .02, .44]) {
    box(g, [.17,.53,.53], m.navy, [x,.32,0]);
    box(g, [.19,.06,.52], m.aqua, [x,.61,0]);
    if (x < .4) beam(g, [x,.38,.10], [x+.28,.27,.10], .045, m.mustard);
  }
}

function tunnel(g, m) {
  for (const x of [-.48,.48]) box(g, [.16,.43,.67], m.slate, [x,.26,0]);
  const arch = mesh(g, new THREE.TorusGeometry(.48,.085,4,12,Math.PI), m.navy, 0,.46,.16);
  arch.scale.z = 2;
  for (let i=0; i<4; i++) box(g, [.78,.07,.15], m.slate, [0,.12+i*.07,.39-i*.16]);
}

function luggage(g, m) {
  for (const [x,z,h,material] of [[-.33,.05,.48,m.clay],[.28,.05,.42,m.sand],[-.15,.02,.87,m.biscuit]]) {
    box(g, [.53,.40,.47], material, [x,h-.19,z]);
    for (const side of [-.15,.15]) box(g,[.048,.42,.49],m.navy,[x+side,h-.19,z]);
  }
}

function platform(g, m) {
  box(g,[1.45,.10,.72],m.slate,[0,.12,0]);
  for (const x of [-.53,.53]) box(g,[.06,.74,.06],m.navy,[x,.54,0]);
  const roof = box(g,[1.49,.09,.78],m.navy,[0,.94,0]);
  roof.rotation.x = -.14;
  box(g,[.72,.09,.28],m.mustard,[0,.34,.12]);
}

function camp(g, m) {
  cutout(g,[[-.62,0],[0,.88],[.62,0]],m.rust,0,.11,-.35,.72);
  cutout(g,[[-.23,0],[0,.53],[.23,0]],m.ink,0,.109,.376,.018);
  beam(g,[0,.98,-.46],[0,.98,.48],.04,m.sand);
}

function cairn(g, m) {
  for (const [x,y,r] of [[-.04,.20,.46],[.07,.43,.34],[-.02,.62,.24]]) {
    const rock = mesh(g,new THREE.IcosahedronGeometry(r,0),m.heather,x,y,0);
    rock.scale.y = .57;
  }
}

function spring(g, m) {
  disk(g,0,.12,0,.59,.11,m.aqua,12).scale.z = .72;
  for (const [x,z] of [[-.44,-.10],[-.20,-.30],[.16,-.36],[.41,-.24]]) {
    mesh(g,new THREE.IcosahedronGeometry(.19,0),m.slate,x,.21,z);
  }
  cutout(g,[[0,0],[.21,0],[.12,.42]],m.foam,.06,.15,-.18,.04);
}

export const localLandmarks = {
  reed: reeds, lock, dock, shoal, beacon: lighthouse,
  gate: entrance, ticket: kiosk, check: turnstiles, underpass: tunnel, luggage, platform, camp,
  pine(g,m) { makeTree(g,m,[-.22,.10,0],1.08); makeTree(g,m,[.29,.10,-.15],.77); },
  trail: cairn, truss(g,m) { bridge(g,m,true); }, rope(g,m) { bridge(g,m,false); },
  ridge(g,m) { peak(g,m,0,-.13,1.39,1.04); }, spring,
  summit(g,m) {
    peak(g,m,0,-.18,1.49,1.26);
    box(g,[.033,.49,.033],m.ink,[0,1.59,-.11]);
    cutout(g,[[0,0],[.39,.10],[0,.24]],m.red,0,1.59,-.11,.027);
  },
};
