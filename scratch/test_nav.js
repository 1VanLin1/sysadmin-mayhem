import { ZONES, MAP_CONFIG } from '../src/game/constants.js';

const NAV_NODES = [
  { id: 'i_1_1', x: 90, y: 60 },
  { id: 'i_2_1', x: 285, y: 60 },
  { id: 'i_3_1', x: 455, y: 60 },
  { id: 'i_4_1', x: 620, y: 60 },
  { id: 'i_5_1', x: 790, y: 60 },

  { id: 'i_1_2', x: 90, y: 300 },
  { id: 'i_2_2', x: 285, y: 300 },
  { id: 'i_3_2', x: 455, y: 300 },
  { id: 'i_4_2', x: 620, y: 300 },
  { id: 'i_5_2', x: 790, y: 300 },

  { id: 'i_1_3', x: 90, y: 515 },
  { id: 'i_2_3', x: 285, y: 515 },
  { id: 'i_3_3', x: 455, y: 515 },
  { id: 'i_4_3', x: 620, y: 515 },
  { id: 'i_5_3', x: 790, y: 515 },

  { id: 'i_1_4', x: 90, y: 665 },
  { id: 'i_2_4', x: 285, y: 665 },
  { id: 'i_3_4', x: 455, y: 665 },
  { id: 'i_4_4', x: 620, y: 665 },
  { id: 'i_5_4', x: 790, y: 665 },

  { id: 'door', x: 860, y: 370 },

  { id: 'o_1_1', x: 890, y: 60 },
  { id: 'o_1_2', x: 890, y: 270 },
  { id: 'o_1_3', x: 890, y: 370 },
  { id: 'o_1_4', x: 890, y: 470 },
  { id: 'o_1_5', x: 890, y: 660 },

  { id: 'o_2_1', x: 1140, y: 60 },
  { id: 'o_2_2', x: 1140, y: 270 },
  { id: 'o_2_3', x: 1140, y: 470 },
  { id: 'o_2_4', x: 1140, y: 660 }
];

const EDGES = [
  ['i_1_1', 'i_2_1'], ['i_2_1', 'i_3_1'], ['i_3_1', 'i_4_1'], ['i_4_1', 'i_5_1'],
  ['i_1_2', 'i_2_2'], ['i_2_2', 'i_3_2'], ['i_3_2', 'i_4_2'], ['i_4_2', 'i_5_2'],
  ['i_1_3', 'i_2_3'], ['i_2_3', 'i_3_3'], ['i_3_3', 'i_4_3'], ['i_4_3', 'i_5_3'],
  ['i_1_4', 'i_2_4'], ['i_2_4', 'i_3_4'], ['i_3_4', 'i_4_4'], ['i_4_4', 'i_5_4'],
  ['i_1_1', 'i_1_2'], ['i_1_2', 'i_1_3'], ['i_1_3', 'i_1_4'],
  ['i_2_1', 'i_2_2'], ['i_2_2', 'i_2_3'],
  ['i_3_1', 'i_3_2'], ['i_3_2', 'i_3_3'],
  ['i_4_1', 'i_4_2'], ['i_4_2', 'i_4_3'],
  ['i_5_1', 'i_5_2'], ['i_5_2', 'i_5_3'], ['i_5_3', 'i_5_4'],
  ['i_2_4', 'i_1_4'], ['i_5_4', 'i_4_4'],
  ['i_5_2', 'door'], ['door', 'o_1_3'],
  ['o_1_1', 'o_1_2'], ['o_1_2', 'o_1_3'], ['o_1_3', 'o_1_4'], ['o_1_4', 'o_1_5'],
  ['o_2_1', 'o_2_2'], ['o_2_2', 'o_2_3'], ['o_2_3', 'o_2_4'],
  ['o_1_1', 'o_2_1'], ['o_1_2', 'o_2_2'], ['o_1_4', 'o_2_3'], ['o_1_5', 'o_2_4']
];

const ADJ = new Map();
for (const n of NAV_NODES) ADJ.set(n.id, []);
for (const [from, to] of EDGES) {
  const nodeA = NAV_NODES.find((n) => n.id === from);
  const nodeB = NAV_NODES.find((n) => n.id === to);
  const dist = Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y);
  ADJ.get(from).push({ id: to, dist, x: nodeB.x, y: nodeB.y });
  ADJ.get(to).push({ id: from, dist, x: nodeA.x, y: nodeA.y });
}

export function hasLineOfSight(x1, y1, x2, y2, pad = 20) {
  const wallX = MAP_CONFIG.outdoorStartX;
  if ((x1 < wallX && x2 > wallX) || (x1 > wallX && x2 < wallX)) {
    const t = (wallX - x1) / (x2 - x1);
    const intersectY = y1 + t * (y2 - y1);
    if (intersectY < 305 || intersectY > 435) return false;
  }

  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.ceil(dist / 12);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + t * (x2 - x1);
    const py = y1 + t * (y2 - y1);
    if (px < pad || px > MAP_CONFIG.width - pad || py < pad || py > MAP_CONFIG.height - pad) return false;
    for (const z of ZONES) {
      if (px >= z.x - pad && px <= z.x + z.w + pad && py >= z.y - pad && py <= z.y + z.h + pad) return false;
    }
  }
  return true;
}

export function getClosestNavNode(x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const n of NAV_NODES) {
    const d = Math.hypot(x - n.x, y - n.y);
    const los = hasLineOfSight(x, y, n.x, n.y);
    const score = d + (los ? 0 : 500); // Prioritize nodes with direct line of sight!
    if (score < bestDist) {
      bestDist = score;
      best = n;
    }
  }
  return best;
}

export function findPath(startId, endId) {
  if (startId === endId) return [NAV_NODES.find((n) => n.id === startId)];
  const dists = new Map();
  const prev = new Map();
  const queue = new Set(NAV_NODES.map((n) => n.id));

  for (const n of NAV_NODES) dists.set(n.id, Infinity);
  dists.set(startId, 0);

  while (queue.size > 0) {
    let curr = null;
    let minDist = Infinity;
    for (const id of queue) {
      if (dists.get(id) < minDist) {
        minDist = dists.get(id);
        curr = id;
      }
    }
    if (!curr || minDist === Infinity) break;
    queue.delete(curr);
    if (curr === endId) break;

    for (const neighbor of ADJ.get(curr)) {
      if (!queue.has(neighbor.id)) continue;
      const alt = dists.get(curr) + neighbor.dist;
      if (alt < dists.get(neighbor.id)) {
        dists.set(neighbor.id, alt);
        prev.set(neighbor.id, curr);
      }
    }
  }

  const path = [];
  let u = endId;
  while (prev.has(u)) {
    path.unshift(NAV_NODES.find((n) => n.id === u));
    u = prev.get(u);
  }
  if (u === startId) {
    path.unshift(NAV_NODES.find((n) => n.id === startId));
    return path;
  }
  return null;
}

export function findNavigationWaypoints(startX, startY, endX, endY) {
  if (hasLineOfSight(startX, startY, endX, endY)) {
    return [{ x: endX, y: endY }];
  }
  const startNode = getClosestNavNode(startX, startY);
  const endNode = getClosestNavNode(endX, endY);
  if (!startNode || !endNode) return [{ x: endX, y: endY }];

  const graphPath = findPath(startNode.id, endNode.id) || [];
  const waypoints = graphPath.map((n) => ({ x: n.x, y: n.y }));
  waypoints.push({ x: endX, y: endY });

  // Filter out redundant first node if we already have line of sight to waypoint 1
  if (waypoints.length > 2 && hasLineOfSight(startX, startY, waypoints[1].x, waypoints[1].y)) {
    waypoints.shift();
  }

  return waypoints;
}

// Test path from spawn (100, 200) to outdoor satellite (930, 100)
const testPath = findNavigationWaypoints(100, 200, 930, 100);
console.log('Path from (100, 200) to Satellite (930, 100):', testPath.map((p) => `(${p.x}, ${p.y})`).join(' -> '));
