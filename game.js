const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = {
  hud: document.getElementById("hud"),
  startScreen: document.getElementById("startScreen"),
  upgradeScreen: document.getElementById("upgradeScreen"),
  resultScreen: document.getElementById("resultScreen"),
  classList: document.getElementById("classList"),
  shopList: document.getElementById("shopList"),
  upgradeChoices: document.getElementById("upgradeChoices"),
  startButton: document.getElementById("startButton"),
  resetButton: document.getElementById("resetButton"),
  nextDayButton: document.getElementById("nextDayButton"),
  bankText: document.getElementById("bankText"),
  dayLabel: document.getElementById("dayLabel"),
  timeText: document.getElementById("timeText"),
  phaseText: document.getElementById("phaseText"),
  salaryText: document.getElementById("salaryText"),
  energyText: document.getElementById("energyText"),
  focusText: document.getElementById("focusText"),
  prodText: document.getElementById("prodText"),
  happyText: document.getElementById("happyText"),
  energyBar: document.getElementById("energyBar"),
  focusBar: document.getElementById("focusBar"),
  prodBar: document.getElementById("prodBar"),
  happyBar: document.getElementById("happyBar"),
  toast: document.getElementById("toast"),
  resultKicker: document.getElementById("resultKicker"),
  resultTitle: document.getElementById("resultTitle"),
  resultSummary: document.getElementById("resultSummary"),
  achievementList: document.getElementById("achievementList")
};

const DAY_LENGTH = 720;
const WORLD = { width: 2600, height: 1800 };
const SAVE_KEY = "office-survivor-save-v1";

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const OFFICE_DESKS = [
  [320, 260], [620, 260], [920, 260], [1220, 260], [1520, 260], [1820, 260],
  [420, 650], [720, 650], [1020, 650], [1320, 650], [1620, 650], [1920, 650],
  [300, 1050], [600, 1050], [900, 1050], [1200, 1050], [1500, 1050], [1800, 1050],
  [520, 1450], [820, 1450], [1120, 1450], [1420, 1450], [1720, 1450], [2020, 1450]
];

const OFFICE_FIXTURES = [
  [180, 410, "plant"], [2130, 390, "plant"], [2350, 1160, "printer"], [190, 1320, "printer"],
  [2380, 760, "table"], [2250, 1550, "plant"]
];

const OFFICE_OBSTACLES = [
  ...OFFICE_DESKS.map(([x, y]) => ({ kind: "desk", x: x - 76, y: y - 36, width: 152, height: 88 })),
  ...OFFICE_FIXTURES.map(([x, y, type]) => {
    if (type === "table") return { kind: "table", x: x - 122, y: y - 42, width: 244, height: 92 };
    if (type === "printer") return { kind: "printer", x: x - 48, y: y - 18, width: 96, height: 58 };
    return { kind: "plant", x: x - 22, y: y - 4, width: 44, height: 42 };
  })
];

const classes = [
  {
    id: "junior",
    name: "Junior Developer",
    copy: "Learns fast, panics politely, starts with a company laptop held together by stickers.",
    tags: ["+20% XP", "Laptop"],
    stats: { productivity: 9, maxEnergy: 105, focus: 100, happiness: 105, xpRate: 1.2, meetingResist: 1 }
  },
  {
    id: "senior",
    name: "Senior Developer",
    copy: "Ships quickly, sighs deeply, and pays a hidden tax called expectations.",
    tags: ["+35% Productivity", "-10% Joy"],
    stats: { productivity: 14, maxEnergy: 100, focus: 100, happiness: 90, xpRate: 1, meetingResist: 1.08 }
  },
  {
    id: "qa",
    name: "QA Engineer",
    copy: "Finds the bug behind the bug, then bills the bug for emotional damages.",
    tags: ["Bug Rewards", "Crit Checks"],
    stats: { productivity: 10, maxEnergy: 110, focus: 105, happiness: 100, xpRate: 1.05, bugBonus: 1.35, crit: 0.18 }
  },
  {
    id: "devops",
    name: "DevOps",
    copy: "Reduces outages, speaks fluent dashboard, survives on incident snacks.",
    tags: ["Less Downtime", "+Energy"],
    stats: { productivity: 11, maxEnergy: 120, focus: 100, happiness: 98, xpRate: 1, outageResist: 0.45 }
  }
];

const shopItems = [
  { id: "laptop", name: "Better Laptop", base: 80, max: 5, copy: "More productivity before the fans start screaming.", apply: s => (s.productivity += 1.5) },
  { id: "internet", name: "Faster Internet", base: 90, max: 5, copy: "Outages still happen, now with more dramatic loading bars.", apply: s => (s.outageResist += 0.08) },
  { id: "chair", name: "Office Chair", base: 70, max: 5, copy: "Adds energy by remembering your spine exists.", apply: s => (s.maxEnergy += 8) },
  { id: "coffee", name: "Coffee Machine", base: 100, max: 4, copy: "Coffee heals more and feels less like printer toner.", apply: s => (s.coffeeBoost += 0.12) },
  { id: "monitor", name: "Extra Monitor", base: 110, max: 4, copy: "Wider work range, wider collection of abandoned tabs.", apply: s => (s.range += 22) },
  { id: "assistant", name: "AI Assistant", base: 160, max: 3, copy: "Autocomplete for code, emails, and mild existential dread.", apply: s => (s.fireRate += 0.12) }
];

const upgradePool = [
  { name: "Mechanical Keyboard", copy: "Fast typing. Productivity +18%.", apply: g => (g.player.productivity *= 1.18) },
  { name: "AI Assistant", copy: "Auto-completes tiny tasks. Work speed +20%.", apply: g => (g.player.fireRate *= 1.2) },
  { name: "Dual Monitor", copy: "Wider work range. Range +24%.", apply: g => (g.player.range *= 1.24) },
  { name: "IDE Premium License", copy: "The progress bar believes in you. Projectile speed +30%.", apply: g => (g.player.projectileSpeed *= 1.3) },
  { name: "Coffee Machine", copy: "Coffee heals 35% more.", apply: g => (g.player.coffeeBoost += 0.35) },
  { name: "Noise Cancelling Headphones", copy: "Meetings deal 25% less damage.", apply: g => (g.player.meetingResist *= 1.25) },
  { name: "Standing Desk", copy: "Maximum energy +25.", apply: g => { g.player.maxEnergy += 25; g.player.energy += 25; } },
  { name: "Sticky Notes", copy: "Focus recovers faster while moving.", apply: g => (g.player.focusRecovery += 0.12) },
  { name: "Rubber Duck", copy: "Debugging bonus. Critical hits +15%.", apply: g => (g.player.crit += 0.15) },
  { name: "Dark Mode", copy: "Happiness +12. Eyes stop negotiating.", apply: g => (g.player.happiness = Math.min(160, g.player.happiness + 12)) },
  { name: "Office Plant", copy: "Passive energy recovery while focused.", apply: g => (g.player.regen += 0.09) },
  { name: "Extra RAM", copy: "Projectiles pierce one extra email.", apply: g => (g.player.pierce += 1) }
];

const enemyTypes = {
  email: {
    name: "Email Spam",
    color: "#79a8ff",
    hp: 15,
    speed: 62,
    radius: 16,
    damage: 4,
    focusDamage: 6,
    xp: 7,
    salary: 3,
    label: "MAIL"
  },
  bug: {
    name: "Urgent Bug",
    color: "#f36f6f",
    hp: 70,
    speed: 42,
    radius: 22,
    damage: 10,
    focusDamage: 3,
    xp: 34,
    salary: 12,
    label: "BUG"
  },
  manager: {
    name: "Manager",
    color: "#f1b84b",
    hp: 95,
    speed: 36,
    radius: 24,
    damage: 16,
    focusDamage: 10,
    xp: 42,
    salary: 15,
    label: "MGR",
    meeting: true
  },
  training: {
    name: "HR Training",
    color: "#b691ff",
    hp: 60,
    speed: 30,
    radius: 21,
    damage: 13,
    focusDamage: 8,
    xp: 30,
    salary: 10,
    label: "HR"
  },
  printer: {
    name: "Printer Jam",
    color: "#b8c0cc",
    hp: 100,
    speed: 18,
    radius: 25,
    damage: 11,
    focusDamage: 12,
    xp: 45,
    salary: 18,
    label: "JAM"
  },
  deadline: {
    name: "Release Deadline",
    color: "#ff7f50",
    hp: 760,
    speed: 28,
    radius: 42,
    damage: 24,
    focusDamage: 14,
    xp: 220,
    salary: 150,
    label: "SHIP",
    boss: true
  },
  standup: {
    name: "Daily Standup",
    color: "#31c5a9",
    hp: 280,
    speed: 24,
    radius: 34,
    damage: 18,
    focusDamage: 10,
    xp: 100,
    salary: 60,
    label: "SYNC",
    boss: true,
    meeting: true
  },
  department: {
    name: "Department Meeting",
    color: "#f1b84b",
    hp: 420,
    speed: 22,
    radius: 38,
    damage: 20,
    focusDamage: 13,
    xp: 140,
    salary: 80,
    label: "DEPT",
    boss: true,
    meeting: true
  },
  ceo: {
    name: "CEO Visit",
    color: "#ff6ea8",
    hp: 560,
    speed: 30,
    radius: 40,
    damage: 22,
    focusDamage: 16,
    xp: 180,
    salary: 110,
    label: "CEO",
    boss: true
  }
};

const keyState = new Set();
let selectedClass = "junior";
let save = loadSave();
let game = null;
let lastTime = performance.now();
let toastTimer = 0;

function defaultSave() {
  const upgrades = {};
  shopItems.forEach(item => (upgrades[item.id] = 0));
  return { bank: 0, day: 1, upgrades, achievements: {} };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    return { ...defaultSave(), ...JSON.parse(raw) };
  } catch {
    return defaultSave();
  }
}

function storeSave() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function norm(dx, dy) {
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function rectCircleOverlap(entity, radius, rect) {
  const closestX = clamp(entity.x, rect.x, rect.x + rect.width);
  const closestY = clamp(entity.y, rect.y, rect.y + rect.height);
  let dx = entity.x - closestX;
  let dy = entity.y - closestY;
  let distance = Math.hypot(dx, dy);

  if (distance === 0) {
    const left = Math.abs(entity.x - rect.x);
    const right = Math.abs(rect.x + rect.width - entity.x);
    const top = Math.abs(entity.y - rect.y);
    const bottom = Math.abs(rect.y + rect.height - entity.y);
    const smallest = Math.min(left, right, top, bottom);
    if (smallest === left) {
      dx = -1;
      dy = 0;
      distance = 1;
    } else if (smallest === right) {
      dx = 1;
      dy = 0;
      distance = 1;
    } else if (smallest === top) {
      dx = 0;
      dy = -1;
      distance = 1;
    } else {
      dx = 0;
      dy = 1;
      distance = 1;
    }
  }

  if (distance >= radius) return null;
  const push = radius - distance;
  return { x: dx / distance * push, y: dy / distance * push };
}

function resolveObstacleCollisions(entity, radius) {
  let collided = false;
  for (const obstacle of OFFICE_OBSTACLES) {
    const push = rectCircleOverlap(entity, radius, obstacle);
    if (!push) continue;
    entity.x += push.x;
    entity.y += push.y;
    collided = true;
  }
  entity.x = clamp(entity.x, radius, WORLD.width - radius);
  entity.y = clamp(entity.y, radius, WORLD.height - radius);
  return collided;
}

function moveWithOfficePhysics(entity, dx, dy, radius) {
  let collided = false;
  entity.x = clamp(entity.x + dx, radius, WORLD.width - radius);
  collided = resolveObstacleCollisions(entity, radius) || collided;
  entity.y = clamp(entity.y + dy, radius, WORLD.height - radius);
  collided = resolveObstacleCollisions(entity, radius) || collided;
  return collided;
}

function isCircleBlocked(x, y, radius) {
  const probe = { x, y };
  return OFFICE_OBSTACLES.some(obstacle => rectCircleOverlap(probe, radius, obstacle));
}

function freeOfficePoint(radius, fallbackX = WORLD.width / 2, fallbackY = WORLD.height / 2) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const x = rand(160, WORLD.width - 160);
    const y = rand(160, WORLD.height - 160);
    if (!isCircleBlocked(x, y, radius + 12)) return { x, y };
  }
  return { x: fallbackX, y: fallbackY };
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.floor(window.innerWidth * ratio);
  const height = Math.floor(window.innerHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove("is-visible"), 2800);
}

function openScreen(screen) {
  [ui.startScreen, ui.upgradeScreen, ui.resultScreen].forEach(element => {
    element.classList.toggle("is-open", element === screen);
  });
}

function renderClassList() {
  ui.classList.innerHTML = "";
  classes.forEach(employee => {
    const button = document.createElement("button");
    button.className = `class-card${employee.id === selectedClass ? " is-selected" : ""}`;
    button.innerHTML = `
      <h4>${employee.name}</h4>
      <p class="card-copy">${employee.copy}</p>
      <div class="tag-row">${employee.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}</div>
    `;
    button.addEventListener("click", () => {
      selectedClass = employee.id;
      renderClassList();
    });
    ui.classList.appendChild(button);
  });
}

function renderShop() {
  ui.bankText.textContent = `$${Math.floor(save.bank)}`;
  ui.shopList.innerHTML = "";
  shopItems.forEach(item => {
    const level = save.upgrades[item.id] || 0;
    const cost = Math.floor(item.base * Math.pow(1.72, level));
    const maxed = level >= item.max;
    const locked = save.bank < cost && !maxed;
    const button = document.createElement("button");
    button.className = `shop-card${maxed ? " is-maxed" : ""}${locked ? " is-locked" : ""}`;
    button.innerHTML = `
      <h4>${item.name}</h4>
      <p>${item.copy}</p>
      <div class="tag-row">
        <span class="tag">Level ${level}/${item.max}</span>
        <span class="tag">${maxed ? "Maxed" : `$${cost}`}</span>
      </div>
    `;
    button.addEventListener("click", () => {
      if (maxed) {
        showToast(`${item.name} is already maxed out.`);
        return;
      }
      if (save.bank < cost) {
        showToast("Payroll says no. Earn more salary first.");
        return;
      }
      save.bank -= cost;
      save.upgrades[item.id] = level + 1;
      storeSave();
      renderShop();
      showToast(`${item.name} upgraded.`);
    });
    ui.shopList.appendChild(button);
  });
}

function applyPermanentStats(stats) {
  stats.outageResist = stats.outageResist || 0;
  stats.coffeeBoost = stats.coffeeBoost || 0;
  stats.range = stats.range || 0;
  stats.fireRate = stats.fireRate || 0;
  shopItems.forEach(item => {
    const level = save.upgrades[item.id] || 0;
    for (let i = 0; i < level; i += 1) item.apply(stats);
  });
}

function employeeStats() {
  const employee = classes.find(item => item.id === selectedClass) || classes[0];
  const stats = {
    productivity: employee.stats.productivity,
    maxEnergy: employee.stats.maxEnergy,
    focus: employee.stats.focus,
    happiness: employee.stats.happiness,
    xpRate: employee.stats.xpRate || 1,
    meetingResist: employee.stats.meetingResist || 1,
    bugBonus: employee.stats.bugBonus || 1,
    outageResist: employee.stats.outageResist || 0,
    coffeeBoost: 0,
    range: 0,
    fireRate: 0,
    crit: employee.stats.crit || 0
  };
  applyPermanentStats(stats);
  return { employee, stats };
}

function startGame() {
  const { employee, stats } = employeeStats();
  game = {
    state: "running",
    day: save.day,
    weekday: weekdays[(save.day - 1) % weekdays.length],
    employee,
    elapsed: 0,
    spawnTimer: 0,
    coffeeTimer: 8,
    eventTimer: 38,
    salary: 0,
    level: 1,
    xp: 0,
    xpNeeded: 55,
    kills: 0,
    meetings: 0,
    bosses: new Set(),
    defeatedBosses: new Set(),
    achievements: [],
    camera: { x: 0, y: 0 },
    shake: 0,
    outage: 0,
    meetingLock: 0,
    player: {
      x: WORLD.width / 2,
      y: WORLD.height / 2,
      radius: 22,
      speed: 205,
      productivity: stats.productivity,
      maxEnergy: stats.maxEnergy,
      energy: stats.maxEnergy,
      focus: stats.focus,
      maxFocus: 120,
      happiness: stats.happiness,
      xpRate: stats.xpRate,
      meetingResist: stats.meetingResist,
      bugBonus: stats.bugBonus,
      outageResist: stats.outageResist,
      coffeeBoost: stats.coffeeBoost,
      range: 255 + stats.range,
      fireRate: 1.75 + stats.fireRate,
      projectileSpeed: 560,
      focusRecovery: 0.2,
      regen: 0,
      crit: stats.crit,
      pierce: 0,
      shootTimer: 0,
      walkTime: 0,
      moving: false,
      facing: { x: 1, y: 0 },
      attackFlash: 0,
      bumpFlash: 0,
      invuln: 0
    },
    enemies: [],
    projectiles: [],
    pickups: [],
    floaters: [],
    particles: []
  };

  if (game.weekday === "Monday") {
    game.player.focus -= 12;
    showToast("Monday debuff: everyone is already tired.");
  } else if (game.weekday === "Wednesday") {
    game.eventTimer = 10;
    showToast("Wednesday smells like production bug.");
  } else if (game.weekday === "Friday") {
    game.player.happiness += 15;
    showToast("Pizza Friday: happiness increased.");
  }

  openScreen(null);
}

function endGame(won) {
  game.state = "ended";
  const happinessBonus = Math.max(0.65, game.player.happiness / 100);
  const salaryEarned = Math.floor((game.salary + (won ? 220 : 0)) * happinessBonus);
  save.bank += salaryEarned;
  if (won) save.day += 1;

  const achievements = [];
  if (won && game.weekday === "Monday") achievements.push("Survived Monday");
  if (game.meetings >= 10) achievements.push("Attended 10 Meetings");
  if (game.weekday === "Friday" && game.kills >= 75) achievements.push("Fixed Production on Friday");
  if (game.player.focus < 35) achievements.push("Reply All Disaster");
  if (game.bosses.has("deadline") && won) achievements.push("Shipped Without Crying");

  achievements.forEach(name => (save.achievements[name] = true));
  storeSave();

  ui.resultKicker.textContent = won ? "Day complete" : "Burnout";
  ui.resultTitle.textContent = won ? `You survived ${game.weekday}.` : "The calendar won.";
  ui.resultSummary.textContent = won
    ? `You earned $${salaryEarned}, completed ${game.kills} bits of chaos, and somehow still have a job.`
    : `You earned $${salaryEarned} before burnout. The office plant is disappointed, but not surprised.`;

  ui.achievementList.innerHTML = "";
  const allAchievements = achievements.length ? achievements : ["Showed Up"];
  allAchievements.forEach(name => {
    const item = document.createElement("div");
    item.className = "achievement";
    item.textContent = name;
    ui.achievementList.appendChild(item);
  });

  openScreen(ui.resultScreen);
  renderShop();
}

function spawnEnemy(typeId, boss = false) {
  const type = enemyTypes[typeId];
  const edge = Math.floor(rand(0, 4));
  let x = 0;
  let y = 0;
  if (edge === 0) {
    x = rand(80, WORLD.width - 80);
    y = 60;
  } else if (edge === 1) {
    x = WORLD.width - 60;
    y = rand(80, WORLD.height - 80);
  } else if (edge === 2) {
    x = rand(80, WORLD.width - 80);
    y = WORLD.height - 60;
  } else {
    x = 60;
    y = rand(80, WORLD.height - 80);
  }

  const hpScale = 1 + game.elapsed / DAY_LENGTH * 1.15 + (game.day - 1) * 0.06;
  const enemy = {
    id: globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    typeId,
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: type.hp * (boss ? 1 : hpScale),
    maxHp: type.hp * (boss ? 1 : hpScale),
    speed: type.speed * (1 + game.elapsed / DAY_LENGTH * 0.25),
    radius: type.radius,
    contactCooldown: 0,
    meetingPulse: rand(3, 6),
    boss
  };
  game.enemies.push(enemy);
  if (boss) showToast(`${type.name} has entered the calendar.`);
}

function spawnPickup(kind, x, y) {
  const point = x == null || y == null || isCircleBlocked(x, y, 28) ? freeOfficePoint(28, x, y) : { x, y };
  game.pickups.push({
    kind,
    x: point.x,
    y: point.y,
    radius: kind === "coffee" ? 18 : 22,
    ttl: 22,
    bob: rand(0, Math.PI * 2)
  });
}

function addFloater(text, x, y, color = "#f4f7fb") {
  game.floaters.push({ text, x, y, color, life: 1, ttl: 1 });
}

function addParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(45, 150);
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      radius: rand(2, 5),
      ttl: rand(0.3, 0.75),
      life: rand(0.3, 0.75)
    });
  }
}

function updateGame(dt) {
  if (!game || game.state !== "running") return;

  game.elapsed += dt;
  game.spawnTimer -= dt;
  game.coffeeTimer -= dt;
  game.eventTimer -= dt;
  game.outage = Math.max(0, game.outage - dt);
  game.meetingLock = Math.max(0, game.meetingLock - dt);
  game.shake = Math.max(0, game.shake - dt * 8);
  game.player.invuln = Math.max(0, game.player.invuln - dt);

  if (game.elapsed >= DAY_LENGTH) {
    const deadlineOpen = game.enemies.some(enemy => enemy.typeId === "deadline");
    endGame(game.player.energy > 0 && !deadlineOpen);
    return;
  }

  updatePlayer(dt);
  updateSpawns(dt);
  updateProjectiles(dt);
  updateEnemies(dt);
  updatePickups(dt);
  updateEffects(dt);
  updateCamera();
  updateHud();

  if (game.player.energy <= 0) endGame(false);
}

function updatePlayer(dt) {
  const p = game.player;
  const input = {
    x: (keyState.has("d") || keyState.has("arrowright") ? 1 : 0) - (keyState.has("a") || keyState.has("arrowleft") ? 1 : 0),
    y: (keyState.has("s") || keyState.has("arrowdown") ? 1 : 0) - (keyState.has("w") || keyState.has("arrowup") ? 1 : 0)
  };
  const direction = norm(input.x, input.y);
  const moving = input.x !== 0 || input.y !== 0;
  p.moving = moving && game.meetingLock <= 0;
  p.attackFlash = Math.max(0, p.attackFlash - dt * 8);
  p.bumpFlash = Math.max(0, p.bumpFlash - dt * 5);

  if (game.meetingLock <= 0 && moving) {
    p.facing = direction;
    p.walkTime += dt * 11;
    const bumped = moveWithOfficePhysics(p, direction.x * p.speed * dt, direction.y * p.speed * dt, p.radius);
    if (bumped) p.bumpFlash = 1;
    p.focus = Math.min(p.maxFocus, p.focus + p.focusRecovery * 18 * dt);
  } else if (game.meetingLock > 0) {
    p.focus = Math.max(20, p.focus - 2 * dt);
  } else {
    p.walkTime += dt * 2;
  }

  if (p.regen > 0 && p.focus > 75) {
    p.energy = Math.min(p.maxEnergy, p.energy + p.regen * 12 * dt);
  }

  p.shootTimer -= dt;
  if (p.shootTimer <= 0 && game.meetingLock <= 0) {
    shootNearestEnemy();
    const focusFactor = clamp(p.focus / 100, 0.45, 1.25);
    const outageFactor = game.outage > 0 ? 1 - clamp(0.7 - p.outageResist, 0.1, 0.7) : 1;
    p.shootTimer = 1 / (p.fireRate * focusFactor * outageFactor);
  }
}

function shootNearestEnemy() {
  const p = game.player;
  let target = null;
  let best = Infinity;
  for (const enemy of game.enemies) {
    const distance = dist(p, enemy);
    if (distance < p.range && distance < best) {
      best = distance;
      target = enemy;
    }
  }
  if (!target) return;
  const direction = norm(target.x - p.x, target.y - p.y);
  p.facing = direction;
  p.attackFlash = 1;
  const crit = Math.random() < p.crit;
  game.projectiles.push({
    x: p.x,
    y: p.y - 8,
    vx: direction.x * p.projectileSpeed,
    vy: direction.y * p.projectileSpeed,
    radius: 7,
    damage: p.productivity * (crit ? 2.1 : 1),
    color: crit ? "#f1b84b" : "#31c5a9",
    pierce: p.pierce,
    ttl: 1.2,
    label: crit ? "!" : ""
  });
}

function updateSpawns(dt) {
  const intensity = 0.8 + game.elapsed / DAY_LENGTH * 1.55;
  if (game.spawnTimer <= 0) {
    const enemyCap = 24 + Math.floor(game.elapsed / DAY_LENGTH * 22);
    if (game.enemies.length < enemyCap) {
      spawnEnemy(pickEnemyType());
      if (Math.random() < intensity * 0.09) spawnEnemy("email");
    }
    game.spawnTimer = Math.max(0.68, 1.55 - intensity * 0.24);
  }

  if (game.coffeeTimer <= 0) {
    spawnPickup(Math.random() < 0.16 && game.weekday === "Friday" ? "pizza" : "coffee");
    game.coffeeTimer = rand(13, 20);
  }

  if (game.eventTimer <= 0) {
    triggerRandomEvent();
    game.eventTimer = rand(38, 58);
  }

  const workMinute = game.elapsed / DAY_LENGTH * 480;
  maybeBoss("standup", workMinute >= 30);
  maybeBoss("department", workMinute >= 120);
  maybeBoss("ceo", workMinute >= 300);
  maybeBoss("deadline", workMinute >= 450);
}

function pickEnemyType() {
  const t = game.elapsed / DAY_LENGTH;
  const roll = Math.random();
  if (t > 0.6 && roll < 0.12) return "printer";
  if (t > 0.45 && roll < 0.22) return "training";
  if (t > 0.25 && roll < 0.38) return "manager";
  if (t > 0.12 && roll < 0.62) return "bug";
  return "email";
}

function maybeBoss(id, condition) {
  if (!condition || game.bosses.has(id)) return;
  game.bosses.add(id);
  spawnEnemy(id, true);
}

function triggerRandomEvent() {
  const options = ["outage", "meeting", "bugstorm"];
  if (game.weekday === "Thursday") options.push("demo");
  const choice = options[Math.floor(rand(0, options.length))];
  if (choice === "outage") {
    game.outage = 9 * (1 - clamp(game.player.outageResist, 0, 0.75));
    showToast("Internet outage: productivity reduced while IT asks if it is plugged in.");
  } else if (choice === "meeting") {
    spawnEnemy("manager");
    showToast("Calendar ambush: a manager needs a quick sync.");
  } else if (choice === "demo") {
    game.player.happiness = Math.max(30, game.player.happiness - 8);
    spawnEnemy("bug");
    spawnEnemy("bug");
    showToast("Client demo: the app waited until now to be interesting.");
  } else {
    for (let i = 0; i < 3; i += 1) spawnEnemy("bug");
    showToast("Production bug swarm: Wednesday energy, even when it is not Wednesday.");
  }
}

function updateProjectiles(dt) {
  for (let i = game.projectiles.length - 1; i >= 0; i -= 1) {
    const shot = game.projectiles[i];
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.ttl -= dt;

    for (let j = game.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = game.enemies[j];
      if (Math.hypot(shot.x - enemy.x, shot.y - enemy.y) <= shot.radius + enemy.radius) {
        enemy.hp -= shot.damage;
        addFloater(Math.floor(shot.damage).toString(), enemy.x, enemy.y - enemy.radius, shot.color);
        addParticles(shot.x, shot.y, shot.color, 4);
        if (enemy.hp <= 0) defeatEnemy(enemy, j);
        if (shot.pierce > 0) {
          shot.pierce -= 1;
        } else {
          shot.ttl = -1;
          break;
        }
      }
    }

    if (shot.ttl <= 0) game.projectiles.splice(i, 1);
  }
}

function defeatEnemy(enemy, index) {
  const p = game.player;
  game.enemies.splice(index, 1);
  game.kills += 1;
  if (enemy.boss) game.defeatedBosses.add(enemy.typeId);
  const bugBonus = enemy.typeId === "bug" ? p.bugBonus : 1;
  game.xp += enemy.type.xp * p.xpRate * bugBonus;
  game.salary += enemy.type.salary;
  addParticles(enemy.x, enemy.y, enemy.type.color, enemy.boss ? 22 : 10);
  addFloater(`+$${enemy.type.salary}`, enemy.x, enemy.y - 24, "#8ee07f");
  if (Math.random() < 0.11 || enemy.boss) spawnPickup(Math.random() < 0.18 ? "pizza" : "coffee", enemy.x, enemy.y);

  if (game.xp >= game.xpNeeded) openUpgrade();
}

function openUpgrade() {
  game.state = "upgrade";
  game.level += 1;
  game.xp -= game.xpNeeded;
  game.xpNeeded = Math.floor(game.xpNeeded * 1.32 + 18);
  const choices = [...upgradePool].sort(() => Math.random() - 0.5).slice(0, 3);
  ui.upgradeChoices.innerHTML = "";
  choices.forEach(choice => {
    const button = document.createElement("button");
    button.className = "upgrade-card";
    button.innerHTML = `<h4>${choice.name}</h4><p>${choice.copy}</p>`;
    button.addEventListener("click", () => {
      choice.apply(game);
      showToast(`${choice.name} added to your questionable workflow.`);
      game.state = "running";
      openScreen(null);
    });
    ui.upgradeChoices.appendChild(button);
  });
  openScreen(ui.upgradeScreen);
}

function updateEnemies(dt) {
  const p = game.player;
  for (const enemy of game.enemies) {
    const direction = norm(p.x - enemy.x, p.y - enemy.y);
    const slow = enemy.typeId === "training" && dist(p, enemy) < 260 ? 0.72 : 1;
    const bumped = moveWithOfficePhysics(enemy, direction.x * enemy.speed * slow * dt, direction.y * enemy.speed * slow * dt, enemy.radius);
    if (bumped) {
      const side = enemy.id.charCodeAt(0) % 2 ? 1 : -1;
      moveWithOfficePhysics(enemy, -direction.y * enemy.speed * 0.55 * side * dt, direction.x * enemy.speed * 0.55 * side * dt, enemy.radius);
    }
    enemy.contactCooldown -= dt;
    enemy.meetingPulse -= dt;

    if (enemy.type.meeting && enemy.meetingPulse <= 0 && dist(p, enemy) < 220) {
      enemy.meetingPulse = rand(5, 8);
      game.meetingLock = Math.max(game.meetingLock, 1.4 / p.meetingResist);
      game.meetings += 1;
      p.energy -= 3.5 / p.meetingResist;
      p.focus = Math.max(12, p.focus - 8);
      addFloater("quick sync", p.x, p.y - 42, "#f1b84b");
    }

    if (dist(p, enemy) < p.radius + enemy.radius && enemy.contactCooldown <= 0 && p.invuln <= 0) {
      const meetingResist = enemy.type.meeting ? p.meetingResist : 1;
      p.energy -= enemy.type.damage / meetingResist;
      p.focus = Math.max(10, p.focus - enemy.type.focusDamage);
      p.happiness = Math.max(20, p.happiness - (enemy.typeId === "manager" ? 3 : 1));
      p.invuln = 0.65;
      enemy.contactCooldown = 1.1;
      game.shake = 1;
      addFloater(enemy.type.meeting ? "meeting" : "ugh", p.x, p.y - 45, enemy.type.color);
    }
  }
}

function updatePickups(dt) {
  const p = game.player;
  for (let i = game.pickups.length - 1; i >= 0; i -= 1) {
    const pickup = game.pickups[i];
    pickup.ttl -= dt;
    pickup.bob += dt * 5;
    if (dist(p, pickup) <= p.radius + pickup.radius + 8) {
      if (pickup.kind === "coffee") {
        const heal = 24 * (1 + p.coffeeBoost);
        p.energy = Math.min(p.maxEnergy, p.energy + heal);
        p.focus = Math.min(p.maxFocus, p.focus + 12);
        addFloater("coffee", p.x, p.y - 46, "#d39552");
      } else {
        p.happiness = Math.min(160, p.happiness + 14);
        p.energy = Math.min(p.maxEnergy, p.energy + 10);
        addFloater("pizza", p.x, p.y - 46, "#f1b84b");
      }
      game.pickups.splice(i, 1);
    } else if (pickup.ttl <= 0) {
      game.pickups.splice(i, 1);
    }
  }
}

function updateEffects(dt) {
  for (let i = game.floaters.length - 1; i >= 0; i -= 1) {
    const floater = game.floaters[i];
    floater.y -= 34 * dt;
    floater.life -= dt;
    if (floater.life <= 0) game.floaters.splice(i, 1);
  }

  for (let i = game.particles.length - 1; i >= 0; i -= 1) {
    const particle = game.particles[i];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.92;
    particle.vy *= 0.92;
    particle.life -= dt;
    if (particle.life <= 0) game.particles.splice(i, 1);
  }
}

function updateCamera() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  game.camera.x = clamp(game.player.x - width / 2, 0, WORLD.width - width);
  game.camera.y = clamp(game.player.y - height / 2, 0, WORLD.height - height);
}

function updateHud() {
  const p = game.player;
  const weekday = game.weekday;
  ui.dayLabel.textContent = `${weekday}, Day ${game.day}`;
  ui.timeText.textContent = formatWorkTime(game.elapsed);
  ui.phaseText.textContent = phaseName(game.elapsed);
  ui.salaryText.textContent = `$${Math.floor(game.salary)}`;
  ui.energyText.textContent = `${Math.ceil(p.energy)}/${Math.ceil(p.maxEnergy)}`;
  ui.focusText.textContent = `${Math.ceil(p.focus)}%`;
  ui.prodText.textContent = Math.ceil(p.productivity).toString();
  ui.happyText.textContent = `${Math.ceil(p.happiness)}%`;
  ui.energyBar.style.width = `${clamp(p.energy / p.maxEnergy * 100, 0, 100)}%`;
  ui.focusBar.style.width = `${clamp(p.focus / p.maxFocus * 100, 0, 100)}%`;
  ui.prodBar.style.width = `${clamp(p.productivity / 55 * 100, 8, 100)}%`;
  ui.happyBar.style.width = `${clamp(p.happiness / 160 * 100, 0, 100)}%`;
}

function formatWorkTime(elapsed) {
  const totalMinutes = Math.floor(elapsed / DAY_LENGTH * 480);
  const hour24 = 9 + Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 > 12 ? hour24 - 12 : hour24;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

function phaseName(elapsed) {
  const t = elapsed / DAY_LENGTH;
  if (game.outage > 0) return "Internet outage";
  if (game.meetingLock > 0) return "Trapped in meeting";
  if (t < 0.22) return "Morning inbox";
  if (t < 0.42) return "Meetings";
  if (t < 0.58) return "Lunch confusion";
  if (t < 0.86) return "Afternoon chaos";
  return "Release deadline";
}

function draw() {
  resizeCanvas();
  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.clearRect(0, 0, width, height);

  if (game) {
    drawWorld(width, height);
  } else {
    drawMenuBackdrop(width, height);
  }
}

function worldToScreen(x, y) {
  const shakeX = game.shake > 0 ? rand(-game.shake * 4, game.shake * 4) : 0;
  const shakeY = game.shake > 0 ? rand(-game.shake * 4, game.shake * 4) : 0;
  return { x: x - game.camera.x + shakeX, y: y - game.camera.y + shakeY };
}

function drawWorld(width, height) {
  const cam = game.camera;
  ctx.fillStyle = "#273343";
  ctx.fillRect(0, 0, width, height);
  drawFloor(cam, width, height);
  drawOfficeFurniture(cam);

  game.pickups.forEach(drawPickup);
  game.particles.forEach(drawParticle);
  game.projectiles.forEach(drawProjectile);
  game.enemies.sort((a, b) => a.y - b.y).forEach(drawEnemy);
  drawPlayer();
  game.floaters.forEach(drawFloater);

  if (game.outage > 0) {
    ctx.fillStyle = "rgba(6, 8, 12, 0.26)";
    ctx.fillRect(0, 0, width, height);
  }
}

function drawMenuBackdrop(width, height) {
  ctx.fillStyle = "#273343";
  ctx.fillRect(0, 0, width, height);
  const fakeCam = { x: 500, y: 380 };
  drawFloor(fakeCam, width, height);
  drawOfficeFurniture(fakeCam);
}

function drawFloor(cam, width, height) {
  const tile = 96;
  const offsetX = -((cam.x * 0.75) % tile) - tile;
  const offsetY = -((cam.y * 0.55) % (tile / 2)) - tile;
  ctx.fillStyle = "#273343";
  ctx.fillRect(0, 0, width, height);

  for (let y = offsetY; y < height + tile; y += tile / 2) {
    for (let x = offsetX; x < width + tile * 2; x += tile) {
      const stagger = Math.round((y - offsetY) / (tile / 2)) % 2 ? tile / 2 : 0;
      drawIsoTile(x + stagger, y, tile, tile / 2, "rgba(255,255,255,0.032)");
    }
  }

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = offsetX - tile; x < width + tile * 2; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height * 1.8, height);
    ctx.stroke();
  }
  for (let x = offsetX - tile; x < width + tile * 2; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x + height * 1.8, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

function drawIsoTile(x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - height / 2);
  ctx.lineTo(x + width / 2, y);
  ctx.lineTo(x, y + height / 2);
  ctx.lineTo(x - width / 2, y);
  ctx.closePath();
  ctx.fill();
}

function drawOfficeFurniture(cam) {
  const desks = [
    [320, 260], [620, 260], [920, 260], [1220, 260], [1520, 260], [1820, 260],
    [420, 650], [720, 650], [1020, 650], [1320, 650], [1620, 650], [1920, 650],
    [300, 1050], [600, 1050], [900, 1050], [1200, 1050], [1500, 1050], [1800, 1050],
    [520, 1450], [820, 1450], [1120, 1450], [1420, 1450], [1720, 1450], [2020, 1450]
  ];
  desks.forEach(([x, y], index) => {
    const s = { x: x - cam.x, y: y - cam.y };
    if (s.x < -160 || s.y < -120 || s.x > window.innerWidth + 160 || s.y > window.innerHeight + 160) return;
    drawDesk(s.x, s.y, index);
  });

  const fixtures = [
    [180, 410, "plant"], [2130, 390, "plant"], [2350, 1160, "printer"], [190, 1320, "printer"],
    [2380, 760, "table"], [2250, 1550, "plant"]
  ];
  fixtures.forEach(([x, y, type], index) => {
    const s = { x: x - cam.x, y: y - cam.y };
    if (s.x < -180 || s.y < -160 || s.x > window.innerWidth + 180 || s.y > window.innerHeight + 180) return;
    if (type === "plant") drawPlant(s.x, s.y, index);
    if (type === "printer") drawPrinter(s.x, s.y);
    if (type === "table") drawConferenceTable(s.x, s.y);
  });
}

function drawDesk(x, y, index) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 36, 74, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  const top = index % 2 ? "#9b7654" : "#836243";
  const front = index % 2 ? "#6f5038" : "#5d4633";
  const side = index % 2 ? "#7d5d42" : "#684d38";
  drawCuboid(-64, -34, 128, 58, 18, top, front, side);

  ctx.fillStyle = "#2d3a4c";
  roundedRect(-46, 26, 30, 28, 6);
  ctx.fill();
  ctx.fillStyle = "#1b2432";
  roundedRect(-43, 17, 24, 16, 4);
  ctx.fill();

  ctx.fillStyle = "#182032";
  roundedRect(-28, -52, 56, 34, 5);
  ctx.fill();
  ctx.fillStyle = "#0e1420";
  ctx.fillRect(-31, -18, 62, 7);
  ctx.fillStyle = "#79a8ff";
  ctx.fillRect(-20, -46, 40, 20);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(-17, -43, 16, 4);
  ctx.fillStyle = "#d6dee9";
  ctx.fillRect(-33, 4, 42, 8);
  ctx.fillStyle = "#31c5a9";
  ctx.beginPath();
  ctx.arc(38, -2, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCuboid(x, y, width, height, depth, topColor, frontColor, sideColor) {
  ctx.fillStyle = topColor;
  roundedRect(x, y, width, height, 7);
  ctx.fill();
  ctx.fillStyle = frontColor;
  ctx.beginPath();
  ctx.moveTo(x, y + height - 3);
  ctx.lineTo(x + width, y + height - 3);
  ctx.lineTo(x + width - depth, y + height + depth);
  ctx.lineTo(x - depth, y + height + depth);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = sideColor;
  ctx.beginPath();
  ctx.moveTo(x + width, y + 4);
  ctx.lineTo(x + width, y + height - 3);
  ctx.lineTo(x + width - depth, y + height + depth);
  ctx.lineTo(x + width - depth, y + depth);
  ctx.closePath();
  ctx.fill();
}

function drawPlant(x, y, index) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 30, 28, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#b86b4f";
  drawCuboid(-14, 10, 28, 18, 8, "#c17a5b", "#8e4f3d", "#a15d45");
  ctx.fillStyle = index % 2 ? "#8ee07f" : "#31c5a9";
  for (let i = 0; i < 7; i += 1) {
    const angle = -Math.PI / 2 + (i - 3) * 0.28;
    ctx.beginPath();
    ctx.ellipse(Math.cos(angle) * 10, -2 + Math.sin(angle) * 15, 5, 20, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPrinter(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 31, 46, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  drawCuboid(-36, -12, 72, 38, 16, "#d6dee9", "#9aa7b8", "#b8c4d2");
  ctx.fillStyle = "#2c3646";
  ctx.fillRect(-24, -6, 48, 8);
  ctx.fillStyle = "#f36f6f";
  ctx.beginPath();
  ctx.arc(23, 8, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawConferenceTable(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.02);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 48, 130, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  drawCuboid(-104, -38, 208, 70, 20, "#8e684a", "#634936", "#75583f");
  ctx.fillStyle = "#f1b84b";
  ctx.fillRect(-36, -12, 72, 6);
  ctx.fillStyle = "#d6dee9";
  ctx.fillRect(-22, 4, 44, 8);
  ctx.restore();
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawPlayer() {
  const p = game.player;
  const s = worldToScreen(p.x, p.y);
  const stride = Math.sin(p.walkTime);
  const counterStride = Math.sin(p.walkTime + Math.PI);
  const bob = p.moving ? Math.abs(stride) * 3 : Math.sin(p.walkTime * 0.8) * 1.2;
  const lean = clamp(p.facing.x, -1, 1) * 2;
  const armReach = p.attackFlash * 8;
  ctx.save();
  ctx.translate(s.x, s.y - bob);

  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ctx.beginPath();
  ctx.ellipse(0, 25 + bob, 27, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#273343";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-8, 12);
  ctx.lineTo(-11 + stride * 8, 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, 12);
  ctx.lineTo(11 + counterStride * 8, 30);
  ctx.stroke();

  ctx.strokeStyle = "#111820";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-12 + stride * 8, 31);
  ctx.lineTo(-20 + stride * 8, 31);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(12 + counterStride * 8, 31);
  ctx.lineTo(20 + counterStride * 8, 31);
  ctx.stroke();

  ctx.save();
  ctx.translate(lean, 0);
  ctx.fillStyle = "#31c5a9";
  roundedRect(-17, -8, 34, 36, 10);
  ctx.fill();
  ctx.fillStyle = "#24a891";
  ctx.fillRect(-17, 8, 34, 7);

  ctx.strokeStyle = "#f3c89f";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.lineTo(-27 - armReach * 0.3, 12 + stride * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(27 + armReach, 10 + counterStride * 2);
  ctx.stroke();

  ctx.fillStyle = "#d6dee9";
  roundedRect(-25, -1, 50, 19, 4);
  ctx.fill();
  ctx.fillStyle = "#79a8ff";
  ctx.fillRect(-18, 3, 36, 10);
  ctx.fillStyle = "rgba(255,255,255,0.24)";
  ctx.fillRect(-15, 5, 15, 3);

  ctx.fillStyle = "#f3c89f";
  ctx.beginPath();
  ctx.arc(0, -24, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1e1c";
  roundedRect(-14, -38, 28, 12, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-10, -29, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0d1118";
  ctx.fillRect(-7 + p.facing.x * 2, -25 + p.facing.y, 4, 4);
  ctx.fillRect(5 + p.facing.x * 2, -25 + p.facing.y, 4, 4);

  ctx.strokeStyle = "#7b4d3a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0 + p.facing.x * 2, -18, 5, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.strokeStyle = "#182032";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -24, 22, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  ctx.fillStyle = "#182032";
  roundedRect(-23, -28, 7, 14, 3);
  ctx.fill();
  roundedRect(16, -28, 7, 14, 3);
  ctx.fill();
  ctx.restore();

  if (p.attackFlash > 0) {
    ctx.strokeStyle = `rgba(49, 197, 169, ${p.attackFlash})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(31 + p.facing.x * 12, 3 + p.facing.y * 8, 9 + p.attackFlash * 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (game.meetingLock > 0) {
    ctx.strokeStyle = "#f1b84b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnemy(enemy) {
  const s = worldToScreen(enemy.x, enemy.y);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, enemy.radius + 6, enemy.radius * 0.92, enemy.radius * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = enemy.type.color;
  roundedRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2, enemy.boss ? 12 : 7);
  ctx.fill();
  ctx.fillStyle = "#10151f";
  ctx.font = `${enemy.boss ? 13 : 10}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(enemy.type.label, 0, 0);

  const barWidth = enemy.radius * 2;
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.fillRect(-enemy.radius, -enemy.radius - 13, barWidth, 5);
  ctx.fillStyle = enemy.type.boss ? "#ff7f50" : "#8ee07f";
  ctx.fillRect(-enemy.radius, -enemy.radius - 13, barWidth * clamp(enemy.hp / enemy.maxHp, 0, 1), 5);
  ctx.restore();
}

function drawProjectile(shot) {
  const s = worldToScreen(shot.x, shot.y);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.fillStyle = shot.color;
  ctx.beginPath();
  ctx.arc(0, 0, shot.radius, 0, Math.PI * 2);
  ctx.fill();
  if (shot.label) {
    ctx.fillStyle = "#0d1118";
    ctx.font = "bold 10px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(shot.label, 0, 0);
  }
  ctx.restore();
}

function drawPickup(pickup) {
  const s = worldToScreen(pickup.x, pickup.y + Math.sin(pickup.bob) * 5);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.fillStyle = pickup.kind === "coffee" ? "#d39552" : "#f1b84b";
  ctx.beginPath();
  ctx.arc(0, 0, pickup.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111820";
  ctx.font = "bold 10px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pickup.kind === "coffee" ? "COF" : "PIZ", 0, 1);
  ctx.restore();
}

function drawParticle(particle) {
  const s = worldToScreen(particle.x, particle.y);
  ctx.globalAlpha = clamp(particle.life / particle.ttl, 0, 1);
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(s.x, s.y, particle.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawFloater(floater) {
  const s = worldToScreen(floater.x, floater.y);
  ctx.save();
  ctx.globalAlpha = clamp(floater.life / floater.ttl, 0, 1);
  ctx.fillStyle = floater.color;
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(floater.text, s.x, s.y);
  ctx.restore();
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  updateGame(dt);
  draw();
  requestAnimationFrame(loop);
}

function init() {
  renderClassList();
  renderShop();
  updateHudForMenu();
  ui.startButton.addEventListener("click", startGame);
  ui.nextDayButton.addEventListener("click", () => {
    game = null;
    openScreen(ui.startScreen);
    renderClassList();
    renderShop();
  });
  ui.resetButton.addEventListener("click", () => {
    save = defaultSave();
    storeSave();
    renderShop();
    showToast("Save reset. Fresh badge, same office.");
  });

  window.addEventListener("keydown", event => {
    keyState.add(event.key.toLowerCase());
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
  });
  window.addEventListener("keyup", event => keyState.delete(event.key.toLowerCase()));
  window.addEventListener("resize", resizeCanvas);
  if (new URLSearchParams(window.location.search).has("autostart")) {
    setTimeout(startGame, 80);
  }
  requestAnimationFrame(loop);
}

function updateHudForMenu() {
  ui.dayLabel.textContent = `${weekdays[(save.day - 1) % weekdays.length]}, Day ${save.day}`;
  ui.timeText.textContent = "9:00 AM";
  ui.phaseText.textContent = "Ready to clock in";
  ui.salaryText.textContent = `$${Math.floor(save.bank)}`;
}

init();
