import { ZONES, MAP_CONFIG } from '../src/game/constants.js';
import { findNavigationWaypoints } from '../server/pathfinding.js';
import { simulateMovement } from '../src/game/physics.js';

// Simulate Vasilich walking from spawn to all zones on the map
const spawn = { x: 100, y: 280 };

for (const zone of ZONES) {
  let bot = { x: spawn.x, y: spawn.y, vx: 0, vy: 0 };
  const targetX = zone.x + zone.w / 2;
  const targetY = zone.y + zone.h / 2;

  // Best interaction point outside obstacle box
  let bestPoint = null;
  let bestDist = Infinity;
  const candidatePoints = [
    { x: zone.x - 22, y: Math.max(zone.y + 10, Math.min(zone.y + zone.h - 10, bot.y)) },
    { x: zone.x + zone.w + 22, y: Math.max(zone.y + 10, Math.min(zone.y + zone.h - 10, bot.y)) },
    { x: Math.max(zone.x + 10, Math.min(zone.x + zone.w - 10, bot.x)), y: zone.y - 22 },
    { x: Math.max(zone.x + 10, Math.min(zone.x + zone.w - 10, bot.x)), y: zone.y + zone.h + 22 }
  ];
  for (const p of candidatePoints) {
    const d = Math.hypot(bot.x - p.x, bot.y - p.y);
    if (d < bestDist) {
      bestDist = d;
      bestPoint = p;
    }
  }

  let waypoints = findNavigationWaypoints(bot.x, bot.y, bestPoint.x, bestPoint.y);
  let reached = false;
  let ticks = 0;

  while (ticks < 300) {
    ticks++;
    const target = waypoints[0] || bestPoint;
    const d = Math.hypot(bot.x - target.x, bot.y - target.y);
    if (d < 20) {
      waypoints.shift();
      if (waypoints.length === 0) {
        reached = true;
        break;
      }
      continue;
    }

    const angle = Math.atan2(target.y - bot.y, target.x - bot.x);
    const speed = 5.0;
    const next = simulateMovement(bot.x, bot.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
    bot.x = next.x;
    bot.y = next.y;

    const distToZone = Math.hypot(
      bot.x - Math.max(zone.x, Math.min(bot.x, zone.x + zone.w)),
      bot.y - Math.max(zone.y, Math.min(bot.y, zone.y + zone.h))
    );
    if (distToZone <= 55) {
      reached = true;
      break;
    }
  }

  if (reached) {
    console.log(`✅ Vasilich reached ${zone.label} in ${ticks} ticks (~${(ticks * 0.04).toFixed(1)}s)`);
  } else {
    console.error(`❌ Vasilich STUCK trying to reach ${zone.label} at (${bot.x.toFixed(1)}, ${bot.y.toFixed(1)})`);
    process.exit(1);
  }
}

console.log('\n🎉 ALL zones are reachable smoothly without sticking!');
