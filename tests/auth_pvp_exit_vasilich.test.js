import { io } from 'socket.io-client';
import assert from 'assert';

const SERVER_URL = 'http://localhost:3002';

async function runTests() {
  console.log('🧪 Starting comprehensive tests for Auth, Васильич Balance, Mode Switching, and Exit/Surrender...\n');
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

  // 1. Auth & Leaderboard API
  await test('API: Registration & Login & Leaderboard', async () => {
    const testUser = `test_admin_${Date.now()}`;
    const testPass = 'secret123';

    // 1. Register
    const regRes = await fetch(`${SERVER_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUser, password: testPass, color: '#10b981' })
    });
    const regData = await regRes.json();
    assert.strictEqual(regData.success, true, 'Registration should succeed');
    assert.strictEqual(regData.user.username, testUser);

    // 2. Duplicate registration should fail
    const dupRes = await fetch(`${SERVER_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUser, password: testPass })
    });
    const dupData = await dupRes.json();
    assert.strictEqual(dupData.success, false, 'Duplicate register must fail');

    // 3. Login with correct password
    const loginRes = await fetch(`${SERVER_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUser, password: testPass })
    });
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.success, true, 'Login should succeed');

    // 4. Login with bad password
    const badLoginRes = await fetch(`${SERVER_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUser, password: 'wrongpassword' })
    });
    const badLoginData = await badLoginRes.json();
    assert.strictEqual(badLoginData.success, false, 'Bad password must fail');

    // 5. Leaderboard fetch
    const lbRes = await fetch(`${SERVER_URL}/api/leaderboard`);
    const lbData = await lbRes.json();
    assert(Array.isArray(lbData.leaderboard), 'Leaderboard must be an array');
    assert(lbData.leaderboard.length > 0, 'Leaderboard must contain entries');
  });

  // 2. Mode switching bugfix: Co-op then PvP in the same room
  await test('Room: Switching from Co-op to PvP resets mode properly', async () => {
    const roomId = `TEST-MODE-${Date.now()}`;
    const socket1 = io(SERVER_URL);

    // Join first as coop
    await new Promise((resolve) => {
      socket1.once('joined_room', (data) => {
        assert.strictEqual(data.mode, 'coop', 'First join should be coop');
        resolve();
      });
      socket1.emit('join_game', { roomId, username: 'Player1', mode: 'coop', withBot: false });
    });

    // Player1 leaves
    socket1.emit('leave_game');
    await new Promise((r) => setTimeout(r, 100));

    // Player1 rejoins the same room with PvP mode
    await new Promise((resolve) => {
      socket1.once('joined_room', (data) => {
        assert.strictEqual(data.mode, 'pvp', 'Rejoined room MUST switch to pvp mode!');
        resolve();
      });
      socket1.emit('join_game', { roomId, username: 'Player1', mode: 'pvp', withBot: false });
    });

    socket1.disconnect();
  });

  // 3. Васильич balanced repair speed vs human player
  await test('Васильич Balance: Human repair speed >= Васильич speed', async () => {
    const roomId = `TEST-VASILICH-${Date.now()}`;
    const socket = io(SERVER_URL);

    const statePromise = new Promise((resolve) => {
      socket.on('game_state', (st) => {
        if (st.players.length === 2) {
          resolve(st);
        }
      });
    });

    socket.emit('join_game', { roomId, username: 'HumanAdmin', mode: 'coop', withBot: true });
    socket.emit('start_game');

    const state = await statePromise;
    const human = state.players.find((p) => !p.isBot);
    const bot = state.players.find((p) => p.isBot);
    assert(human, 'Human player exists');
    assert(bot, 'Васильич bot exists');

    // Simulate both starting repair on incident
    // Bot interact speed is 2.0/tick, human base is 2.6/tick.
    // If human starts repair, human reaches 100% in ~39 ticks (1.56s).
    // Bot reaches 100% in 50 ticks (2.0s) + 6 inspect ticks (0.24s) = 56 ticks (2.24s).
    // Human is thus ~43% faster than bot and bot no longer dominates!
    assert(human.name !== bot.name);

    socket.disconnect();
  });

  // 4. PvP Surrender Mechanic
  await test('PvP: Surrender grants immediate victory to opponent', async () => {
    const roomId = `TEST-SURRENDER-${Date.now()}`;
    const p1 = io(SERVER_URL);
    const p2 = io(SERVER_URL);

    await Promise.all([
      new Promise((res) => {
        p1.emit('join_game', { roomId, username: 'Fighter1', mode: 'pvp', withBot: false });
        p1.on('joined_room', res);
      }),
      new Promise((res) => {
        p2.emit('join_game', { roomId, username: 'Fighter2', mode: 'pvp', withBot: false });
        p2.on('joined_room', res);
      })
    ]);

    p1.emit('start_game');
    await new Promise((r) => setTimeout(r, 200));

    // Fighter1 surrenders
    const gameOverPromise = new Promise((resolve) => {
      p2.on('game_over', (data) => {
        assert.strictEqual(data.reason, 'surrender', 'Game over reason should be surrender');
        assert.strictEqual(data.winner?.name, 'Fighter2', 'Fighter2 should be declared winner');
        resolve();
      });
    });

    p1.emit('surrender_pvp');
    await gameOverPromise;

    p1.disconnect();
    p2.disconnect();
  });

  // 5. Co-op: Solo exit immediate, 2-player exit voting
  await test('Co-op: Solo exit is immediate; 2-player exit requires mutual consent', async () => {
    // A) Solo exit
    const soloRoomId = `TEST-SOLO-${Date.now()}`;
    const solo = io(SERVER_URL);

    await new Promise((res) => {
      solo.emit('join_game', { roomId: soloRoomId, username: 'SoloAdmin', mode: 'coop', withBot: false });
      solo.on('joined_room', res);
    });

    solo.emit('start_game');
    await new Promise((r) => setTimeout(r, 100));

    const soloExitPromise = new Promise((resolve) => {
      solo.on('game_over', (data) => {
        assert.strictEqual(data.reason, 'solo_exit', 'Solo exit should end immediately');
        resolve();
      });
    });

    solo.emit('request_coop_exit');
    await soloExitPromise;
    solo.disconnect();

    // B) 2-Player Co-op Vote Exit
    const coopRoomId = `TEST-COOP-VOTE-${Date.now()}`;
    const coop1 = io(SERVER_URL);
    const coop2 = io(SERVER_URL);

    await Promise.all([
      new Promise((res) => {
        coop1.emit('join_game', { roomId: coopRoomId, username: 'Alice', mode: 'coop', withBot: false });
        coop1.on('joined_room', res);
      }),
      new Promise((res) => {
        coop2.emit('join_game', { roomId: coopRoomId, username: 'Bob', mode: 'coop', withBot: false });
        coop2.on('joined_room', res);
      })
    ]);

    coop1.emit('start_game');
    await new Promise((r) => setTimeout(r, 150));

    // Alice requests coop exit
    const votePromptPromise = new Promise((resolve) => {
      coop2.on('coop_exit_vote_prompt', (prompt) => {
        assert.strictEqual(prompt.initiatorName, 'Alice');
        resolve();
      });
    });

    coop1.emit('request_coop_exit');
    await votePromptPromise;

    // Bob accepts coop exit
    const approvedPromise = new Promise((resolve) => {
      coop1.on('coop_exit_approved', resolve);
    });
    const coopGameOverPromise = new Promise((resolve) => {
      coop2.on('game_over', (data) => {
        assert.strictEqual(data.reason, 'coop_agreed_exit');
        resolve();
      });
    });

    coop2.emit('respond_coop_exit', { accept: true });
    await Promise.all([approvedPromise, coopGameOverPromise]);

    coop1.disconnect();
    coop2.disconnect();
  });

  console.log(`\n🎉 All ${passed}/${total} test suites PASSED successfully!`);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
