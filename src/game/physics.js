import { MAP_CONFIG, ZONES, COOLANT_PUDDLES } from './constants.js';

export function isPlayerOnCoolant(x, y, activeIncidents = []) {
  const hasCoolantIncident = activeIncidents.some((inc) => inc.type === 'coolant_leak' || inc.type === 'radiator_jam');
  if (!hasCoolantIncident) return false;

  for (const p of COOLANT_PUDDLES) {
    const dist = Math.hypot(x - p.x, y - p.y);
    if (dist < p.radius) return true;
  }
  return false;
}

export function resolveCollisions(x, y) {
  const r = MAP_CONFIG.playerRadius;
  const minX = MAP_CONFIG.wallThickness + r;
  const maxX = MAP_CONFIG.width - MAP_CONFIG.wallThickness - r;
  const minY = MAP_CONFIG.wallThickness + r;
  const maxY = MAP_CONFIG.height - MAP_CONFIG.wallThickness - r;

  // Outer complex boundary walls
  x = Math.max(minX, Math.min(maxX, x));
  y = Math.max(minY, Math.min(maxY, y));

  // Dividing Wall (x: 860) with Doorway (y: 295..445)
  const wallX = MAP_CONFIG.outdoorStartX;
  const isDoorway = y >= 295 && y <= 445;

  if (!isDoorway) {
    if (x < wallX && x + r > wallX) x = wallX - r;
    if (x > wallX && x - r < wallX) x = wallX + r;
  }

  // Smooth sliding push-out for all zone obstacles (Racks, Desks, Chiller, Generator, Satellite)
  for (const zone of ZONES) {
    const cx = Math.max(zone.x, Math.min(x, zone.x + zone.w));
    const cy = Math.max(zone.y, Math.min(y, zone.y + zone.h));
    const distX = x - cx;
    const distY = y - cy;
    const distSq = distX * distX + distY * distY;

    if (distSq < r * r) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.001) {
        const overlap = r - dist;
        x += (distX / dist) * overlap;
        y += (distY / dist) * overlap;
      } else {
        // Player center inside box: push out to nearest edge
        const left = Math.abs(x - zone.x);
        const right = Math.abs(x - (zone.x + zone.w));
        const top = Math.abs(y - zone.y);
        const bottom = Math.abs(y - (zone.y + zone.h));
        const min = Math.min(left, right, top, bottom);
        if (min === left) x = zone.x - r;
        else if (min === right) x = zone.x + zone.w + r;
        else if (min === top) y = zone.y - r;
        else y = zone.y + zone.h + r;
      }
    }
  }

  return { x, y };
}

export function simulateMovement(currentX, currentY, vx, vy) {
  return resolveCollisions(currentX + vx, currentY + vy);
}
