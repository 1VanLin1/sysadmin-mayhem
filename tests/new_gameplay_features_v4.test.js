import { io } from 'socket.io-client';
import assert from 'assert';
import { isPlayerOnCoolant } from '../src/game/physics.js';
import { getAdminClass, ADMIN_CLASSES } from '../src/game/constants.js';

const SERVER_URL = 'http://localhost:3002';

async function runTests() {
  console.log('🧪 Starting Test Suite: Admin Classes, Byte the Cat, Blackout DGU, Minigames & Coolant Physics...\n');
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    return fn()
      .then(() => {
        console.log(`✅ [PASS] ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`❌ [FAIL] ${name}:`, err);
        throw err;
      });
  }

  // 1. Admin Specializations / Classes
  await test('Classes: Player correctly selects NetOps, Hardware, or Facility specialization', async () => {
    assert.strictEqual(ADMIN_CLASSES.length, 3, 'Must have 3 admin classes');
    const netops = getAdminClass('netops');
    assert.strictEqual(netops.speedMultiplier, 1.15);
    assert(netops.boostTypes.includes('cable_disconnect'));

    const hardware = getAdminClass('hardware');
    assert(hardware.boostTypes.includes('hdd_failure'));

    const facility = getAdminClass('facility');
    assert(facility.boostTypes.includes('generator_start'));
    assert(facility.boostTypes.includes('fire'));
  });

  // 2. Multi-client game with Class selection
  await test('Multiplayer: Socket connects with Admin Class and receives state with class and cat', async () => {
    const roomId = `TEST-CLASS-${Date.now()}`;
    const socket = io(SERVER_URL);
    await new Promise((res) => socket.on('connect', res));

    const joinPromise = new Promise((res) => {
      socket.on('joined_room', res);
    });

    socket.emit('join_game', {
      roomId,
      username: 'NetAdmin',
      color: '#38bdf8',
      mode: 'coop',
      withBot: false,
      adminClass: 'facility'
    });

    await joinPromise;
    socket.emit('start_game');

    const state = await new Promise((res) => {
      const onState = (s) => {
        if (s.status === 'playing' && s.players?.length >= 1) {
          socket.off('game_state', onState);
          res(s);
        }
      };
      socket.on('game_state', onState);
    });

    const player = state.players.find((p) => p.name === 'NetAdmin');
    assert.strictEqual(player.adminClass, 'facility');
    assert(state.cat, 'Game state must include server cat Byte');
    assert(typeof state.cat.x === 'number' && typeof state.cat.y === 'number');

    socket.disconnect();
  });

  // 3. Byte the Cat: Petting and Blessing Buff
  await test('Byte the Cat: Petting cat applies purr status and 15s speed blessing', async () => {
    const roomId = `TEST-CAT-${Date.now()}`;
    const socket = io(SERVER_URL);
    await new Promise((res) => socket.on('connect', res));

    await new Promise((res) => {
      socket.emit('join_game', { roomId, username: 'CatLover', mode: 'coop', withBot: false });
      socket.on('joined_room', res);
    });

    socket.emit('start_game');
    await new Promise((r) => setTimeout(r, 100));

    // Get cat position and move player next to cat
    const stateWithCat = await new Promise((res) => {
      socket.once('game_state', res);
    });
    const catPos = stateWithCat.cat;

    socket.emit('player_move', { x: catPos.x, y: catPos.y, vx: 0, vy: 0 });
    await new Promise((r) => setTimeout(r, 60));

    // Pet the cat
    socket.emit('pet_cat');

    const blessedState = await new Promise((res) => {
      const onState = (s) => {
        const p = s.players?.find((pl) => pl.name === 'CatLover');
        if (p?.hasCatBlessing) {
          socket.off('game_state', onState);
          res(s);
        }
      };
      socket.on('game_state', onState);
    });

    const blessedPlayer = blessedState.players.find((p) => p.name === 'CatLover');
    assert.strictEqual(blessedPlayer.hasCatBlessing, true, 'Player must have cat blessing buff');
    assert.strictEqual(blessedState.cat.isPurring, true, 'Cat must be in purring state');

    socket.disconnect();
  });

  // 4. Interactive Minigame Express Repair (+60 bonus XP)
  await test('Minigames: Express minigame completion resolves incident with +60 bonus XP', async () => {
    const roomId = `TEST-MINI-${Date.now()}`;
    const socket = io(SERVER_URL);
    await new Promise((res) => socket.on('connect', res));

    await new Promise((res) => {
      socket.emit('join_game', { roomId, username: 'SpeedRunner', mode: 'coop', withBot: false });
      socket.on('joined_room', res);
    });

    socket.emit('start_game');

    // Wait for initial incident
    const state = await new Promise((res) => {
      const onState = (s) => {
        if (s.activeIncidents?.length > 0) {
          socket.off('game_state', onState);
          res(s);
        }
      };
      socket.on('game_state', onState);
    });

    const incident = state.activeIncidents[0];
    const initialScore = state.players.find((p) => p.name === 'SpeedRunner').score;

    // Move to incident zone
    socket.emit('player_move', { x: incident.targetX, y: incident.targetY, vx: 0, vy: 0 });
    await new Promise((r) => setTimeout(r, 80));

    // Solve via minigame
    socket.emit('minigame_complete', { incidentId: incident.id, type: 'wires' });

    const nextState = await new Promise((res) => {
      const onState = (s) => {
        const p = s.players.find((pl) => pl.name === 'SpeedRunner');
        if (p.score > initialScore) {
          socket.off('game_state', onState);
          res(s);
        }
      };
      socket.on('game_state', onState);
    });

    const updatedPlayer = nextState.players.find((p) => p.name === 'SpeedRunner');
    const expectedPoints = incident.points + 60;
    assert.strictEqual(updatedPlayer.score, initialScore + expectedPoints, 'Earned incident points + 60 minigame bonus');
    assert(!nextState.activeIncidents.some((i) => i.id === incident.id), 'Incident was removed from active list');

    socket.disconnect();
  });

  // 5. Coolant Slipperiness Physics
  await test('Physics: isPlayerOnCoolant accurately identifies slippery refrigerant puddle zones', async () => {
    const incidentsWithoutCoolant = [{ type: 'fire' }, { type: 'hdd_failure' }];
    assert.strictEqual(isPlayerOnCoolant(420, 460, incidentsWithoutCoolant), false, 'Not slippery without coolant leak incident');

    const incidentsWithCoolant = [{ type: 'coolant_leak' }];
    assert.strictEqual(isPlayerOnCoolant(420, 460, incidentsWithCoolant), true, 'Inside indoor coolant puddle');
    assert.strictEqual(isPlayerOnCoolant(930, 530, incidentsWithCoolant), true, 'Inside outdoor chiller coolant puddle');
    assert.strictEqual(isPlayerOnCoolant(100, 200, incidentsWithCoolant), false, 'Outside puddle radius is normal floor');
  });

  console.log(`\n🎉 All ${passed}/${total} test suites PASSED successfully!`);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
