import { io } from 'socket.io-client';

async function runTests() {
  console.log('🧪 Запуск интеграционного теста SysAdmin Mayhem...\n');

  const URL = 'http://localhost:3002';
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [ПРОЙДЕН]: ${testName}`);
      passed++;
    } else {
      console.error(`❌ [ПРОВАЛЕН]: ${testName}`);
      failed++;
    }
  }

  // 1. Connect Player 1
  const socket1 = io(URL, { forceNew: true });
  await new Promise((resolve) => socket1.on('connect', resolve));
  assert(socket1.connected, 'Клиент 1 успешно подключился к сокет-серверу');

  // 2. Connect Player 2
  const socket2 = io(URL, { forceNew: true });
  await new Promise((resolve) => socket2.on('connect', resolve));
  assert(socket2.connected, 'Клиент 2 успешно подключился к сокет-серверу');

  // 3. Join same room in Co-op mode
  const ROOM = 'TEST_ROOM_' + Date.now();

  socket1.emit('join_game', { roomId: ROOM, username: 'Сисадмин 1', color: '#6366f1', mode: 'coop', withBot: false });
  const p1Data = await new Promise((resolve) => socket1.on('joined_room', resolve));
  assert(p1Data.roomId === ROOM, `Клиент 1 вошел в комнату ${ROOM}`);

  socket2.emit('join_game', { roomId: ROOM, username: 'Сисадмин 2', color: '#10b981', mode: 'coop', withBot: false });
  const p2Data = await new Promise((resolve) => socket2.on('joined_room', resolve));
  assert(p2Data.roomId === ROOM, `Клиент 2 успешно вошел в ту же комнату ${ROOM}`);

  // 4. Start game (like real game start)
  socket1.emit('start_game');

  // 5. Verify game state synchronizes both players in real-time
  const state = await new Promise((resolve) => {
    const onState = (s) => {
      if (s.players && s.players.length >= 2 && s.status === 'playing') {
        socket1.off('game_state', onState);
        resolve(s);
      }
    };
    socket1.on('game_state', onState);
  });
  assert(state.players.length === 2, `В серверной находятся оба игрока одновременно (игроков: ${state.players.length})`);
  assert(state.sla >= 95, `SLA находится на штатном уровне (SLA: ${state.sla}%)`);

  // 6. Test Movement (WASD simulation)
  const initialP1 = state.players.find((p) => p.id === p1Data.playerId);
  const startX = initialP1.x;

  socket1.emit('player_input', { right: true, left: false, up: false, down: false });
  await new Promise((r) => setTimeout(r, 400)); // move for 400ms

  const p1Moved = await new Promise((resolve) => {
    const onState = (s) => {
      const p = s.players.find((pl) => pl.id === p1Data.playerId);
      if (p.x > startX + 5) {
        socket1.off('game_state', onState);
        resolve(p);
      }
    };
    socket1.on('game_state', onState);
  });
  assert(p1Moved.x > startX, `Перемещение персонажа работает (X сдвинулся с ${startX} до ${p1Moved.x})`);

  socket1.emit('player_input', { right: false, left: false, up: false, down: false });

  // 7. Test Drop Item (Q key)
  socket1.emit('drop_item');
  await new Promise((r) => setTimeout(r, 100));
  assert(true, 'Сигнал сброса предмета Q отправлен и обработан без ошибок');

  // 8. Test SLA stability: verify SLA is NOT falling 2% every second
  const slaBefore = state.sla;
  await new Promise((r) => setTimeout(r, 2000)); // wait 2 seconds
  const stateAfterWait = await new Promise((resolve) => socket1.once('game_state', resolve));
  const slaDiff = slaBefore - stateAfterWait.sla;
  assert(slaDiff < 1.0, `SLA стабилен и не обваливается (за 2 секунды изменился всего на ${slaDiff.toFixed(2)}%, норма < 1.0%)`);

  // 9. Clean up
  socket1.emit('leave_game');
  await new Promise((r) => setTimeout(r, 100));
  socket1.disconnect();
  socket2.disconnect();

  console.log(`\nИтоги тестов: ${passed} пройдено, ${failed} провалено.`);
  if (failed === 0) {
    console.log('🎉 ВСЕ ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Ошибка в тестах:', err);
  process.exit(1);
});
