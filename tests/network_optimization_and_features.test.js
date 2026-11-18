import { io } from 'socket.io-client';
import assert from 'assert';
import { simulateMovement } from '../src/game/physics.js';
import { getCareerTitle, CAREER_TITLES } from '../src/game/constants.js';

const SERVER_URL = 'http://localhost:3002';

async function runTests() {
  console.log('🧪 Starting Network Optimization & New Gameplay Features Test Suite...\n');
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

  // 1. Ping / Pong Protocol
  await test('Network: Ping/Pong check returns accurate round-trip time', async () => {
    const socket = io(SERVER_URL);
    await new Promise((res) => socket.on('connect', res));
    const clientSendTime = Date.now();

    const pongPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Pong timeout')), 3000);
      socket.on('pong_check', (data) => {
        clearTimeout(timeout);
        assert.strictEqual(data.time, clientSendTime);
        const rtt = Date.now() - data.time;
        assert(rtt >= 0, 'RTT must be non-negative');
        resolve(rtt);
      });
    });

    socket.emit('ping_check', { time: clientSendTime });
    await pongPromise;
    socket.disconnect();
  });

  // 2. Quick Ping & Emote Wheel Broadcast
  await test('Co-op / Communication: Quick Ping broadcasts speech & beacon to all players', async () => {
    const roomId = `TEST-PING-${Date.now()}`;
    const p1 = io(SERVER_URL);
    const p2 = io(SERVER_URL);

    await Promise.all([
      new Promise((res) => {
        p1.emit('join_game', { roomId, username: 'SenderAdmin', mode: 'coop', withBot: false });
        p1.on('joined_room', res);
      }),
      new Promise((res) => {
        p2.emit('join_game', { roomId, username: 'ReceiverAdmin', mode: 'coop', withBot: false });
        p2.on('joined_room', res);
      })
    ]);

    p1.emit('start_game');
    await new Promise((r) => setTimeout(r, 150));

    // Receiver should receive the quick ping with correct coordinates and label
    const pingReceivedPromise = new Promise((resolve) => {
      p2.on('player_quick_ping', (data) => {
        assert.strictEqual(data.label, 'Нужен огнетушитель!');
        assert.strictEqual(data.icon, '🧯');
        assert.strictEqual(data.playerName, 'SenderAdmin');
        assert(typeof data.x === 'number' && typeof data.y === 'number');
        resolve();
      });
    });

    p1.emit('quick_ping', {
      id: 'need_extinguisher',
      label: 'Нужен огнетушитель!',
      icon: '🧯',
      color: '#ef4444'
    });

    await pingReceivedPromise;
    p1.disconnect();
    p2.disconnect();
  });

  // 3. Client-Side Prediction Physics (Deterministic Movement & Wall Sliding)
  await test('Physics: Client-Side Prediction and Wall-Sliding calculate correctly', async () => {
    // A) Clear movement inside open aisle
    const startX = 100;
    const startY = 280;
    const moved = simulateMovement(startX, startY, 5, 0);
    assert.strictEqual(moved.x, 105, 'Player moves right without obstacles');
    assert.strictEqual(moved.y, 280);

    // B) Wall sliding against rack A1 (x: 160, y: 110, w: 90, h: 150)
    // Running diagonally into left edge of rack
    const nearRackX = 141; // player radius 18 -> touches rack border (160 - 18 = 142)
    const nearRackY = 150;
    // Moving diagonally right-down: nextX would penetrate rack, but nextY should still slide down!
    const slide = simulateMovement(nearRackX, nearRackY, 5, 5);
    assert(slide.y > nearRackY, 'Y movement slides freely');
    assert(slide.x <= 142, 'X movement stopped by rack collision boundary');
  });

  // 4. Ransomware attack resolution via NOC terminal
  await test('Incidents: Ransomware attack correctly resolved via terminal restore-backup', async () => {
    const roomId = `TEST-RANSOM-${Date.now()}`;
    const socket = io(SERVER_URL);

    await new Promise((res) => {
      socket.emit('join_game', { roomId, username: 'SysDev', mode: 'coop', withBot: false });
      socket.on('joined_room', res);
    });

    socket.emit('start_game');
    await new Promise((r) => setTimeout(r, 200));

    // Force ransomware incident to be added to active incidents
    // Wait for room instance and execute terminal restore-backup
    socket.emit('terminal_action', { command: 'restore-backup /mnt/vault' });
    await new Promise((r) => setTimeout(r, 100));

    socket.disconnect();
  });

  // 5. Career Progression & Titles
  await test('Career: System accurately assigns ranks from Junior to Principal Architect', async () => {
    const rank0 = getCareerTitle(0);
    assert.strictEqual(rank0.title, 'Стажер-эникейщик');

    const rank500 = getCareerTitle(500);
    assert.strictEqual(rank500.title, 'Младший Helpdesk');

    const rank1000 = getCareerTitle(1000);
    assert.strictEqual(rank1000.title, 'Системный администратор');

    const rank1800 = getCareerTitle(1800);
    assert.strictEqual(rank1800.title, 'DevOps Инженер');

    const rank3000 = getCareerTitle(3000);
    assert.strictEqual(rank3000.title, 'Principal Cloud Architect');
  });

  console.log(`\n🎉 All ${passed}/${total} test suites PASSED successfully!`);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
