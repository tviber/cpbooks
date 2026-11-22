// All coordinates are on the open spread, in (x, z). The drawing can bend,
// rise or change scale without changing the walking time on a road.
const layouts = {
  everyday: {
    stops: { post: [-4.28, -.15], clock: [-1.62, -2.02], garden: [-1.52, 1.86], books: [1.86, -1.65], pier: [4.17, 1.24] },
    bends: { 'garden-books': [[-.24, .74]], 'garden-pier': [[1.27, 2.03]] },
    labels: { 'post-clock': .32, 'post-garden': .61, 'garden-pier': .55, 'books-pier': .65 },
  },
  riverside: {
    stops: { ferry: [-4.55, -.95], reed: [-2.90, 1.82], lock: [-1.18, -2.20], dock: [.43, .18], shoal: [3.32, 2.07], beacon: [4.25, -2.09] },
    bends: { 'ferry-lock': [[-3.10, -1.91]], 'reed-dock': [[-1.61, 1.64]], 'lock-beacon': [[1.39, -2.40]], 'dock-shoal': [[1.82, 1.03]] },
    labels: { 'ferry-reed': .67, 'reed-dock': .37, 'lock-dock': .65, 'dock-shoal': .65, 'shoal-beacon': .43 },
    signOffsets: { lock: [0, -.64], dock: [-.16, .81], beacon: [.13, .77] },
    boardwalks: ['reed-dock', 'dock-shoal'],
  },
  clock: {
    stops: { gate: [-4.73, .06], ticket: [-2.85, -1.86], hall: [-.35, -.18], check: [2.05, .55], underpass: [-1.70, 2.00], luggage: [1.27, -2.39], platform: [4.63, 1.51] },
    bends: { 'ticket-luggage': [[-.92, -2.49]], 'gate-underpass': [[-3.98, 1.52]], 'underpass-platform': [[.31, 2.12], [3.29, 2.10]] },
    signOffsets: { gate: [-.12, .75], ticket: [-.39, -.53], hall: [-.37, .86], check: [.73, -.36], luggage: [.44, -.49], platform: [.03, .85] },
    labels: { 'gate-underpass': .65, 'ticket-hall': .51, 'hall-check': .5, 'check-platform': .61 },
  },
  tie: {
    stops: { camp: [-4.75, -.02], pine: [-2.60, -1.77], trail: [-2.38, 1.87], truss: [1.15, -1.65], rope: [1.15, 1.72], ridge: [3.57, -2.49], spring: [3.70, 2.34], summit: [4.86, -.02] },
    bends: { 'pine-truss': [[-.23, -1.65]], 'truss-ridge': [[2.53, -1.65]], 'trail-rope': [[-.23, 1.72]], 'rope-spring': [[2.53, 1.72]] },
    signOffsets: { camp: [-.12, .78], pine: [-.19, -.65], truss: [-.42, -1.19], rope: [-.05, 1.02], ridge: [.23, -.85], spring: [.08, .78], summit: [-.04, .58] },
    labels: { 'camp-trail': .68, 'truss-ridge': .61, 'ridge-summit': .52, 'spring-summit': .25 },
  },
};

export function townLayout(scenarioId) { return layouts[scenarioId]; }

export function roadPath(layout, from, to) {
  const forward = layout.bends[`${from}-${to}`];
  const backwards = layout.bends[`${to}-${from}`];
  const middle = forward ?? (backwards ? [...backwards].reverse() : []);
  return [layout.stops[from], ...middle, layout.stops[to]];
}

// A label and the moving marker both use distance along the same polyline.
export function pointOnPath(path, fraction) {
  const lengths = path.slice(1).map(([x, z], i) => Math.hypot(x - path[i][0], z - path[i][1]));
  let remaining = Math.max(0, Math.min(1, fraction)) * lengths.reduce((sum, n) => sum + n, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const t = remaining / lengths[i];
      return path[i].map((v, axis) => v + (path[i + 1][axis] - v) * t);
    }
    remaining -= lengths[i];
  }
  return path.at(-1);
}

// Use the same shoreline in the model and its accessible flat version.
export const riverBank = [[-5.58, -1.67], [-4.53, -1.58], [-3.46, -.59], [-2.31, -.72], [-1.14, -1.08], [.29, -.6], [1.18, .01], [2.44, .22], [3.61, -.15], [4.76, .34], [5.58, .43]];
export const valleyWest = [[1.02, -3.36], [.55, -2.72], [.73, -2.14], [.39, -1.39], [.53, -.65], [.12, .04], [.37, .79], [.25, 1.47], [.65, 2.17], [.44, 2.89], [.67, 3.36]];
export const valleyEast = [[2.09, -3.36], [1.68, -2.56], [1.92, -1.98], [1.52, -1.24], [1.83, -.45], [1.43, .17], [1.72, .86], [1.65, 1.65], [2.03, 2.18], [1.61, 2.96], [1.88, 3.36]];
