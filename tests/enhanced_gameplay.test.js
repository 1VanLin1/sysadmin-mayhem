import { io } from 'socket.io-client';

async function runEnhancedTests() {
  console.log('🧪 Запуск расширенного тестирования SysAdmin Mayhem (Васильич 2.0, Инвентарь, Уровни, Скорость)...\n');

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

  // 1. Connect Client with Vasilich Bot
  const socket = io(URL, { forceNew: true });
  await new Promise((resolve) => socket.on('connect', resolve));
  assert(socket.connected, 'Клиент подключился к сокет-серверу');

  const ROOM = 'TEST_VASILICH_' + Date.now();
  socket.emit('join_game', {
    roomId: ROOM,
    username: 'Главный Админ',
    color: '#6366f1',
    mode: 'coop',
    withBot: true
  });

  const pData = await new Promise((resolve) => socket.on('joined_room', resolve));
  assert(pData.roomId === ROOM, `Успешно создана комната ${ROOM}`);

  // 2. Start Game
  socket.emit('start_game');

  // 3. Verify Both Player and Smart Vasilich are present
  const state = await new Promise((resolve) => {
    const onState = (s) => {
      if (s.players && s.players.length === 2 && s.status === 'playing') {
        socket.off('game_state', onState);
        resolve(s);
      }
    };
    socket.on('game_state', onState);
  });

  const bot = state.players.find((p) => p.isBot);
  assert(bot !== undefined, 'Умный AI-сисадмин Васильич успешно заспавнился в комнате');
  assert(state.currentLevel === 1, 'Стартовый уровень смены: Уровень 1 (Стажировка)');

  // 4. Test Toolbelt Selection
  socket.emit('select_tool', { tool: 'extinguisher' });
  const stateTool = await new Promise((resolve) => {
    const onState = (s) => {
      const me = s.players.find((p) => p.id === pData.playerId);
      if (me.activeTool === 'extinguisher') {
        socket.off('game_state', onState);
        resolve(me);
      }
    };
    socket.on('game_state', onState);
  });
  assert(stateTool.activeTool === 'extinguisher', 'Инвентарь: быстрое переключение на огнетушитель [2] работает мгновенно');

  // 5. Test Faster Movement Speed
  const startX = stateTool.x;
  socket.emit('player_input', { right: true, left: false, up: false, down: false });
  await new Promise((r) => setTimeout(r, 300));
  socket.emit('player_input', { right: false, left: false, up: false, down: false });

  const stateMoved = await new Promise((resolve) => {
    const onState = (s) => {
      const me = s.players.find((p) => p.id === pData.playerId);
      if (me.x > startX + 15) {
        socket.off('game_state', onState);
        resolve(me);
      }
    };
    socket.on('game_state', onState);
  });
  const distTravelled = stateMoved.x - startX;
  assert(distTravelled >= 25, `Увеличенная скорость бега подтверждена (преодолено ${distTravelled}px за 300мс)`);

  // 6. Test Smart Vasilich Activity:
  // Wait a few seconds and verify Vasilich actively picks up tasks and moves/repairs
  console.log('   -> Наблюдаем за работой Васильича в дата-центре...');
  let vasilichDidWork = false;
  let initialIncidentsCount = state.activeIncidents.length;

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const curState = await new Promise((res) => socket.once('game_state', res));
    const curBot = curState.players.find((p) => p.isBot);

    if (curBot && curBot.botState && curBot.botState.length > 0) {
      vasilichDidWork = true;
    }
    if (curBot && (curBot.score > 0 || curBot.isInteracting)) {
      vasilichDidWork = true;
      break;
    }
  }
  assert(vasilichDidWork, 'Васильич успешно анализирует аварии, бежит к целям и выполняет ремонт');

  // 7. Test SLA stability
  const finalState = await new Promise((res) => socket.once('game_state', res));
  assert(finalState.sla > 85, `SLA находится в здоровом диапазоне (SLA: ${finalState.sla}%)`);

  // 8. Clean up
  socket.emit('leave_game');
  await new Promise((r) => setTimeout(r, 100));
  socket.disconnect();

  console.log(`\nИтоги тестов: ${passed} пройдено, ${failed} провалено.`);
  if (failed === 0) {
    console.log('🎉 ВСЕ РАСШИРЕННЫЕ ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runEnhancedTests().catch((err) => {
  console.error('Ошибка в тестах:', err);
  process.exit(1);
});
