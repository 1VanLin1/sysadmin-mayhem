export const MAP_CONFIG = {
  width: 1200,
  height: 720,
  wallThickness: 20,
  playerRadius: 18,
  baseSpeed: 5.6,
  coffeeSpeedBuff: 8.0,
  outdoorStartX: 860 // Boundary between indoor server room and outdoor yard
};

export const ABILITIES = [
  {
    id: 'sprint',
    key: 'R',
    name: 'Турбо-спринт',
    icon: '⚡',
    cooldown: 18, // seconds
    duration: 6,
    desc: '+60% к скорости бега на 6 сек.'
  },
  {
    id: 'overclock',
    key: 'F',
    name: 'Оверклок',
    icon: '🔋',
    cooldown: 25, // seconds
    duration: 6,
    desc: '2.5x скорость любого ремонта на 6 сек.'
  },
  {
    id: 'sabotage',
    key: 'C',
    name: 'Саботаж (PvP)',
    icon: '💣',
    cooldown: 35, // seconds
    duration: 4,
    desc: 'Замедлить оппонента на 50% и устроить помехи на 4 сек.'
  }
];

export const ZONES = [
  // --- ИНТЕРЬЕР: СЕРВЕРНАЯ КОМНАТА (x: 0 .. 860) ---
  // Server Racks Group A (Web / App)
  {
    id: 'rack_A1',
    type: 'rack',
    isOutdoor: false,
    x: 160,
    y: 110,
    w: 90,
    h: 150,
    label: 'Стойка A1 (Web)',
    color: '#3b82f6',
    interactive: true
  },
  {
    id: 'rack_A2',
    type: 'rack',
    isOutdoor: false,
    x: 320,
    y: 110,
    w: 90,
    h: 150,
    label: 'Стойка A2 (App)',
    color: '#3b82f6',
    interactive: true
  },

  // Server Racks Group B (Databases)
  {
    id: 'rack_B1',
    type: 'rack',
    isOutdoor: false,
    x: 160,
    y: 340,
    w: 90,
    h: 150,
    label: 'Стойка B1 (DB Master)',
    color: '#8b5cf6',
    interactive: true
  },
  {
    id: 'rack_B2',
    type: 'rack',
    isOutdoor: false,
    x: 320,
    y: 340,
    w: 90,
    h: 150,
    label: 'Стойка B2 (DB Replica)',
    color: '#8b5cf6',
    interactive: true
  },

  // Server Racks Group C (Storage / Cache)
  {
    id: 'rack_C1',
    type: 'rack',
    isOutdoor: false,
    x: 500,
    y: 110,
    w: 90,
    h: 150,
    label: 'Стойка C1 (Storage)',
    color: '#06b6d4',
    interactive: true
  },
  {
    id: 'rack_C2',
    type: 'rack',
    isOutdoor: false,
    x: 650,
    y: 110,
    w: 90,
    h: 150,
    label: 'Стойка C2 (K8s Node)',
    color: '#06b6d4',
    interactive: true
  },

  // Empty Slot for New Server
  {
    id: 'rack_D1',
    type: 'empty_rack',
    isOutdoor: false,
    x: 500,
    y: 340,
    w: 90,
    h: 150,
    label: 'Стойка D1 (Слот для сервера)',
    color: '#475569',
    interactive: true
  },

  // Assembly Workbench
  {
    id: 'workbench',
    type: 'workbench',
    isOutdoor: false,
    x: 650,
    y: 340,
    w: 100,
    h: 150,
    label: 'Верстак сборки',
    color: '#eab308',
    interactive: true
  },

  // NOC Admin Terminal
  {
    id: 'terminal_noc',
    type: 'terminal',
    isOutdoor: false,
    x: 650,
    y: 550,
    w: 150,
    h: 90,
    label: 'NOC Консоль сисадмина',
    color: '#10b981',
    interactive: true
  },

  // Power Unit (PDU)
  {
    id: 'pdu_unit',
    type: 'pdu',
    isOutdoor: false,
    x: 320,
    y: 550,
    w: 150,
    h: 90,
    label: 'Щит питания PDU',
    color: '#f97316',
    interactive: true
  },

  // --- УЛИЦА: ВНУТРЕННИЙ ДВОР ДАТА-ЦЕНТРА (x: 880 .. 1200) ---
  // 1. Satellite Dish & Fiber Optics Tower
  {
    id: 'outdoor_satellite',
    type: 'satellite',
    isOutdoor: true,
    x: 930,
    y: 100,
    w: 180,
    h: 140,
    label: 'Спутниковая антенна связи',
    color: '#38bdf8',
    interactive: true
  },

  // 2. Emergency Backup Diesel Generator
  {
    id: 'outdoor_generator',
    type: 'generator',
    isOutdoor: true,
    x: 930,
    y: 300,
    w: 180,
    h: 140,
    label: 'Дизель-генератор (ДГУ)',
    color: '#f59e0b',
    interactive: true
  },

  // 3. Outdoor Cooling Towers / Radiators
  {
    id: 'outdoor_chiller',
    type: 'chiller',
    isOutdoor: true,
    x: 930,
    y: 500,
    w: 180,
    h: 140,
    label: 'Уличная градирня чиллера',
    color: '#06b6d4',
    interactive: true
  }
];

export const INCIDENT_TEMPLATES = [
  // Внутренние аварии (Серверная)
  {
    type: 'hdd_failure',
    title: 'Сбой диска в RAID-массиве',
    desc: 'В стойке {target} сдох NVMe SSD! Используйте [1] Диск из инвентаря.',
    targetType: 'rack',
    requiredItem: 'hdd',
    actionTime: 2.0,
    points: 150,
    icon: '💾',
    isOutdoor: false
  },
  {
    type: 'fire',
    title: 'Пожар и перегрев стойки',
    desc: 'Стойка {target} полыхает огнем! Используйте [2] Огнетушитель.',
    targetType: 'rack',
    requiredItem: 'extinguisher',
    actionTime: 2.2,
    points: 200,
    icon: '🔥',
    isOutdoor: false
  },
  {
    type: 'cable_disconnect',
    title: 'Обрыв сетевого линка',
    desc: 'Потерян линк в {target}! Используйте [3] Патч-корд.',
    targetType: 'rack',
    requiredItem: 'cable',
    actionTime: 1.8,
    points: 120,
    icon: '🔌',
    isOutdoor: false
  },
  {
    type: 'power_trip',
    title: 'Сработал автомат PDU',
    desc: 'Напряжение упало! Доберитесь до щитка PDU и поднимите рубильник.',
    targetType: 'pdu',
    targetId: 'pdu_unit',
    requiredItem: null,
    actionTime: 1.5,
    points: 180,
    icon: '⚡',
    isOutdoor: false
  },
  {
    type: 'ddos_attack',
    title: 'DDoS атака на шлюз',
    desc: 'Бегите к терминалу NOC и введите kill -9 для блокировки бота!',
    targetType: 'terminal',
    targetId: 'terminal_noc',
    requiredItem: null,
    actionTime: 0,
    needsTerminal: true,
    points: 250,
    icon: '💀',
    isOutdoor: false
  },
  {
    type: 'deploy_server',
    title: 'Монтаж нового сервера',
    desc: 'Соберите шасси на верстаке и смонтируйте готовый сервер в стойку D1.',
    targetType: 'empty_rack',
    targetId: 'rack_D1',
    requiredItem: 'server',
    actionTime: 2.5,
    points: 300,
    icon: '🚀',
    isOutdoor: false
  },

  // УЛИЧНЫЕ АВАРИИ (Outdoor Incidents)
  {
    type: 'satellite_align',
    title: 'Сбой магистральной спутниковой тарелки',
    desc: '🛰️ Выйдите во двор дата-центра! Откалибруйте угол спутниковой антенны связи.',
    targetType: 'satellite',
    targetId: 'outdoor_satellite',
    requiredItem: null,
    actionTime: 2.5,
    points: 280,
    icon: '📡',
    isOutdoor: true
  },
  {
    type: 'generator_start',
    title: 'Запуск аварийного дизель-генератора (ДГУ)',
    desc: '🚜 Выйдите на улицу к дизель-генератору и дерните ручной стартер питания!',
    targetType: 'generator',
    targetId: 'outdoor_generator',
    requiredItem: null,
    actionTime: 2.3,
    points: 260,
    icon: '🚜',
    isOutdoor: true
  },
  {
    type: 'radiator_jam',
    title: 'Забились вентиляторы уличной градирни',
    desc: '❄️ Выйдите на улицу и прочистите решетку уличного чиллера охлаждения.',
    targetType: 'chiller',
    targetId: 'outdoor_chiller',
    requiredItem: null,
    actionTime: 2.2,
    points: 240,
    icon: '❄️',
    isOutdoor: true
  },
  {
    type: 'coolant_leak',
    title: 'Протечка фреона в контуре чиллера',
    desc: '💧 Срочно во двор к градирне! Перекройте аварийный дренажный кран охлаждения.',
    targetType: 'chiller',
    targetId: 'outdoor_chiller',
    requiredItem: null,
    actionTime: 2.4,
    points: 270,
    icon: '💧',
    isOutdoor: true
  },
  {
    type: 'ransomware_attack',
    title: 'Атака вируса-шифровальщика',
    desc: '💀 Срочно к терминалу NOC! Введите restore-backup или decrypt для восстановления.',
    targetType: 'terminal',
    targetId: 'terminal_noc',
    requiredItem: null,
    actionTime: 0,
    needsTerminal: true,
    points: 290,
    icon: '☣️',
    isOutdoor: false
  }
];

export const CAREER_TITLES = [
  { minScore: 0, title: 'Стажер-эникейщик', icon: '🐣', color: '#94a3b8' },
  { minScore: 400, title: 'Младший Helpdesk', icon: '🔧', color: '#38bdf8' },
  { minScore: 900, title: 'Системный администратор', icon: '💻', color: '#818cf8' },
  { minScore: 1600, title: 'DevOps Инженер', icon: '🚀', color: '#10b981' },
  { minScore: 2500, title: 'Principal Cloud Architect', icon: '🧙‍♂️', color: '#f59e0b' }
];

export function getCareerTitle(score = 0) {
  let rank = CAREER_TITLES[0];
  for (const r of CAREER_TITLES) {
    if (score >= r.minScore) rank = r;
  }
  return rank;
}

export const QUICK_PINGS = [
  { id: 'need_extinguisher', label: 'Нужен огнетушитель!', icon: '🧯', color: '#ef4444' },
  { id: 'going_outdoor', label: 'Бегу на улицу!', icon: '🌲', color: '#10b981' },
  { id: 'need_server', label: 'Соберите сервер!', icon: '🚀', color: '#8b5cf6' },
  { id: 'fixing_power', label: 'Чиню рубильник!', icon: '⚡', color: '#f59e0b' },
  { id: 'need_help', label: 'Срочно помоги здесь!', icon: '🆘', color: '#f43f5e' },
  { id: 'good_job', label: 'Красава! Так держать!', icon: '👍', color: '#38bdf8' }
];

export const ADMIN_CLASSES = [
  {
    id: 'netops',
    name: 'Сетевик (NetOps)',
    icon: '🌐',
    color: '#38bdf8',
    desc: '+15% скорость бега, кабели и спутник чинятся на 80% быстрее',
    speedMultiplier: 1.15,
    boostTypes: ['cable_disconnect', 'satellite_align', 'ddos_attack']
  },
  {
    id: 'hardware',
    name: 'Железячник (Hardware)',
    icon: '🔧',
    color: '#f59e0b',
    desc: 'Монтаж серверов и RAID NVMe диски чинятся в 2 раза быстрее',
    speedMultiplier: 1.0,
    boostTypes: ['hdd_failure', 'deploy_server']
  },
  {
    id: 'facility',
    name: 'Инженер ИЦХ (Facility)',
    icon: '🧯',
    color: '#ef4444',
    desc: 'Тушит пожары, чинит чиллеры и ДГУ на 100% быстрее',
    speedMultiplier: 1.0,
    boostTypes: ['fire', 'radiator_jam', 'coolant_leak', 'generator_start', 'power_trip']
  }
];

export function getAdminClass(classId) {
  return ADMIN_CLASSES.find((c) => c.id === classId) || ADMIN_CLASSES[0];
}

export const COOLANT_PUDDLES = [
  { id: 'puddle_indoor', x: 420, y: 460, radius: 75 },
  { id: 'puddle_outdoor', x: 930, y: 530, radius: 95 }
];

export const SHIFT_LEVELS = [
  {
    level: 1,
    name: 'Стажировка (Junior Shift)',
    targetRepairs: 5,
    desc: 'Освойтесь в серверной и во дворе. Закройте 5 тикетов!',
    badge: '🟢 Уровень 1'
  },
  {
    level: 2,
    name: 'Ночное дежурство (Middle Shift)',
    targetRepairs: 10,
    desc: 'Уличные генераторы и спутниковая связь требуют внимания.',
    badge: '🟡 Уровень 2'
  },
  {
    level: 3,
    name: 'Черная Пятница (Senior Architect)',
    targetRepairs: 15,
    desc: 'Максимальный накал! Шторм на улице и пожары в серверной.',
    badge: '🔴 Уровень 3 (Хардкор)'
  }
];
