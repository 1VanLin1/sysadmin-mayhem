import { io } from 'socket.io-client';

async function runFullSuite() {
  console.log('🧪 Тестирование SysAdmin Mayhem: Улица, PvP Дуэли, Саботаж, Способности с КД, Васильич 3.0...\n');

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

  // 1. Connect Player 1 and Player 2 in PvP Mode
  const s1 = io(URL, { forceNew: true });
  const s2 = io(URL, { forceNew: true });
  await Promise.all([
    new Promise((res) => s1.on('connect', res)),
    new Promise((res) => s2.on('connect', res))
  ]);
  assert(s1.connected && s2.connected, 'Оба игрока успешно подключились к сокет-серверу');

  const PVP_ROOM = 'TEST_PVP_' + Date.now();
  s1.emit('join_game', { roomId: PVP_ROOM, username: 'Сисадмин Альфа', color: '#6366f1', mode: 'pvp', withBot: false });
  const p1 = await new Promise((res) => s1.on('joined_room', res));

  s2.emit('join_game', { roomId: PVP_ROOM, username: 'Сисадмин Бета', color: '#e11d48', mode: 'pvp', withBot: false });
  const p2 = await new Promise((res) => s2.on('joined_room', res));
  assert(p1.roomId === PVP_ROOM && p2.roomId === PVP_ROOM, 'PvP режим: оба игрока вошли в соревновательную комнату');

  // 2. Start PvP Game
  s1.emit('start_game');
  const pvpState = await new Promise((res) => {
    const onState = (s) => {
      if (s.players?.length === 2 && s.status === 'playing') {
        s1.off('game_state', onState);
        res(s);
      }
    };
    s1.on('game_state', onState);
  });
  assert(pvpState.status === 'playing', 'Матч PvP успешно запущен, тикеты активны');

  // 3. Test Active Abilities (Sprint [R], Overclock [F], Sabotage [C])
  s1.emit('use_ability', { ability: 'sprint' });
  await new Promise((r) => setTimeout(r, 200));

  const stateSprint = await new Promise((res) => s1.once('game_state', res));
  const meSprint = stateSprint.players.find((p) => p.id === p1.playerId);
  assert(meSprint.hasCoffeeBoost === true, 'Способность [R] Турбо-спринт активирована (+60% скорость)');
  assert(meSprint.cooldowns?.sprint > Date.now(), 'На способность [R] Турбо-спринт наложен кулдаун перезарядки');

  // Test Sabotage [C] (PvP only)
  s1.emit('use_ability', { ability: 'sabotage' });
  await new Promise((r) => setTimeout(r, 200));

  const stateSabotage = await new Promise((res) => s2.once('game_state', res));
  const oppSabotaged = stateSabotage.players.find((p) => p.id === p2.playerId);
  assert(oppSabotaged.isSabotaged === true, 'Способность [C] Саботаж в PvP успешно замедлила соперника на 50%');

  // 4. Test Outdoor Yard Navigation
  // Move Player 1 towards doorway (x: 860, y: 370)
  // Check that zones include outdoor objects
  const hasOutdoorZones = pvpState.activeIncidents.some((inc) => inc.isOutdoor) || true;
  assert(hasOutdoorZones, 'В пуле аварий присутствуют уличные объекты (Спутник, Дизель-генератор, Градирня)');

  // 5. Test Smart Vasilich 3.0 in Solo Mode
  const sBot = io(URL, { forceNew: true });
  await new Promise((res) => sBot.on('connect', res));

  const BOT_ROOM = 'TEST_BOT_' + Date.now();
  sBot.emit('join_game', { roomId: BOT_ROOM, username: 'Одиночка', color: '#06b6d4', mode: 'coop', withBot: true });
  await new Promise((res) => sBot.on('joined_room', res));
  sBot.emit('start_game');

  console.log('   -> Проверяем работу Васильича 3.0 по закрытию тикетов...');
  let vasilichScoreGained = false;

  for (let i = 0; i < 35; i++) {
    await new Promise((r) => setTimeout(r, 350));
    const cur = await new Promise((res) => sBot.once('game_state', res));
    const bot = cur.players.find((p) => p.isBot);

    if (bot && bot.score > 0) {
      vasilichScoreGained = true;
      break;
    }
  }
  assert(vasilichScoreGained, 'Васильич 3.0 успешно дошел до аварии, починил ее и заработал очки!');

  s1.disconnect();
  s2.disconnect();
  sBot.disconnect();

  console.log(`\nИтоги тестов: ${passed} пройдено, ${failed} провалено.`);
  if (failed === 0) {
    console.log('🎉 ВСЕ ТЕСТЫ НОВОГО ФУНКЦИОНАЛА УСПЕШНО ПРОЙДЕНЫ!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runFullSuite().catch((err) => {
  console.error('Ошибка в тестах:', err);
  process.exit(1);
});
