import { riverBank, valleyEast, valleyWest } from '../scene/town-layouts.js';

// The flat spread uses the same world coordinates as the WebGL book.
export const flatPoint = (x, y, z) => ({ horizontal: (x + 6) / 12 * 100, vertical: (z + 3.7) / 7.4 * 100 });
const points = list => list.map(p => p.join(',')).join(' ');
const polygon = (list, fill) => `<polygon points="${points(list)}" fill="${fill}"/>`;
const cottage = (x,z,fill) => `<g transform="translate(${x} ${z})"><rect x="-.44" y="-.35" width=".88" height=".70" fill="#dfbb94"/><path d="M-.55,-.18 L0,-.63 .55,-.18Z" fill="${fill}"/><rect x="-.08" y="-.11" width=".16" height=".31" fill="#725a43"/></g>`;

export function flatTerrain(id) {
  if (id === 'everyday') return `${cottage(-4.86,-2.57,'#a75a45')}${cottage(-3.70,-2.64,'#a75a45')}${cottage(4.32,-2.58,'#698066')}
    <path d="M-2,-3 Q0,-2.6 2,-3" fill="none" stroke="#826f56" stroke-width=".05"/>
    <path d="M-1.5,-2.91l.30,.05-.20,.26z M-.72,-2.85l.30,.03-.17,.25z M.16,-2.81l.30,-.01-.12,.28z M.98,-2.87l.3,-.04-.10,.28z" fill="#c96a43"/>
    <g fill="#c47954" stroke="#f6ead1" stroke-width=".11"><circle cx="3.02" cy="2.68" r=".51"/><circle cx="4.48" cy="2.53" r=".41"/></g>`;
  if (id === 'riverside') return `${polygon([...riverBank,[5.58,3.32],[-5.58,3.32]],'#86c5be')}
    <ellipse cx="-2.88" cy="1.69" rx="1.05" ry=".65" fill="#bfcb9e"/>
    <path d="M-4.8,2.32h.66l-.18,.20h-.36z M-4.52,2.26v-.75l-.48,.75z" fill="#fff8e9" stroke="#557e80" stroke-width=".037"/>
    <g transform="translate(4.53,-2.36)"><path d="M-.45,.63l.24,-1.16h.42l.24,1.16z" fill="#fcf4dc" stroke="#ae6b50" stroke-width=".06"/><path d="M-.35,.1h.70l.07,.27h-.84z M-.35,-.51L0,-.88l.35,.37z" fill="#ca6b50"/></g>`;
  if (id === 'clock') return `<rect x="-5.5" y="-3.20" width="11" height="5.40" fill="#c6d0d1"/>
    <path d="M-5.4,2.55h10.8m-10.8,.52h10.8" fill="none" stroke="#48626d" stroke-width=".07"/>
    <path d="M-5.3,2.81H5.3" stroke="#8d8a77" stroke-width=".65" stroke-dasharray=".10 .21"/>
    <g fill="#c99842" stroke="#344d5e" stroke-width=".10"><rect x="-2.42" y="2.50" width="1.53" height=".60" rx=".13"/><rect x="-.61" y="2.50" width="1.57" height=".60" rx=".1"/><rect x="1.16" y="2.50" width="1.52" height=".60" rx=".1"/></g>
    <path d="M-5.1,-2.36v-.40l.85,-.43v.37l.89,-.43v.37l.89,-.37v.89z" fill="#597783"/>`;
  return `${polygon([[-5.55,-3.36],...valleyWest,[-5.55,3.36]],'#c6bfab')}${polygon([...valleyWest,...[...valleyEast].reverse()],'#6eaead')}${polygon([[5.55,-3.36],...valleyEast,[5.55,3.36]],'#c6bfab')}
    <path d="M-5.39,-2.20l.9,-1.02 .87,1.02z M2.52,-2.31l.87,-1.03 .91,1.03z M4.05,-2.27l.75,-.83 .77,.83z" fill="#837c91"/>
    <path d="M-.17,-1.91H2.53V-1.4H-.17Z" fill="#cba67a" stroke="#9c604b" stroke-width=".09"/>
    <path d="M-.17,1.44Q1.15,1.65 2.50,1.44V1.99Q1.15,1.81 -.17,1.99Z" fill="#d1b18a" stroke="#5e7762" stroke-width=".09"/>`;
}
