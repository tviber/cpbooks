// All coordinates are on the open spread, in (x, z). The drawing can bend,
// rise or change scale without changing the walking time on a road.
const layouts = {
  everyday: {
    stops: { post: [-4.28, -.15], clock: [-1.62, -2.02], garden: [-1.52, 1.86], books: [1.86, -1.65], pier: [4.17, 1.24] },
    bends: { 'garden-books': [[-.24, .74]], 'garden-pier': [[1.27, 2.03]] },
    labels: { 'post-clock': .32, 'post-garden': .61, 'garden-pier': .55, 'books-pier': .65 },
  },
  riverside: {
    stops: { post: [-4.45, -1.28], clock: [-.75, -2.25], garden: [-2.88, 1.69], books: [2.76, -1.19], pier: [3.85, 1.96] },
    bends: { 'post-clock': [[-2.90, -2.05]], 'garden-books': [[.16, .51]],
      'garden-pier': [[-1.1, 2.06], [1.18, 2.12]], 'clock-books': [[1.22, -2.25]] },
    labels: { 'post-clock': .43, 'post-garden': .66, 'garden-clock': .47, 'garden-books': .53, 'garden-pier': .51, 'books-pier': .64 },
  },
  clock: {
    stops: { post: [-4.35, 1.65], clock: [-.15, .48], garden: [-2.7, -1.37], books: [2.66, -.94], pier: [4.31, -2.44] },
    bends: { 'post-clock': [[-2.62, 1.64], [-1.26, .68]], 'garden-books': [[.34, -1.22]],
      'garden-pier': [[-1.36, -2.66], [2.26, -2.66]], 'books-pier': [[3.86, -1.76]] },
    signOffsets: { garden: [-.64, .72], books: [.22, .99], pier: [.86, -.10] },
    labels: { 'post-garden': .34, 'garden-clock': .50, 'clock-books': .54, 'garden-books': .32, 'books-pier': .41 },
  },
  tie: {
    stops: { post: [-4.45, -.42], clock: [-2.17, -2.24], garden: [-2.3, 1.64], books: [-.23, -1.65], pier: [4.15, .19] },
    bends: { 'garden-books': [[-.95, .07]], 'garden-pier': [[-.15, 1.72], [2.38, 1.72]],
      'books-pier': [[2.42, -1.65]] },
    signOffsets: { post: [-.22, .66], clock: [-.48, -.43], books: [.46, .93] },
    labels: { 'post-clock': .34, 'post-garden': .73, 'garden-books': .43, 'clock-books': .62, 'garden-pier': .48, 'books-pier': .44 },
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
