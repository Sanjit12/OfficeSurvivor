import {
  ALL_STATIONS,
  CAMPUS_WALLS,
  CFO_TERMINAL_STATION,
  CLASS_MAP,
  DAY_LENGTH_SECONDS,
  DIFFICULTY_MAP,
  DIFFICULTY_RANK,
  ENEMY_ARCHETYPES,
  ESPRESSO_STATION,
  getChapterForDay,
  getMaxUnlockedDay,
  getShopItemCost,
  HR_SHREDDER_STATION,
  LEGACY_SAVE_KEY,
  LOUNGE_STATION,
  MAX_CONCURRENT_TELEGRAPHS,
  OFFICE_OBSTACLES,
  OFFICE_WEAPON_MAP,
  PERK_POOL,
  PRINTER_STATION,
  SAVE_KEY,
  SERVER_STATION,
  SHOP_ITEMS,
  STORY_CHAPTERS,
  WASHROOM_STATION,
  WHITEBOARD_STATION,
  WORLD_BOUNDS
} from "./data";
import { getDoorwaySteerTarget, getRoomAtPosition, getRoomById, getRoomCenter } from "./campus";
import type {
  DifficultyId,
  DilemmaChoice,
  EmployeeClassId,
  EnemyEntity,
  EnemyProjectileKind,
  EnemyTypeId,
  FloorHazardKind,
  GameState,
  InputSnapshot,
  OfficeObstacle,
  OfficeWeaponId,
  PerkDef,
  PickupKind,
  RoomId,
  SaveData,
  SimEvent,
  SimOptions,
  StationId
} from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function dist2D(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

export function norm2D(dx: number, dz: number): { x: number; z: number } {
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return { x: 0, z: -1 };
  return { x: dx / len, z: dz / len };
}

export function createDefaultSave(): SaveData {
  const upgrades: Record<string, number> = {};
  for (const item of SHOP_ITEMS) upgrades[item.id] = 0;
  return {
    bank: 0,
    day: 1,
    selectedDay: 1,
    highestDayCleared: 0,
    floorBestDifficulty: {},
    selectedClass: "junior",
    selectedWeapon: "stapler",
    selectedDifficulty: "standard",
    upgrades,
    achievements: {},
    bestSalaryRun: 0
  };
}

export function loadSaveFromStorage(storage?: Pick<Storage, "getItem">): SaveData {
  const defaults = createDefaultSave();
  if (!storage) return defaults;
  try {
    const raw = storage.getItem(SAVE_KEY) || storage.getItem(LEGACY_SAVE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const floorBestDifficulty: Record<number, DifficultyId> = {};
    if (parsed.floorBestDifficulty && typeof parsed.floorBestDifficulty === "object") {
      for (const [k, v] of Object.entries(parsed.floorBestDifficulty)) {
        const floorIdx = Number(k);
        if (floorIdx >= 1 && floorIdx <= STORY_CHAPTERS.length && DIFFICULTY_MAP[v as DifficultyId]) {
          floorBestDifficulty[floorIdx] = v as DifficultyId;
        }
      }
    } else if (typeof parsed.highestDayCleared === "number" && parsed.highestDayCleared > 0) {
      const migratedDiff: DifficultyId =
        parsed.selectedDifficulty && DIFFICULTY_MAP[parsed.selectedDifficulty]
          ? parsed.selectedDifficulty
          : "standard";
      for (let d = 1; d <= Math.min(STORY_CHAPTERS.length, parsed.highestDayCleared); d += 1) {
        floorBestDifficulty[d] = migratedDiff;
      }
    }

    const merged: SaveData = {
      ...defaults,
      ...parsed,
      floorBestDifficulty,
      upgrades: { ...defaults.upgrades, ...(parsed.upgrades || {}) },
      achievements: { ...(parsed.achievements || {}) },
      selectedClass:
        parsed.selectedClass && CLASS_MAP[parsed.selectedClass] ? parsed.selectedClass : "junior",
      selectedWeapon:
        parsed.selectedWeapon && OFFICE_WEAPON_MAP[parsed.selectedWeapon]
          ? parsed.selectedWeapon
          : "stapler",
      selectedDifficulty:
        parsed.selectedDifficulty && DIFFICULTY_MAP[parsed.selectedDifficulty]
          ? parsed.selectedDifficulty
          : "standard"
    };
    const maxUnlocked = getMaxUnlockedDay(merged);
    merged.selectedDay = clamp(
      typeof parsed.selectedDay === "number" ? parsed.selectedDay : merged.day,
      1,
      maxUnlocked
    );
    return merged;
  } catch {
    return defaults;
  }
}

export function persistSaveToStorage(save: SaveData, storage?: Pick<Storage, "setItem">): void {
  if (!storage) return;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage quota or private mode fallback
  }
}

export function purchaseShopUpgrade(
  save: SaveData,
  itemId: string
): { ok: boolean; reason?: string; cost?: number; newLevel?: number } {
  const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
  if (!item) return { ok: false, reason: "Unknown upgrade." };
  const current = save.upgrades[item.id] || 0;
  if (current >= item.maxLevel) {
    return { ok: false, reason: `${item.name} is already maxed out.` };
  }
  const cost = getShopItemCost(item, current);
  if (save.bank < cost) {
    return { ok: false, reason: `Need $${cost} salary to unlock ${item.name}.`, cost };
  }
  save.bank -= cost;
  save.upgrades[item.id] = current + 1;
  return { ok: true, cost, newLevel: current + 1 };
}

export function resolveCircleAABB(
  x: number,
  z: number,
  radius: number,
  obs: OfficeObstacle
): { pushX: number; pushZ: number } | null {
  const minX = obs.x - obs.halfW;
  const maxX = obs.x + obs.halfW;
  const minZ = obs.z - obs.halfD;
  const maxZ = obs.z + obs.halfD;
  const closestX = clamp(x, minX, maxX);
  const closestZ = clamp(z, minZ, maxZ);
  let dx = x - closestX;
  let dz = z - closestZ;
  let d = Math.hypot(dx, dz);

  if (d === 0) {
    const dl = Math.abs(x - minX);
    const dr = Math.abs(maxX - x);
    const dt = Math.abs(z - minZ);
    const db = Math.abs(maxZ - z);
    const smallest = Math.min(dl, dr, dt, db);
    if (smallest === dl) {
      dx = -1;
      dz = 0;
    } else if (smallest === dr) {
      dx = 1;
      dz = 0;
    } else if (smallest === dt) {
      dx = 0;
      dz = -1;
    } else {
      dx = 0;
      dz = 1;
    }
    d = 1;
    const overlap = smallest + radius;
    return { pushX: dx * overlap, pushZ: dz * overlap };
  }

  if (d >= radius) return null;
  const push = radius - d;
  return { pushX: (dx / d) * push, pushZ: (dz / d) * push };
}

export function moveWithCollisions(
  entity: { x: number; z: number },
  dx: number,
  dz: number,
  radius: number,
  obstacles: OfficeObstacle[] = OFFICE_OBSTACLES
): boolean {
  let collided = false;
  const minX = -WORLD_BOUNDS.halfW + radius + 0.35;
  const maxX = WORLD_BOUNDS.halfW - radius - 0.35;
  const minZ = -WORLD_BOUNDS.halfD + radius + 0.35;
  const maxZ = WORLD_BOUNDS.halfD - radius - 0.35;

  entity.x = clamp(entity.x + dx, minX, maxX);
  for (const obs of obstacles) {
    const push = resolveCircleAABB(entity.x, entity.z, radius, obs);
    if (push) {
      entity.x += push.pushX;
      entity.z += push.pushZ;
      collided = true;
    }
  }

  entity.z = clamp(entity.z + dz, minZ, maxZ);
  for (const obs of obstacles) {
    const push = resolveCircleAABB(entity.x, entity.z, radius, obs);
    if (push) {
      entity.x += push.pushX;
      entity.z += push.pushZ;
      collided = true;
    }
  }

  entity.x = clamp(entity.x, minX, maxX);
  entity.z = clamp(entity.z, minZ, maxZ);
  return collided;
}

export function isPointBlocked(
  x: number,
  z: number,
  radius: number,
  obstacles: OfficeObstacle[] = OFFICE_OBSTACLES
): boolean {
  return obstacles.some((obs) => resolveCircleAABB(x, z, radius, obs) !== null);
}

export function findOpenPoint(
  radius: number,
  rng: () => number = Math.random,
  fallbackX = 0,
  fallbackZ = 0
): { x: number; z: number } {
  for (let i = 0; i < 48; i += 1) {
    const x = -WORLD_BOUNDS.halfW + 3 + rng() * (WORLD_BOUNDS.halfW * 2 - 6);
    const z = -WORLD_BOUNDS.halfD + 3 + rng() * (WORLD_BOUNDS.halfD * 2 - 6);
    if (!isPointBlocked(x, z, radius + 0.5)) {
      return { x, z };
    }
  }
  return { x: fallbackX, z: fallbackZ };
}

export function findOpenPointInRoom(
  roomId: RoomId,
  radius: number,
  rng: () => number = Math.random
): { x: number; z: number } {
  const room = getRoomById(roomId);
  const pad = 2.0;
  for (let i = 0; i < 32; i += 1) {
    const x = room.minX + pad + rng() * Math.max(1, room.maxX - room.minX - pad * 2);
    const z = room.minZ + pad + rng() * Math.max(1, room.maxZ - room.minZ - pad * 2);
    if (!isPointBlocked(x, z, radius + 0.45)) {
      return { x, z };
    }
  }
  const c = getRoomCenter(roomId);
  if (!isPointBlocked(c.x, c.z, radius + 0.3)) return c;
  return { x: 0, z: 0 };
}

export function formatWorkClock(elapsed: number, dayLength = DAY_LENGTH_SECONDS): string {
  const totalMinutes = Math.floor(clamp(elapsed / dayLength, 0, 1) * 480);
  const hour24 = 9 + Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 > 12 ? hour24 - 12 : hour24;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

export function getWorkMinute(elapsed: number, dayLength = DAY_LENGTH_SECONDS): number {
  return clamp(elapsed / dayLength, 0, 1) * 480;
}

export function getPhaseLabel(state: GameState): string {
  if (state.outage > 0) return "Server Outage — Reboot IT Room";
  if (state.meetingLock > 0) return "Trapped in Quick Sync";
  if (state.policySilenceTimer > 0) return "HR Policy Silence (-32% Fire Rate)";
  const activeBoss = state.enemies.find((e) => e.boss && e.aiPhase !== "dying");
  if (activeBoss) {
    const def = ENEMY_ARCHETYPES[activeBoss.typeId];
    const phaseTag = activeBoss.bossPhase === 2 ? " · Phase II" : "";
    return `${def.titleBadge}: ${def.name}${phaseTag}`;
  }
  if (state.salaryBoostTimer > 0) {
    return `CFO 2× Salary Surge (${Math.ceil(state.salaryBoostTimer)}s)`;
  }
  if (state.whiteboardBuffTimer > 0) {
    return `Sprint Focus Aura (${Math.ceil(state.whiteboardBuffTimer)}s)`;
  }
  const t = state.elapsed / state.dayLength;
  if (t < 0.22) return "Morning Inbox";
  if (t < 0.44) return "Standup Rush";
  if (t < 0.55) return "Lunch Break";
  if (t < 0.82) return "Afternoon Crunch";
  return "Code Freeze";
}

export function getFlowMultiplier(combo: number): number {
  if (combo >= 18) return 3;
  if (combo >= 8) return 2;
  if (combo >= 3) return 1.5;
  return 1;
}

export function createGameState(
  save: SaveData,
  classId: EmployeeClassId = save.selectedClass,
  dayOverride?: number,
  difficultyOverride?: DifficultyId,
  weaponOverride?: OfficeWeaponId
): GameState {
  const day = dayOverride ?? save.selectedDay ?? save.day;
  const difficulty = DIFFICULTY_MAP[difficultyOverride ?? save.selectedDifficulty] || DIFFICULTY_MAP.standard;
  const chapter = getChapterForDay(day);
  const employee = CLASS_MAP[classId] || CLASS_MAP.junior;
  const weapon = OFFICE_WEAPON_MAP[weaponOverride ?? save.selectedWeapon] || OFFICE_WEAPON_MAP.stapler;

  const laptopLvl = save.upgrades.laptop || 0;
  const chairLvl = save.upgrades.chair || 0;
  const coffeeLvl = save.upgrades.coffee || 0;
  const internetLvl = save.upgrades.internet || 0;
  const monitorLvl = save.upgrades.monitor || 0;
  const assistantLvl = save.upgrades.assistant || 0;

  const maxEnergy = employee.stats.maxEnergy + chairLvl * 10;
  const initialFocus =
    chapter.weekday === "Monday" ? Math.max(60, employee.stats.focus - 10) : employee.stats.focus;
  const initialHappiness =
    chapter.weekday === "Friday" ? Math.min(160, employee.stats.happiness + 15) : employee.stats.happiness;

  const initialEspressoCd = chapter.weekday === "Monday" ? 0 : 6;
  const stationCooldowns: Record<StationId, number> = {
    espresso: initialEspressoCd,
    whiteboard: 0,
    printer: 4,
    server: 0,
    washroom: 0,
    lounge: 0,
    hr_shredder: 0,
    cfo_terminal: 6
  };

  const state: GameState = {
    screen: "playing",
    day,
    difficulty,
    chapter,
    employee,
    weapon,
    currentRoomId: "atrium",
    elapsed: 0,
    dayLength: DAY_LENGTH_SECONDS,
    spawnTimer: 1.35,
    enemySpawnCooldowns: {},
    squadTimer: 38,
    hazardTimer: 18,
    coffeeTimer: 12,
    eventTimer: chapter.weekday === "Wednesday" ? 22 : 34,
    stationCooldowns,
    espressoCooldown: initialEspressoCd,
    whiteboardCooldown: 0,
    whiteboardBuffTimer: 0,
    printerCooldown: 4,
    hasteTimer: 0,
    salaryBoostTimer: 0,
    policySilenceTimer: 0,
    serverRebootProgress: 0,
    salary: 0,
    level: 1,
    xp: 0,
    xpNeeded: 125,
    pendingLevelUps: 0,
    rerollCost: 15,
    claimedPerks: {},
    kills: 0,
    meetingsEndured: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    hitstop: 0,
    trauma: 0,
    outage: 0,
    meetingLock: 0,
    dilemmaTriggered: false,
    triggeredComms: new Set<number>(),
    spawnedBosses: new Set<EnemyTypeId>(),
    defeatedBosses: new Set<EnemyTypeId>(),
    pendingPerks: [],
    activeDilemma: null,
    runAchievements: [],
    summary: null,
    player: {
      x: 0,
      z: 0,
      vx: 0,
      vz: 0,
      radius: 0.62,
      speed: employee.stats.speed,
      facingX: 0,
      facingZ: -1,
      strideDistance: 0,
      moving: false,
      productivity: employee.stats.productivity + laptopLvl * 1.8,
      maxEnergy,
      energy: maxEnergy,
      ghostEnergy: maxEnergy,
      moraleShield: 0,
      focus: initialFocus,
      maxFocus: 120,
      happiness: initialHappiness,
      xpRate: employee.stats.xpRate,
      meetingResist: employee.stats.meetingResist,
      bugBonus: employee.stats.bugBonus,
      outageResist: clamp(employee.stats.outageResist + internetLvl * 0.1, 0, 0.85),
      coffeeBoost: coffeeLvl * 0.15,
      range: (12.2 + monitorLvl * 1.4) * weapon.rangeMult,
      fireRate: (2.0 + assistantLvl * 0.24) * weapon.fireRateMult,
      projectileSpeed: 24 * weapon.speedMult,
      focusRecovery: 0.35,
      regen: 0,
      crit: clamp(employee.stats.crit + weapon.critBonus, 0.05, 0.92),
      pierce: employee.stats.pierce + weapon.pierceBonus,
      ricochet: weapon.ricochetBonus,
      weaponEvolved: false,
      shootTimer: 0.25,
      skillCooldown: 0,
      skillMaxCooldown: employee.skillCooldown * Math.pow(0.95, assistantLvl),
      dodgeCooldown: 0,
      dodgeMaxCooldown: 2.4,
      dodgeTimer: 0,
      dodgeDirX: 0,
      dodgeDirZ: -1,
      dashTimer: 0,
      dashDirX: 0,
      dashDirZ: -1,
      invuln: 0.5,
      attackFlash: 0,
      hitFlash: 0,
      squashY: 1
    },
    enemies: [],
    projectiles: [],
    telegraphs: [],
    hazards: [],
    xpOrbs: [],
    pickups: [],
    drones: [],
    floaters: [],
    nextEntityId: 1
  };

  return state;
}

function nextId(state: GameState, prefix: string): string {
  const id = `${prefix}-${state.nextEntityId}`;
  state.nextEntityId += 1;
  return id;
}

function addFloater(
  state: GameState,
  text: string,
  x: number,
  y: number,
  z: number,
  color: string,
  isDamage = false
): void {
  if (state.floaters.length > 34) state.floaters.shift();
  state.floaters.push({
    id: nextId(state, "flt"),
    text,
    x,
    y,
    z,
    color,
    life: 0.85,
    ttl: 0.85,
    isDamage
  });
}

function getBossSignatureRoom(typeId: EnemyTypeId): RoomId {
  switch (typeId) {
    case "boss_ceo":
      return "ceo_suite";
    case "boss_cfo":
      return "cfo_suite";
    case "boss_hr":
      return "hr_office";
    case "boss_cto":
      return "it_room";
    case "boss_coo":
      return "boardroom";
    default:
      return "atrium";
  }
}

export function spawnEnemy(
  state: GameState,
  typeId: EnemyTypeId,
  rng: () => number = Math.random,
  events: SimEvent[] = [],
  posOverride?: { x: number; z: number }
): EnemyEntity {
  const def = ENEMY_ARCHETYPES[typeId];
  let x = 0;
  let z = 0;
  if (posOverride) {
    x = posOverride.x;
    z = posOverride.z;
  } else if (def.boss) {
    const bossRoom = getBossSignatureRoom(typeId);
    const pos = findOpenPointInRoom(bossRoom, def.radius, rng);
    x = pos.x;
    z = pos.z;
  } else {
    // Spawn around the player's neighboring wings (15m-25m away) so combat stays brisk across the 10-room floor
    const p = state.player;
    let found = false;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const angle = rng() * Math.PI * 2;
      const dist = 13.5 + rng() * 11.5;
      const cx = clamp(p.x + Math.cos(angle) * dist, -WORLD_BOUNDS.halfW + 2.5, WORLD_BOUNDS.halfW - 2.5);
      const cz = clamp(p.z + Math.sin(angle) * dist, -WORLD_BOUNDS.halfD + 2.5, WORLD_BOUNDS.halfD - 2.5);
      if (!isPointBlocked(cx, cz, def.radius + 0.45)) {
        x = cx;
        z = cz;
        found = true;
        break;
      }
    }
    if (!found) {
      const open = findOpenPoint(def.radius, rng, 0, -10);
      x = open.x;
      z = open.z;
    }
  }

  const progress = state.elapsed / state.dayLength;
  const baseHpScale = def.boss
    ? 1 + (state.day - 1) * 0.08
    : 1 + progress * 0.92 + (state.day - 1) * 0.1;
  const hpScale = baseHpScale * state.difficulty.enemyHpMult;
  const speedScale = (1 + progress * 0.15 + (state.day - 1) * 0.03) * state.difficulty.enemySpeedMult;

  const enemy: EnemyEntity = {
    id: nextId(state, "en"),
    typeId,
    policy: def.policy,
    x,
    z,
    vx: 0,
    vz: 0,
    facingX: 0,
    facingZ: 1,
    hp: def.hp * hpScale,
    maxHp: def.hp * hpScale,
    speed: def.speed * speedScale,
    radius: def.radius,
    boss: Boolean(def.boss),
    elite: Boolean(def.elite),
    bossPhase: 1,
    contactCooldown: 0,
    abilityCooldown: def.boss ? 2.6 : 1.6 + rng() * 2.1,
    aiPhase: "move",
    aiTimer: 0,
    lungeDirX: 0,
    lungeDirZ: 1,
    orbitSign: rng() < 0.5 ? 1 : -1,
    hitFlash: 0,
    slowTimer: 0,
    markedTimer: 0,
    rallyTimer: 0,
    deathTimer: 0,
    knockX: 0,
    knockZ: 0,
    walkPhase: rng() * Math.PI * 2,
    castTimer: 0,
    volleyStep: 0
  };
  moveWithCollisions(enemy, 0, 0, enemy.radius);
  state.enemies.push(enemy);

  if (!def.boss && def.spawnCooldown > 0) {
    state.enemySpawnCooldowns[typeId] = Math.max(
      state.enemySpawnCooldowns[typeId] ?? 0,
      def.spawnCooldown / state.difficulty.spawnRateMult
    );
  }

  if (def.boss) {
    const roomName = getRoomAtPosition(enemy.x, enemy.z).name;
    events.push({
      type: "boss_spawn",
      x: enemy.x,
      z: enemy.z,
      color: def.color,
      portraitId: typeId,
      message: `${def.titleBadge} ${def.name} has arrived in ${roomName}!`
    });
  }
  return enemy;
}

export function spawnPickup(
  state: GameState,
  kind: PickupKind,
  x?: number,
  z?: number,
  rng: () => number = Math.random
): void {
  const pos =
    x !== undefined && z !== undefined && !isPointBlocked(x, z, 0.7)
      ? { x, z }
      : findOpenPoint(0.7, rng, 0, 0);
  state.pickups.push({
    id: nextId(state, "pk"),
    kind,
    x: pos.x,
    z: pos.z,
    radius: 0.65,
    ttl: 24,
    bob: rng() * Math.PI * 2
  });
}

export function spawnFloorHazard(
  state: GameState,
  kind: FloorHazardKind,
  rng: () => number = Math.random
): void {
  if (state.hazards.length >= 5) return;
  const durMult = state.difficulty.hazardDurationMult;
  if (kind === "runaway_chair") {
    const fromLeft = rng() < 0.5;
    const z = clamp(state.player.z + (rng() - 0.5) * 14, -WORLD_BOUNDS.halfD + 4, WORLD_BOUNDS.halfD - 4);
    const x = fromLeft ? -WORLD_BOUNDS.halfW + 2.5 : WORLD_BOUNDS.halfW - 2.5;
    state.hazards.push({
      id: nextId(state, "hz"),
      kind,
      x,
      z,
      vx: fromLeft ? 10.2 : -10.2,
      vz: (rng() - 0.5) * 1.4,
      radius: 0.8,
      elapsed: 0,
      duration: 7.4,
      tickCooldown: 0
    });
    return;
  }

  const pos = findOpenPointInRoom(state.currentRoomId, 2.2, rng);
  state.hazards.push({
    id: nextId(state, "hz"),
    kind,
    x: pos.x,
    z: pos.z,
    vx: 0,
    vz: 0,
    radius: kind === "coffee_spill" ? 2.1 : 1.9,
    elapsed: 0,
    duration: (kind === "coffee_spill" ? 13 : 9) * durMult,
    tickCooldown: 0
  });
}

export function triggerDodgeRoll(
  state: GameState,
  moveX: number,
  moveZ: number,
  events: SimEvent[]
): boolean {
  const p = state.player;
  if (p.dodgeCooldown > 0 || p.dodgeTimer > 0 || state.screen !== "playing") return false;

  const hasMove = Math.hypot(moveX, moveZ) > 0.08;
  const dir = hasMove ? norm2D(moveX, moveZ) : norm2D(p.facingX, p.facingZ);
  p.dodgeDirX = dir.x;
  p.dodgeDirZ = dir.z;
  p.facingX = dir.x;
  p.facingZ = dir.z;
  p.dodgeTimer = 0.24;
  p.dodgeCooldown = p.dodgeMaxCooldown;
  p.invuln = Math.max(p.invuln, 0.38);
  p.squashY = 0.72;

  if (state.meetingLock > 0) {
    state.meetingLock = Math.max(0, state.meetingLock - 0.75);
  }

  addFloater(state, "DODGE", p.x, 2.0, p.z, "#7dd3fc");
  events.push({
    type: "dodge",
    x: p.x,
    z: p.z,
    color: state.employee.palette.accent
  });
  return true;
}

export function triggerSignatureSkill(state: GameState, events: SimEvent[]): boolean {
  const p = state.player;
  if (p.skillCooldown > 0 || state.screen !== "playing") return false;
  if (state.policySilenceTimer > 0.05) {
    addFloater(state, "SILENCED BY HR!", p.x, 2.2, p.z, "#f472b6");
    events.push({
      type: "toast",
      message: "HR Policy Silence active — cleanse at Washrooms or HR Shredder!"
    });
    return false;
  }

  p.skillCooldown = p.skillMaxCooldown;
  p.squashY = 1.2;
  const id = state.employee.id;

  if (id === "junior") {
    p.dashTimer = 0.24;
    p.dashDirX = p.facingX;
    p.dashDirZ = p.facingZ;
    p.invuln = Math.max(p.invuln, 0.5);
    state.meetingLock = 0;
    const radialCount = p.weaponEvolved ? 8 : 6;
    for (let i = 0; i < radialCount; i += 1) {
      const angle = (i / radialCount) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dz = Math.sin(angle);
      state.projectiles.push({
        id: nextId(state, "pr"),
        fromEnemy: false,
        weaponId: state.weapon.id,
        x: p.x + dx * 0.5,
        z: p.z + dz * 0.5,
        vx: dx * p.projectileSpeed * 1.1,
        vz: dz * p.projectileSpeed * 1.1,
        radius: Math.max(0.32, state.weapon.projectileRadius),
        damage: p.productivity * 1.45,
        color: state.weapon.color,
        pierce: p.pierce + 1,
        ricochet: p.ricochet,
        hitIds: new Set<string>(),
        ttl: 0.9,
        crit: true,
        evolved: p.weaponEvolved
      });
    }
    addFloater(state, "HOTFIX SURGE!", p.x, 2.2, p.z, "#5eead4");
  } else if (id === "senior") {
    const novaRadius = p.weaponEvolved ? 7.6 : 6.6;
    state.meetingLock = 0;
    state.trauma = Math.min(1, state.trauma + 0.55);
    state.hitstop = Math.max(state.hitstop, 0.045);
    state.telegraphs.push({
      id: nextId(state, "tg"),
      kind: "shockwave",
      ownerId: "player",
      x: p.x,
      z: p.z,
      dirX: 0,
      dirZ: -1,
      radius: novaRadius,
      length: 0,
      elapsed: 0,
      duration: 0.35,
      resolved: true,
      color: "#f59e0b"
    });
    for (const enemy of state.enemies) {
      if (enemy.aiPhase === "dying") continue;
      const d = dist2D(p.x, p.z, enemy.x, enemy.z);
      if (d <= novaRadius + enemy.radius) {
        const dir = norm2D(enemy.x - p.x, enemy.z - p.z);
        enemy.knockX += dir.x * (enemy.boss ? 5.5 : 13.5);
        enemy.knockZ += dir.z * (enemy.boss ? 5.5 : 13.5);
        damageEnemy(state, enemy, p.productivity * 2.5, true, events);
      }
    }
    addFloater(state, "REFACTOR NOVA!", p.x, 2.2, p.z, "#f59e0b");
  } else if (id === "qa") {
    const fieldRadius = p.weaponEvolved ? 7.0 : 6.2;
    state.telegraphs.push({
      id: nextId(state, "tg"),
      kind: "stasis_field",
      ownerId: "player",
      x: p.x,
      z: p.z,
      dirX: 0,
      dirZ: -1,
      radius: fieldRadius,
      length: 0,
      elapsed: 0,
      duration: 5.0,
      resolved: false,
      color: "#fbbf24"
    });
    for (const enemy of state.enemies) {
      if (enemy.aiPhase === "dying") continue;
      if (dist2D(p.x, p.z, enemy.x, enemy.z) <= fieldRadius + enemy.radius) {
        enemy.slowTimer = Math.max(enemy.slowTimer, 5.0);
        enemy.markedTimer = Math.max(enemy.markedTimer, 5.0);
      }
    }
    addFloater(state, "REGRESSION FREEZE!", p.x, 2.2, p.z, "#fde68a");
  } else {
    p.dashTimer = 0.22;
    p.dashDirX = p.facingX;
    p.dashDirZ = p.facingZ;
    p.invuln = Math.max(p.invuln, 0.45);
    p.energy = Math.min(p.maxEnergy, p.energy + 18);
    p.focus = Math.min(p.maxFocus, p.focus + 16);
    state.drones.push({
      id: nextId(state, "dr"),
      x: p.x + 1.5,
      z: p.z,
      orbitAngle: 0,
      ttl: p.weaponEvolved ? 12.5 : 9.5,
      shootTimer: 0.2
    });
    addFloater(state, "CI/CD DRONE LIVE!", p.x, 2.2, p.z, "#38bdf8");
  }

  events.push({
    type: "skill",
    x: p.x,
    z: p.z,
    color: state.employee.palette.accent,
    weight: 1.0
  });
  return true;
}

function rollPerkChoices(
  state: GameState,
  rng: () => number,
  excludeIds: Set<string> = new Set()
): PerkDef[] {
  const pool = PERK_POOL.filter((p) => !excludeIds.has(p.id));
  const fallbackPool = pool.length >= 3 ? pool : [...PERK_POOL];
  const picks: PerkDef[] = [];

  const evoId = state.employee.weapon.evolutionPerkId;
  if (
    !state.player.weaponEvolved &&
    state.level >= state.employee.weapon.evolutionMinLevel - 1 &&
    !state.claimedPerks[evoId] &&
    !excludeIds.has(evoId)
  ) {
    const evoIdx = fallbackPool.findIndex((p) => p.id === evoId);
    if (evoIdx >= 0 && rng() < 0.72) {
      picks.push(fallbackPool.splice(evoIdx, 1)[0]);
    }
  }

  while (picks.length < 3 && fallbackPool.length > 0) {
    const idx = Math.floor(rng() * fallbackPool.length);
    picks.push(fallbackPool.splice(idx, 1)[0]);
  }
  return picks;
}

export function openQueuedUpgrade(
  state: GameState,
  rng: () => number = Math.random
): boolean {
  if (state.screen !== "playing" || state.pendingLevelUps <= 0) return false;
  state.pendingPerks = rollPerkChoices(state, rng);
  state.screen = "upgrade";
  return true;
}

export function rerollPendingPerks(
  state: GameState,
  rng: () => number = Math.random,
  events: SimEvent[] = []
): boolean {
  if (state.screen !== "upgrade") return false;
  if (state.salary < state.rerollCost) {
    events.push({ type: "toast", message: `Need $${state.rerollCost} run salary to reroll.` });
    return false;
  }
  state.salary -= state.rerollCost;
  state.rerollCost += 10;
  const prev = new Set(state.pendingPerks.map((p) => p.id));
  state.pendingPerks = rollPerkChoices(state, rng, prev);
  return true;
}

function checkWeaponEvolution(state: GameState, events: SimEvent[]): void {
  const p = state.player;
  const classEvo = state.employee.weapon;
  const officeWpn = state.weapon;
  if (p.weaponEvolved) return;
  if (state.level < classEvo.evolutionMinLevel) return;
  if (!(state.claimedPerks[classEvo.evolutionPerkId] > 0)) return;

  p.weaponEvolved = true;
  if (state.employee.id === "senior") {
    p.pierce += 2;
    p.projectileSpeed *= 1.2;
  } else if (state.employee.id === "qa") {
    p.ricochet += 2;
    p.crit = Math.min(0.92, p.crit + 0.12);
  } else if (state.employee.id === "junior") {
    p.pierce += 1;
    p.fireRate *= 1.12;
  } else if (state.employee.id === "devops") {
    p.productivity *= 1.15;
  }

  if (!state.runAchievements.includes("Weapon Evolved")) {
    state.runAchievements.push("Weapon Evolved");
  }
  addFloater(state, `EVOLVED: ${officeWpn.evolvedName.toUpperCase()}!`, p.x, 2.7, p.z, "#fbbf24");
  events.push({
    type: "evolve",
    x: p.x,
    z: p.z,
    color: "#fbbf24",
    message: `Weapon Evolved into ${officeWpn.evolvedName}!`
  });
}

export function applyPerk(
  state: GameState,
  perkId: string,
  events: SimEvent[] = [],
  rng: () => number = Math.random
): boolean {
  const perk = PERK_POOL.find((entry) => entry.id === perkId);
  if (!perk) return false;
  const p = state.player;
  state.claimedPerks[perk.id] = (state.claimedPerks[perk.id] || 0) + 1;

  switch (perk.id) {
    case "mech_keyboard":
      p.productivity *= 1.2;
      break;
    case "fast_ci":
      p.fireRate *= 1.22;
      break;
    case "ultrawide":
      p.range *= 1.22;
      p.projectileSpeed *= 1.2;
      break;
    case "anc_headphones":
      p.meetingResist *= 1.38;
      break;
    case "standing_desk":
      p.maxEnergy += 28;
      p.energy = Math.min(p.maxEnergy, p.energy + 28);
      break;
    case "rubber_duck":
      p.crit = Math.min(0.85, p.crit + 0.16);
      break;
    case "extra_ram":
      p.pierce += 1;
      break;
    case "espresso_iv":
      p.coffeeBoost += 0.35;
      state.stationCooldowns.espresso = Math.max(0, state.stationCooldowns.espresso - 8);
      state.espressoCooldown = state.stationCooldowns.espresso;
      break;
    case "sticky_flow":
      p.speed *= 1.12;
      p.dodgeMaxCooldown = Math.max(1.2, p.dodgeMaxCooldown * 0.85);
      p.focusRecovery += 0.25;
      break;
    case "desk_monstera":
      p.regen += 1.4;
      break;
    case "wingman_drone":
      p.skillMaxCooldown *= 0.85;
      state.drones.push({
        id: nextId(state, "dr"),
        x: p.x + 1.6,
        z: p.z,
        orbitAngle: Math.PI,
        ttl: 25,
        shootTimer: 0.25
      });
      break;
    case "dark_mode":
      p.happiness = Math.min(160, p.happiness + 18);
      p.productivity *= 1.1;
      break;
  }

  checkWeaponEvolution(state, events);

  state.pendingLevelUps = Math.max(0, state.pendingLevelUps - 1);
  if (state.pendingLevelUps > 0) {
    state.pendingPerks = rollPerkChoices(state, rng);
    state.screen = "upgrade";
  } else {
    state.pendingPerks = [];
    state.screen = "playing";
  }

  events.push({
    type: "toast",
    message: `${perk.name} equipped.`
  });
  return true;
}

export function resolveDilemma(
  state: GameState,
  choiceId: string,
  events: SimEvent[] = []
): DilemmaChoice | null {
  if (!state.activeDilemma) return null;
  const choice = state.activeDilemma.choices.find((c) => c.id === choiceId);
  if (!choice) return null;

  const p = state.player;
  const fx = choice.effects;
  if (fx.energy) p.energy = clamp(p.energy + fx.energy, 1, p.maxEnergy);
  if (fx.focus) p.focus = clamp(p.focus + fx.focus, 12, p.maxFocus);
  if (fx.happiness) p.happiness = clamp(p.happiness + fx.happiness, 20, 160);
  if (fx.salary) state.salary += fx.salary;
  if (fx.productivityBonus) p.productivity += fx.productivityBonus;
  if (fx.achievement && !state.runAchievements.includes(fx.achievement)) {
    state.runAchievements.push(fx.achievement);
  }

  state.activeDilemma = null;
  state.screen = "playing";
  events.push({
    type: "toast",
    message: choice.outcomeText
  });
  return choice;
}

function grantXp(state: GameState, amount: number, events: SimEvent[]): void {
  const whiteboardMult = state.whiteboardBuffTimer > 0 ? 1.25 : 1.0;
  state.xp += amount * state.player.xpRate * whiteboardMult;

  let leveled = false;
  while (state.xp >= state.xpNeeded) {
    state.xp -= state.xpNeeded;
    state.level += 1;
    state.xpNeeded = Math.floor(state.xpNeeded * 1.42 + 42);
    state.pendingLevelUps += 1;
    leveled = true;

    if (state.employee.id === "junior") {
      state.player.skillCooldown = Math.max(0, state.player.skillCooldown - 2.5);
    }
    checkWeaponEvolution(state, events);
  }

  if (leveled) {
    addFloater(
      state,
      `LEVEL ${state.level} READY!`,
      state.player.x,
      2.5,
      state.player.z,
      "#28b89d"
    );
    events.push({
      type: "level_up",
      x: state.player.x,
      z: state.player.z,
      color: "#28b89d"
    });
  }
}

export function damageEnemy(
  state: GameState,
  enemy: EnemyEntity,
  amount: number,
  isCrit: boolean,
  events: SimEvent[],
  rng: () => number = Math.random,
  options?: SimOptions,
  shotDirX?: number,
  shotDirZ?: number,
  ignoreShield = false
): void {
  if (enemy.aiPhase === "dying") return;
  const def = ENEMY_ARCHETYPES[enemy.typeId];

  // IT Auditor Directional Firewall Shield blocks 65% of non-piercing frontal damage
  let finalAmount = amount;
  let blocked = false;
  if (
    def.shielded &&
    !ignoreShield &&
    shotDirX !== undefined &&
    shotDirZ !== undefined
  ) {
    const dot = shotDirX * enemy.facingX + shotDirZ * enemy.facingZ;
    if (dot < -0.25) {
      finalAmount *= 0.35;
      blocked = true;
    }
  }

  enemy.hp -= finalAmount;
  enemy.hitFlash = 0.08;

  addFloater(
    state,
    blocked
      ? `BLOCKED ${Math.round(finalAmount)}`
      : isCrit
      ? `${Math.round(finalAmount)}!`
      : `${Math.round(finalAmount)}`,
    enemy.x,
    enemy.boss ? 2.95 : 1.75,
    enemy.z,
    blocked ? "#38bdf8" : isCrit ? "#fbbf24" : "#f8fafc",
    true
  );

  events.push({
    type: isCrit && !blocked ? "crit" : "hit",
    x: enemy.x,
    z: enemy.z,
    color: blocked ? "#38bdf8" : isCrit ? "#fbbf24" : def.color,
    weight: isCrit ? 0.8 : 0.35
  });

  // Boss Phase II Enrage driven by selected difficulty threshold
  const phaseThreshold = state.difficulty.bossPhaseThreshold;
  if (enemy.boss && enemy.bossPhase === 1 && enemy.hp > 0 && enemy.hp <= enemy.maxHp * phaseThreshold) {
    enemy.bossPhase = 2;
    enemy.speed *= 1.18;
    enemy.abilityCooldown = 0.8;
    state.trauma = Math.min(1, state.trauma + 0.5);
    addFloater(state, "PHASE II ENRAGE!", enemy.x, 3.3, enemy.z, "#ef4444");
    events.push({
      type: "boss_phase",
      x: enemy.x,
      z: enemy.z,
      color: "#ef4444",
      portraitId: enemy.typeId,
      message: `${def.titleBadge} ${def.name} enters Phase II — watch for executive directives!`
    });
    events.push({
      type: "comms",
      speaker: def.name,
      role: def.titleBadge,
      portraitId: enemy.typeId,
      avatarColor: "#ef4444",
      message: "Let's double-click on this synergy and take your headcount offline—permanently."
    });
  }

  if (enemy.hp <= 0) {
    defeatEnemy(state, enemy, events, rng, options);
  }
}

function defeatEnemy(
  state: GameState,
  enemy: EnemyEntity,
  events: SimEvent[],
  rng: () => number,
  options?: SimOptions
): void {
  const def = ENEMY_ARCHETYPES[enemy.typeId];
  const p = state.player;
  enemy.aiPhase = "dying";
  enemy.deathTimer = 0.36;
  enemy.hp = 0;

  state.kills += 1;
  state.combo += 1;
  state.comboTimer = 4.8;
  state.maxCombo = Math.max(state.maxCombo, state.combo);

  const flowMult = getFlowMultiplier(state.combo);
  const bugBonus = enemy.typeId === "bug" ? p.bugBonus : 1;
  const cfoMult = state.salaryBoostTimer > 0 ? 2.0 : 1.0;
  const salaryGain = Math.round(
    def.salary * (1 + (flowMult - 1) * 0.25) * bugBonus * state.difficulty.salaryMult * cfoMult
  );
  state.salary += salaryGain;

  if (options?.hitstopEnabled !== false) {
    state.hitstop = Math.max(state.hitstop, enemy.boss ? 0.075 : enemy.elite ? 0.04 : 0.026);
  }
  state.trauma = Math.min(1, state.trauma + (enemy.boss ? 0.72 : enemy.elite ? 0.32 : 0.18));

  addFloater(state, `+$${salaryGain}`, enemy.x, enemy.boss ? 3.3 : 2.15, enemy.z, "#4ade80");

  events.push({
    type: "kill",
    x: enemy.x,
    z: enemy.z,
    color: def.color,
    weight: enemy.boss ? 1.4 : enemy.elite ? 1.0 : 0.7
  });

  if (enemy.boss) {
    grantXp(state, def.xp * bugBonus, events);
    state.defeatedBosses.add(enemy.typeId);
    spawnPickup(state, "pizza", enemy.x, enemy.z, rng);
    events.push({
      type: "toast",
      message: `${def.titleBadge} ${def.name} cleared! Floor ${state.chapter.floorNumber} breathes again.`
    });
  } else {
    if (state.xpOrbs.length > 56) {
      const oldest = state.xpOrbs.shift();
      if (oldest) grantXp(state, oldest.xp, events);
    }
    state.xpOrbs.push({
      id: nextId(state, "orb"),
      x: enemy.x,
      z: enemy.z,
      xp: def.xp * bugBonus,
      salary: Math.max(1, Math.round(def.salary * 0.22 * cfoMult)),
      ttl: 20,
      bob: rng() * Math.PI * 2,
      color: def.rankTier >= 3 ? "#fbbf24" : def.rankTier === 2 ? "#38bdf8" : "#28b89d"
    });

    const dropChance = enemy.elite ? 0.35 : 0.13;
    if (rng() < dropChance) {
      const kind: PickupKind =
        state.chapter.weekday === "Friday" && rng() < 0.35
          ? "pizza"
          : rng() < 0.25
          ? "donut"
          : "coffee";
      spawnPickup(state, kind, enemy.x, enemy.z, rng);
    }
  }
}

function damagePlayer(
  state: GameState,
  energyDmg: number,
  focusDmg: number,
  happinessDmg: number,
  callout: string,
  color: string,
  events: SimEvent[],
  options?: SimOptions
): void {
  const p = state.player;
  if (p.invuln > 0) return;

  let scaledEnergy = energyDmg * state.difficulty.enemyDamageMult;
  if (p.moraleShield > 0 && scaledEnergy > 0) {
    const absorbed = Math.min(p.moraleShield, scaledEnergy);
    p.moraleShield -= absorbed;
    scaledEnergy -= absorbed;
    if (scaledEnergy <= 0.1) {
      p.invuln = 0.55;
      p.squashY = 0.88;
      addFloater(state, "SHIELDED!", p.x, 2.35, p.z, "#4ade80");
      events.push({ type: "hit", x: p.x, z: p.z, color: "#4ade80", weight: 0.4 });
      return;
    }
  }

  p.energy = Math.max(0, p.energy - scaledEnergy);
  p.focus = Math.max(10, p.focus - focusDmg);
  p.happiness = Math.max(20, p.happiness - happinessDmg);
  p.invuln = 0.62;
  p.hitFlash = 0.16;
  p.squashY = 0.8;
  state.combo = 0;
  state.comboTimer = 0;
  if (options?.hitstopEnabled !== false) {
    state.hitstop = Math.max(state.hitstop, 0.045);
  }
  state.trauma = Math.min(1, state.trauma + 0.5);

  addFloater(state, callout, p.x, 2.35, p.z, color);
  events.push({
    type: "player_hit",
    x: p.x,
    z: p.z,
    color,
    weight: 0.9
  });
}

function finalizeRun(state: GameState, save: SaveData, won: boolean, events: SimEvent[]): void {
  state.screen = "gameover";
  const happinessBonus = Math.max(0.7, state.player.happiness / 100);
  const clearBonus = won ? Math.round((190 + state.day * 40) * state.difficulty.salaryMult) : 0;
  const salaryEarned = Math.floor((state.salary + clearBonus) * happinessBonus);

  save.bank += salaryEarned;
  save.bestSalaryRun = Math.max(save.bestSalaryRun, salaryEarned);
  if (won) {
    save.highestDayCleared = Math.max(save.highestDayCleared, state.day);
    save.day = Math.max(save.day, Math.min(STORY_CHAPTERS.length, state.day + 1));
    save.selectedDay = Math.min(STORY_CHAPTERS.length, state.day + 1);
    const prevBest = save.floorBestDifficulty[state.day];
    if (!prevBest || DIFFICULTY_RANK[state.difficulty.id] > DIFFICULTY_RANK[prevBest]) {
      save.floorBestDifficulty[state.day] = state.difficulty.id;
    }
  }

  const unlocked = [...state.runAchievements];
  if (won && state.day === 1) unlocked.push("Cleared Floor 12");
  if (won && state.day === 5) unlocked.push("Penthouse Executive");
  if (won && state.difficulty.id === "crunch") unlocked.push("Crunch Time Survivor");
  if (won && state.difficulty.id === "nightmare") unlocked.push("Nightmare Survivor");
  if (state.maxCombo >= 15) unlocked.push("Flow State Architect");
  if (state.meetingsEndured >= 5) unlocked.push("Calendar Survivor");
  if (state.defeatedBosses.size >= 2) unlocked.push("C-Suite Slayer");
  if (unlocked.length === 0) unlocked.push("Badged In");

  const uniqueAchievements = Array.from(new Set(unlocked));
  for (const name of uniqueAchievements) {
    save.achievements[name] = true;
  }

  const epilogue = won
    ? state.day === 5
      ? `Floor ${state.chapter.floorNumber} Executive Penthouse conquered on ${state.difficulty.label}! ${state.employee.characterName} ships Project Phoenix as the boardroom erupts in applause.`
      : `${state.employee.characterName} clears Floor ${state.chapter.floorNumber} (${state.chapter.department}) on ${state.difficulty.label}. The elevator chimes for the next wing.`
    : `${state.employee.characterName} hits full burnout on Floor ${state.chapter.floorNumber} at ${formatWorkClock(
        state.elapsed,
        state.dayLength
      )}. Invest your $${salaryEarned} paycheck in upgrades before clocking back in.`;

  state.summary = {
    won,
    day: state.day,
    floorNumber: state.chapter.floorNumber,
    department: state.chapter.department,
    difficulty: state.difficulty.id,
    chapterTitle: state.chapter.title,
    weekday: state.chapter.weekday,
    employeeName: state.employee.characterName,
    roleTitle: state.employee.roleTitle,
    weaponName: state.player.weaponEvolved ? state.weapon.evolvedName : state.weapon.name,
    weaponEvolved: state.player.weaponEvolved,
    salaryEarned,
    kills: state.kills,
    levelReached: state.level,
    maxCombo: state.maxCombo,
    bossesDefeated: state.defeatedBosses.size,
    elapsedSeconds: state.elapsed,
    achievementsUnlocked: uniqueAchievements,
    epilogue
  };

  events.push({
    type: won ? "victory" : "defeat",
    x: state.player.x,
    z: state.player.z,
    message: epilogue
  });
}

function countActiveTelegraphs(state: GameState): number {
  return state.telegraphs.filter((t) => t.ownerId !== "player" && !t.resolved).length;
}

export function countLivingByTier(state: GameState): {
  total: number;
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
} {
  let total = 0;
  let tier1 = 0;
  let tier2 = 0;
  let tier3 = 0;
  let tier4 = 0;
  for (const e of state.enemies) {
    if (e.aiPhase === "dying") continue;
    total += 1;
    const tier = ENEMY_ARCHETYPES[e.typeId].rankTier;
    if (tier === 1) tier1 += 1;
    else if (tier === 2) tier2 += 1;
    else if (tier === 3) tier3 += 1;
    else tier4 += 1;
  }
  return { total, tier1, tier2, tier3, tier4 };
}

export function getSpawnCaps(state: GameState): {
  totalCap: number;
  tier2Cap: number;
  tier3Cap: number;
} {
  const progress = clamp(state.elapsed / state.dayLength, 0, 1);
  const diffId = state.difficulty.id;
  const heavyBonus = diffId === "nightmare" ? 1 : 0;
  const totalBase = 7 + Math.floor(progress * 9) + Math.min(3, state.day - 1);
  const totalCap = clamp(Math.round(totalBase * state.difficulty.spawnRateMult), 6, 24);
  const tier2Cap = (progress < 0.45 ? 2 : 3) + heavyBonus;
  const tier3Cap = (progress < 0.65 ? 1 : 2) + (diffId === "crunch" || diffId === "nightmare" ? 1 : 0);
  return { totalCap, tier2Cap, tier3Cap };
}

function pickWeightedEnemy(
  candidates: EnemyTypeId[],
  cooldowns: Partial<Record<EnemyTypeId, number>>,
  rng: () => number
): EnemyTypeId {
  const ready = candidates.filter((id) => (cooldowns[id] ?? 0) <= 0);
  const pool = ready.length > 0 ? ready : candidates;
  let totalWeight = 0;
  for (const id of pool) {
    totalWeight += Math.max(0.1, ENEMY_ARCHETYPES[id].spawnWeight || 1);
  }
  let target = rng() * totalWeight;
  for (const id of pool) {
    target -= Math.max(0.1, ENEMY_ARCHETYPES[id].spawnWeight || 1);
    if (target <= 0) return id;
  }
  return pool[pool.length - 1];
}

export function pickEnemyArchetype(state: GameState, rng: () => number): EnemyTypeId {
  const t = state.elapsed / state.dayLength;
  const allowed = state.chapter.allowedEnemies;
  const tier1 = allowed.filter((id) => ENEMY_ARCHETYPES[id].rankTier === 1);
  const tier2 = allowed.filter((id) => ENEMY_ARCHETYPES[id].rankTier === 2);
  const tier3 = allowed.filter((id) => ENEMY_ARCHETYPES[id].rankTier === 3);

  const counts = countLivingByTier(state);
  const caps = getSpawnCaps(state);

  const readyTier3 = tier3.filter((id) => (state.enemySpawnCooldowns[id] ?? 0) <= 0);
  const readyTier2 = tier2.filter((id) => (state.enemySpawnCooldowns[id] ?? 0) <= 0);

  const canSpawnTier3 = readyTier3.length > 0 && t > 0.34 && counts.tier3 < caps.tier3Cap;
  const canSpawnTier2 = readyTier2.length > 0 && t > 0.14 && counts.tier2 < caps.tier2Cap;

  const roll = rng();
  const eliteChance = canSpawnTier3
    ? 0.065 + (state.difficulty.id === "nightmare" ? 0.045 : state.difficulty.id === "crunch" ? 0.025 : 0)
    : 0;
  const leadChance = canSpawnTier2 ? (t > 0.35 ? 0.17 : 0.11) : 0;

  if (canSpawnTier3 && roll < eliteChance) {
    return pickWeightedEnemy(readyTier3, state.enemySpawnCooldowns, rng);
  }
  if (canSpawnTier2 && roll < eliteChance + leadChance) {
    return pickWeightedEnemy(readyTier2, state.enemySpawnCooldowns, rng);
  }
  if (tier1.length > 0) {
    return pickWeightedEnemy(tier1, state.enemySpawnCooldowns, rng);
  }
  return pickWeightedEnemy(allowed, state.enemySpawnCooldowns, rng) || "email";
}

function spawnTacticalSquad(state: GameState, rng: () => number, events: SimEvent[]): void {
  const counts = countLivingByTier(state);
  const caps = getSpawnCaps(state);
  if (counts.total > Math.max(6, caps.totalCap - 3)) return;

  const t = state.elapsed / state.dayLength;
  const allowed = new Set(state.chapter.allowedEnemies);
  const anchor = findOpenPointInRoom(state.chapter.focusRoomId, 1.4, rng);

  const squadRoll = rng();
  if (t > 0.48 && counts.tier3 < caps.tier3Cap && allowed.has("senior_manager") && squadRoll < 0.3) {
    spawnEnemy(state, "senior_manager", rng, events, { x: anchor.x, z: anchor.z });
    spawnEnemy(state, "intern", rng, events, { x: anchor.x - 1.5, z: anchor.z + 0.9 });
    spawnEnemy(state, "analyst", rng, events, { x: anchor.x + 1.5, z: anchor.z - 0.9 });
    events.push({ type: "toast", message: "Squad Alert: Senior Manager + Junior Escort deployed!" });
  } else if (t > 0.38 && counts.tier3 < caps.tier3Cap && allowed.has("hr_director") && squadRoll < 0.5) {
    spawnEnemy(state, "hr_director", rng, events, { x: anchor.x, z: anchor.z });
    spawnEnemy(state, "intern", rng, events, { x: anchor.x - 1.4, z: anchor.z });
    spawnEnemy(state, "email", rng, events, { x: anchor.x + 1.4, z: anchor.z });
    events.push({ type: "toast", message: "Squad Alert: HR Director compliance sweep inbound!" });
  } else if (counts.tier2 < caps.tier2Cap && allowed.has("tech_lead") && squadRoll < 0.78) {
    spawnEnemy(state, "tech_lead", rng, events, { x: anchor.x, z: anchor.z });
    spawnEnemy(state, "intern", rng, events, { x: anchor.x - 1.3, z: anchor.z });
    spawnEnemy(state, "bug", rng, events, { x: anchor.x + 1.3, z: anchor.z });
    events.push({ type: "toast", message: "Squad Alert: Tech Lead rallying a sprint team!" });
  } else {
    const leader: EnemyTypeId =
      counts.tier3 < caps.tier3Cap && allowed.has("manager")
        ? "manager"
        : counts.tier2 < caps.tier2Cap && allowed.has("product_lead")
        ? "product_lead"
        : "analyst";
    spawnEnemy(state, leader, rng, events, { x: anchor.x, z: anchor.z });
    spawnEnemy(state, "email", rng, events, { x: anchor.x - 1.2, z: anchor.z + 0.8 });
    spawnEnemy(state, "intern", rng, events, { x: anchor.x + 1.2, z: anchor.z - 0.8 });
    events.push({ type: "toast", message: "Squad Alert: Department patrol inbound!" });
  }
}

function firePlayerShot(
  state: GameState,
  input: InputSnapshot,
  rng: () => number,
  events: SimEvent[]
): void {
  const p = state.player;
  let dirX = 0;
  let dirZ = 0;
  let targetEnemy: EnemyEntity | null = null;

  const useManualDir = input.aimMode === "manual" || input.aimActive;
  if (useManualDir && input.aimActive) {
    const dir = norm2D(input.aimWorldX - p.x, input.aimWorldZ - p.z);
    dirX = dir.x;
    dirZ = dir.z;
    for (const enemy of state.enemies) {
      if (enemy.aiPhase === "dying") continue;
      if (dist2D(enemy.x, enemy.z, input.aimWorldX, input.aimWorldZ) < 2.2) {
        targetEnemy = enemy;
        break;
      }
    }
  } else if (input.aimMode === "manual") {
    if (state.enemies.every((e) => e.aiPhase === "dying")) return;
    dirX = p.facingX;
    dirZ = p.facingZ;
  } else {
    let best = Infinity;
    for (const enemy of state.enemies) {
      if (enemy.aiPhase === "dying") continue;
      const d = dist2D(p.x, p.z, enemy.x, enemy.z);
      if (d < p.range && d < best) {
        best = d;
        targetEnemy = enemy;
      }
    }
    if (!targetEnemy) return;
    const dir = norm2D(targetEnemy.x - p.x, targetEnemy.z - p.z);
    dirX = dir.x;
    dirZ = dir.z;
  }

  p.facingX = dirX;
  p.facingZ = dirZ;
  p.attackFlash = 0.14;

  const isCrit = (targetEnemy !== null && targetEnemy.markedTimer > 0) || rng() < p.crit;
  const flowBoost = 1 + (getFlowMultiplier(state.combo) - 1) * 0.18;
  const baseAngle = Math.atan2(dirZ, dirX);
  const wpn = state.weapon;
  const evolved = p.weaponEvolved;
  const count = evolved ? wpn.evolvedCount : wpn.projectileCount;
  const dmgScale = wpn.damageMult * (evolved ? 1.22 : 1.0);
  const speedMult = evolved ? 1.12 : 1.0;
  const radius = wpn.projectileRadius * (evolved ? 1.15 : 1.0);
  const splashRadius =
    wpn.splashRadius > 0
      ? wpn.splashRadius * (evolved ? 1.32 : 1.0)
      : wpn.id === "tape" && evolved
      ? 2.4
      : 0;
  const slowDuration = wpn.slowDuration > 0 ? wpn.slowDuration * (evolved ? 1.25 : 1.0) : 0;
  const markDuration = wpn.markDuration > 0 ? wpn.markDuration * (evolved ? 1.4 : 1.0) : 0;
  const extraPierce = evolved && (wpn.id === "stapler" || wpn.id === "keyboard" || wpn.id === "monitor") ? 1 : 0;
  const extraRicochet = evolved && (wpn.id === "mouse" || wpn.id === "phone") ? 1 : 0;
  const critMult = state.employee.id === "qa" ? (evolved ? 2.35 : 2.15) : 2.0;

  const keycapColors = ["#38bdf8", "#a855f7", "#f59e0b", "#34d399", "#f43f5e", "#facc15"];

  for (let i = 0; i < count; i += 1) {
    const frac = count === 1 ? 0 : i / (count - 1) - 0.5;
    const angleOffset = frac * wpn.spreadRad;
    const lateralOffset = count === 2 && wpn.spreadRad <= 0.14 ? frac * 0.34 : 0;
    const a = baseAngle + angleOffset;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const perpX = -dz;
    const perpZ = dx;
    const shotColor =
      wpn.id === "keyboard"
        ? keycapColors[i % keycapColors.length]
        : isCrit
        ? "#fbbf24"
        : evolved
        ? wpn.accentColor
        : wpn.color;

    state.projectiles.push({
      id: nextId(state, "pr"),
      fromEnemy: false,
      weaponId: wpn.id,
      x: p.x + dx * 0.65 + perpX * lateralOffset,
      z: p.z + dz * 0.65 + perpZ * lateralOffset,
      vx: dx * p.projectileSpeed * speedMult,
      vz: dz * p.projectileSpeed * speedMult,
      radius,
      damage: p.productivity * flowBoost * dmgScale * (isCrit ? critMult : 1.0),
      color: shotColor,
      pierce: p.pierce + extraPierce,
      ricochet: p.ricochet + extraRicochet,
      hitIds: new Set<string>(),
      ttl: wpn.id === "keyboard" ? 0.68 : 1.02,
      crit: isCrit,
      evolved,
      splashRadius: splashRadius > 0 ? splashRadius : undefined,
      slowDuration: slowDuration > 0 ? slowDuration : undefined,
      markDuration: markDuration > 0 ? markDuration : undefined,
      knockScale: wpn.knockScale * (evolved ? 1.15 : 1.0)
    });
  }

  events.push({
    type: "shoot",
    x: p.x,
    z: p.z,
    color: wpn.color,
    weight: wpn.id === "monitor" ? 0.72 : isCrit ? 0.55 : 0.25
  });
}

function updateRoomStations(
  state: GameState,
  dt: number,
  rng: () => number,
  events: SimEvent[],
  options?: SimOptions
): void {
  const p = state.player;
  const cds = state.stationCooldowns;

  // 1) Cafeteria Espresso Bar: Heal Energy + Focus + 6s Haste
  if (cds.espresso <= 0 && dist2D(p.x, p.z, ESPRESSO_STATION.x, ESPRESSO_STATION.z) <= ESPRESSO_STATION.radius) {
    const heal = 30 * (1 + p.coffeeBoost);
    p.energy = Math.min(p.maxEnergy, p.energy + heal);
    p.focus = Math.min(p.maxFocus, p.focus + 22);
    state.hasteTimer = Math.max(state.hasteTimer, 6.0);
    cds.espresso = ESPRESSO_STATION.cooldown;
    addFloater(state, "DOUBLE ESPRESSO + HASTE!", p.x, 2.35, p.z, "#f59e0b");
    events.push({
      type: "pickup",
      x: ESPRESSO_STATION.x,
      z: ESPRESSO_STATION.z,
      color: "#f59e0b"
    });
  }

  // 2) Executive Boardroom Sprint Whiteboard: +28% Fire Rate & +25% XP for 12s
  if (cds.whiteboard <= 0 && dist2D(p.x, p.z, WHITEBOARD_STATION.x, WHITEBOARD_STATION.z) <= WHITEBOARD_STATION.radius) {
    state.whiteboardBuffTimer = 12;
    cds.whiteboard = WHITEBOARD_STATION.cooldown;
    p.focus = Math.min(p.maxFocus, p.focus + 22);
    addFloater(state, "SPRINT FOCUS AURA!", WHITEBOARD_STATION.x, 2.45, WHITEBOARD_STATION.z, "#38bdf8");
    events.push({
      type: "station_buff",
      x: WHITEBOARD_STATION.x,
      z: WHITEBOARD_STATION.z,
      color: "#38bdf8",
      message: "Boardroom Whiteboard: +28% Fire Rate & +25% XP for 12s!"
    });
  }

  // 3) Engineering Bullpen Turbo Printer Hub: Paper-Jam shockwave + $35
  if (cds.printer <= 0 && dist2D(p.x, p.z, PRINTER_STATION.x, PRINTER_STATION.z) <= PRINTER_STATION.radius) {
    cds.printer = PRINTER_STATION.cooldown;
    const blastRadius = 8.2;
    state.salary += 35;
    state.trauma = Math.min(1, state.trauma + 0.35);
    state.telegraphs.push({
      id: nextId(state, "tg"),
      kind: "shockwave",
      ownerId: "player",
      x: PRINTER_STATION.x,
      z: PRINTER_STATION.z,
      dirX: 0,
      dirZ: -1,
      radius: blastRadius,
      length: 0,
      elapsed: 0,
      duration: 0.38,
      resolved: true,
      color: "#a78bfa"
    });
    for (const enemy of state.enemies) {
      if (enemy.aiPhase === "dying") continue;
      if (dist2D(PRINTER_STATION.x, PRINTER_STATION.z, enemy.x, enemy.z) <= blastRadius + enemy.radius) {
        const dir = norm2D(enemy.x - PRINTER_STATION.x, enemy.z - PRINTER_STATION.z);
        enemy.knockX += dir.x * (enemy.boss ? 5.5 : 14);
        enemy.knockZ += dir.z * (enemy.boss ? 5.5 : 14);
        damageEnemy(state, enemy, p.productivity * 2.1, false, events, rng, options, undefined, undefined, true);
      }
    }
    addFloater(state, "PRINTER SURGE +$35!", PRINTER_STATION.x, 2.45, PRINTER_STATION.z, "#a78bfa");
    events.push({
      type: "station_buff",
      x: PRINTER_STATION.x,
      z: PRINTER_STATION.z,
      color: "#a78bfa",
      message: "Bullpen Printer Surge blasted nearby threats & printed +$35!"
    });
  }

  // 4) IT Room Core Server Console: Outage Reboot (+$55) OR EMP Stun Pulse
  if (dist2D(p.x, p.z, SERVER_STATION.x, SERVER_STATION.z) <= SERVER_STATION.radius) {
    if (state.outage > 0) {
      state.serverRebootProgress += dt;
      if (state.serverRebootProgress >= 1.0) {
        state.outage = 0;
        state.serverRebootProgress = 0;
        state.salary += 55;
        grantXp(state, 42, events);
        addFloater(state, "CLUSTER REBOOTED +$55", SERVER_STATION.x, 2.5, SERVER_STATION.z, "#38bdf8");
        events.push({
          type: "outage_clear",
          x: SERVER_STATION.x,
          z: SERVER_STATION.z,
          color: "#38bdf8",
          message: "IT Server Rack rebooted! Network restored (+$55 bonus)."
        });
      }
    } else if (cds.server <= 0) {
      cds.server = SERVER_STATION.cooldown;
      const empRadius = 11.5;
      state.telegraphs.push({
        id: nextId(state, "tg"),
        kind: "shockwave",
        ownerId: "player",
        x: SERVER_STATION.x,
        z: SERVER_STATION.z,
        dirX: 0,
        dirZ: -1,
        radius: empRadius,
        length: 0,
        elapsed: 0,
        duration: 0.42,
        resolved: true,
        color: "#38bdf8"
      });
      for (const enemy of state.enemies) {
        if (enemy.aiPhase === "dying") continue;
        if (dist2D(SERVER_STATION.x, SERVER_STATION.z, enemy.x, enemy.z) <= empRadius + enemy.radius) {
          enemy.slowTimer = Math.max(enemy.slowTimer, 4.0);
          damageEnemy(state, enemy, p.productivity * 1.35, false, events, rng, options, undefined, undefined, true);
        }
      }
      addFloater(state, "IT EMP PULSE!", SERVER_STATION.x, 2.5, SERVER_STATION.z, "#38bdf8");
      events.push({
        type: "station_buff",
        x: SERVER_STATION.x,
        z: SERVER_STATION.z,
        color: "#38bdf8",
        message: "IT Console EMP stunned and slowed nearby threats!"
      });
    }
  } else {
    state.serverRebootProgress = Math.max(0, state.serverRebootProgress - dt * 1.5);
  }

  // 5) Washrooms Freshen-Up Vanity: +32 Focus, cleanse HR silence & Meeting lock, +5s Haste
  if (cds.washroom <= 0 && dist2D(p.x, p.z, WASHROOM_STATION.x, WASHROOM_STATION.z) <= WASHROOM_STATION.radius) {
    cds.washroom = WASHROOM_STATION.cooldown;
    p.focus = Math.min(p.maxFocus, p.focus + 32);
    state.policySilenceTimer = 0;
    state.meetingLock = 0;
    state.hasteTimer = Math.max(state.hasteTimer, 5.0);
    addFloater(state, "FRESHENED UP! CLEANSED", WASHROOM_STATION.x, 2.4, WASHROOM_STATION.z, "#67e8f9");
    events.push({
      type: "station_buff",
      x: WASHROOM_STATION.x,
      z: WASHROOM_STATION.z,
      color: "#67e8f9",
      message: "Washroom Splash: Focus restored, debuffs cleansed & +5s Haste!"
    });
  }

  // 6) Casual Lounge Nap Pod: +20 Happiness, +24 Morale Shield, +18 Energy
  if (cds.lounge <= 0 && dist2D(p.x, p.z, LOUNGE_STATION.x, LOUNGE_STATION.z) <= LOUNGE_STATION.radius) {
    cds.lounge = LOUNGE_STATION.cooldown;
    p.happiness = Math.min(160, p.happiness + 20);
    p.moraleShield = Math.min(48, p.moraleShield + 24);
    p.energy = Math.min(p.maxEnergy, p.energy + 18);
    addFloater(state, "POWER NAP! +SHIELD", LOUNGE_STATION.x, 2.4, LOUNGE_STATION.z, "#4ade80");
    events.push({
      type: "station_buff",
      x: LOUNGE_STATION.x,
      z: LOUNGE_STATION.z,
      color: "#4ade80",
      message: "Casual Lounge Power Nap: +24 Morale Shield, +18 Energy & +20% Happiness!"
    });
  }

  // 7) HR Office Policy Shredder: Cleanse Policy Silence & Meeting Lock + Reset Signature Skill Cooldown
  if (cds.hr_shredder <= 0 && dist2D(p.x, p.z, HR_SHREDDER_STATION.x, HR_SHREDDER_STATION.z) <= HR_SHREDDER_STATION.radius) {
    cds.hr_shredder = HR_SHREDDER_STATION.cooldown;
    state.policySilenceTimer = 0;
    state.meetingLock = 0;
    p.skillCooldown = 0;
    addFloater(state, "MEMOS SHREDDED! SKILL READY", HR_SHREDDER_STATION.x, 2.45, HR_SHREDDER_STATION.z, "#c084fc");
    events.push({
      type: "station_buff",
      x: HR_SHREDDER_STATION.x,
      z: HR_SHREDDER_STATION.z,
      color: "#c084fc",
      message: "HR Policy Shredder cleared debuffs and reset your Signature Skill!"
    });
  }

  // 8) CFO Suite Audit Terminal: 14s 2x Salary Surge + Vacuum all XP Orbs on floor
  if (cds.cfo_terminal <= 0 && dist2D(p.x, p.z, CFO_TERMINAL_STATION.x, CFO_TERMINAL_STATION.z) <= CFO_TERMINAL_STATION.radius) {
    cds.cfo_terminal = CFO_TERMINAL_STATION.cooldown;
    state.salaryBoostTimer = 14.0;
    let pulled = 0;
    for (const orb of state.xpOrbs) {
      orb.x = p.x + (rng() - 0.5) * 0.6;
      orb.z = p.z + (rng() - 0.5) * 0.6;
      pulled += 1;
    }
    addFloater(state, "2X SALARY AUDIT SURGE!", CFO_TERMINAL_STATION.x, 2.5, CFO_TERMINAL_STATION.z, "#34d399");
    events.push({
      type: "station_buff",
      x: CFO_TERMINAL_STATION.x,
      z: CFO_TERMINAL_STATION.z,
      color: "#34d399",
      message: `CFO Audit Terminal: 2× Salary for 14s${pulled > 0 ? ` & vacuumed ${pulled} XP orbs!` : "!"}`
    });
  }

  // Mirror key station cooldowns for compatibility
  state.espressoCooldown = cds.espresso;
  state.whiteboardCooldown = cds.whiteboard;
  state.printerCooldown = cds.printer;
}

export function stepSimulation(
  state: GameState,
  save: SaveData,
  rawDt: number,
  input: InputSnapshot,
  rng: () => number = Math.random,
  options?: SimOptions
): SimEvent[] {
  const events: SimEvent[] = [];
  const dt = Math.min(Math.max(rawDt, 0), 0.05);

  // Real-time visual timers tick even during hitstop
  state.trauma = Math.max(0, state.trauma - dt * 1.9);
  state.player.hitFlash = Math.max(0, state.player.hitFlash - dt);
  state.player.attackFlash = Math.max(0, state.player.attackFlash - dt);
  state.player.squashY += (1 - state.player.squashY) * (1 - Math.exp(-14 * dt));
  state.player.ghostEnergy +=
    (state.player.energy - state.player.ghostEnergy) * (1 - Math.exp(-3.5 * dt));

  for (const enemy of state.enemies) {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
  }

  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const f = state.floaters[i];
    f.y += dt * 1.65;
    f.life -= dt;
    if (f.life <= 0) state.floaters.splice(i, 1);
  }

  if (state.screen !== "playing") return events;

  if (state.hitstop > 0) {
    state.hitstop = Math.max(0, state.hitstop - dt);
    return events;
  }

  const p = state.player;
  state.elapsed += dt;
  state.spawnTimer -= dt;
  state.squadTimer -= dt;
  state.hazardTimer -= dt;
  state.coffeeTimer -= dt;
  state.eventTimer -= dt;

  for (const key of Object.keys(state.enemySpawnCooldowns) as EnemyTypeId[]) {
    const rem = (state.enemySpawnCooldowns[key] ?? 0) - dt;
    if (rem <= 0) {
      delete state.enemySpawnCooldowns[key];
    } else {
      state.enemySpawnCooldowns[key] = rem;
    }
  }

  for (const st of ALL_STATIONS) {
    state.stationCooldowns[st.id] = Math.max(0, state.stationCooldowns[st.id] - dt);
  }
  state.espressoCooldown = state.stationCooldowns.espresso;
  state.whiteboardCooldown = state.stationCooldowns.whiteboard;
  state.printerCooldown = state.stationCooldowns.printer;
  state.whiteboardBuffTimer = Math.max(0, state.whiteboardBuffTimer - dt);
  state.hasteTimer = Math.max(0, state.hasteTimer - dt);
  state.salaryBoostTimer = Math.max(0, state.salaryBoostTimer - dt);
  state.policySilenceTimer = Math.max(0, state.policySilenceTimer - dt);
  state.outage = Math.max(0, state.outage - dt);
  state.meetingLock = Math.max(0, state.meetingLock - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.skillCooldown = Math.max(0, p.skillCooldown - dt);
  p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);

  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }

  // Trigger timed story comms
  const workMinute = getWorkMinute(state.elapsed, state.dayLength);
  state.chapter.comms.forEach((beat, index) => {
    if (workMinute >= beat.minute && !state.triggeredComms.has(index)) {
      state.triggeredComms.add(index);
      const reply = beat.classReply?.[state.employee.id];
      events.push({
        type: "comms",
        speaker: beat.speaker,
        role: beat.role,
        portraitId: beat.portraitId,
        avatarColor: beat.avatarColor,
        message: reply ? `${beat.text} — ${state.employee.characterName}: "${reply}"` : beat.text
      });
    }
  });

  // Trigger 12:30 PM Lunch Break Story Dilemma once per floor
  if (!state.dilemmaTriggered && workMinute >= 210) {
    state.dilemmaTriggered = true;
    state.activeDilemma = state.chapter.dilemma;
    state.screen = "dilemma";
    events.push({ type: "dilemma", message: state.chapter.dilemma.title });
    return events;
  }

  // Dodge Roll & Signature Skill triggers
  if (input.dodgePressed) {
    triggerDodgeRoll(state, input.moveX, input.moveZ, events);
  }
  if (input.skillPressed) {
    triggerSignatureSkill(state, events);
  }

  // Coffee spill floor slow
  let floorSlow = 1.0;
  for (const hz of state.hazards) {
    if (hz.kind === "coffee_spill" && dist2D(p.x, p.z, hz.x, hz.z) <= hz.radius) {
      floorSlow = 0.68;
      break;
    }
  }
  const hasteBoost = state.hasteTimer > 0 ? 1.24 : 1.0;

  // Player movement
  const moveLen = Math.hypot(input.moveX, input.moveZ);
  const moveNormX = moveLen > 1e-4 ? input.moveX / moveLen : 0;
  const moveNormZ = moveLen > 1e-4 ? input.moveZ / moveLen : 0;

  if (p.dodgeTimer > 0) {
    p.dodgeTimer = Math.max(0, p.dodgeTimer - dt);
    const rollSpeed = p.speed * 2.65;
    p.vx = p.dodgeDirX * rollSpeed;
    p.vz = p.dodgeDirZ * rollSpeed;
    moveWithCollisions(p, p.vx * dt, p.vz * dt, p.radius);
    p.moving = true;
    p.strideDistance += rollSpeed * dt;
  } else if (p.dashTimer > 0) {
    p.dashTimer = Math.max(0, p.dashTimer - dt);
    const dashSpeed = p.speed * 2.7;
    p.vx = p.dashDirX * dashSpeed;
    p.vz = p.dashDirZ * dashSpeed;
    moveWithCollisions(p, p.vx * dt, p.vz * dt, p.radius);
    p.moving = true;
    p.strideDistance += dashSpeed * dt;
  } else if (state.meetingLock <= 0 && moveLen > 0.05) {
    if (input.aimMode !== "manual" || !input.aimActive) {
      p.facingX = moveNormX;
      p.facingZ = moveNormZ;
    }
    const effSpeed = p.speed * floorSlow * hasteBoost;
    p.vx = moveNormX * effSpeed;
    p.vz = moveNormZ * effSpeed;
    moveWithCollisions(p, p.vx * dt, p.vz * dt, p.radius);
    p.moving = true;
    p.strideDistance += effSpeed * dt;
    p.focus = Math.min(p.maxFocus, p.focus + p.focusRecovery * 9 * dt);
  } else {
    p.vx = 0;
    p.vz = 0;
    p.moving = false;
    if (state.meetingLock > 0) {
      p.focus = Math.max(15, p.focus - 4 * dt);
    }
  }

  // Room tracking across all 10 connected rooms
  const roomNow = getRoomAtPosition(p.x, p.z);
  if (roomNow.id !== state.currentRoomId) {
    state.currentRoomId = roomNow.id;
    events.push({
      type: "room_change",
      roomId: roomNow.id,
      x: p.x,
      z: p.z,
      color: roomNow.accentColor,
      message: `Entered ${roomNow.name}`
    });
  }

  if (input.aimMode === "manual" && input.aimActive) {
    const dir = norm2D(input.aimWorldX - p.x, input.aimWorldZ - p.z);
    p.facingX = dir.x;
    p.facingZ = dir.z;
  }

  if (p.regen > 0 && p.focus > 65) {
    p.energy = Math.min(p.maxEnergy, p.energy + p.regen * dt);
  }

  // Check all 8 Room-Anchored Stations
  updateRoomStations(state, dt, rng, events, options);

  // Auto / Manual shooting
  p.shootTimer -= dt;
  if (p.shootTimer <= 0 && state.meetingLock <= 0) {
    firePlayerShot(state, input, rng, events);
    const focusFactor = clamp(p.focus / 100, 0.5, 1.25);
    const flowSpeed = 1 + (getFlowMultiplier(state.combo) - 1) * 0.14;
    const whiteboardSpeed = state.whiteboardBuffTimer > 0 ? 1.28 : 1.0;
    const silenceFactor = state.policySilenceTimer > 0 ? 0.68 : 1.0;
    const outageFactor = state.outage > 0 ? 1 - clamp(0.65 - p.outageResist, 0.1, 0.65) : 1;
    p.shootTimer = 1 / (p.fireRate * focusFactor * flowSpeed * whiteboardSpeed * silenceFactor * outageFactor);
  }

  // Autonomous CI/CD Drones
  for (let i = state.drones.length - 1; i >= 0; i -= 1) {
    const drone = state.drones[i];
    drone.ttl -= dt;
    drone.orbitAngle += dt * 2.8;
    drone.x = p.x + Math.cos(drone.orbitAngle) * 1.85;
    drone.z = p.z + Math.sin(drone.orbitAngle) * 1.85;
    drone.shootTimer -= dt;
    if (drone.shootTimer <= 0) {
      let nearest: EnemyEntity | null = null;
      let best = 11.0;
      for (const enemy of state.enemies) {
        if (enemy.aiPhase === "dying") continue;
        const d = dist2D(drone.x, drone.z, enemy.x, enemy.z);
        if (d < best) {
          best = d;
          nearest = enemy;
        }
      }
      if (nearest) {
        const dir = norm2D(nearest.x - drone.x, nearest.z - drone.z);
        state.projectiles.push({
          id: nextId(state, "pr"),
          fromEnemy: false,
          x: drone.x,
          z: drone.z,
          vx: dir.x * 24,
          vz: dir.z * 24,
          radius: 0.2,
          damage: p.productivity * (p.weaponEvolved && state.employee.id === "devops" ? 0.92 : 0.72),
          color: "#38bdf8",
          pierce: 0,
          ricochet: 0,
          hitIds: new Set<string>(),
          ttl: 0.75,
          crit: false
        });
        drone.shootTimer = p.weaponEvolved && state.employee.id === "devops" ? 0.3 : 0.45;
      }
    }
    if (drone.ttl <= 0) state.drones.splice(i, 1);
  }

  // Spawns, Tactical Squads, Hazards & C-Suite Bosses
  const progress = state.elapsed / state.dayLength;
  if (state.spawnTimer <= 0) {
    const caps = getSpawnCaps(state);
    const counts = countLivingByTier(state);
    if (counts.total < caps.totalCap) {
      const picked = pickEnemyArchetype(state, rng);
      spawnEnemy(state, picked, rng, events);
      // Occasional late-shift Tier-1 chaff pair only if well under cap and we didn't just spawn a heavy unit
      if (
        progress > 0.48 &&
        ENEMY_ARCHETYPES[picked].rankTier === 1 &&
        counts.total + 2 < caps.totalCap &&
        rng() < 0.16 * state.difficulty.spawnRateMult
      ) {
        const swarmPick: EnemyTypeId = rng() < 0.5 ? "intern" : "email";
        spawnEnemy(state, swarmPick, rng, events);
      }
    }
    const baseDelay = Math.max(1.38, 3.15 - progress * 1.48 - (state.day - 1) * 0.08);
    state.spawnTimer = baseDelay / state.difficulty.spawnRateMult;
  }

  if (state.squadTimer <= 0) {
    spawnTacticalSquad(state, rng, events);
    state.squadTimer = (42 - progress * 10) / state.difficulty.spawnRateMult;
  }

  if (state.hazardTimer <= 0) {
    const r = rng();
    const kind: FloorHazardKind =
      r < 0.38 ? "coffee_spill" : r < 0.72 ? "heat_vent" : "runaway_chair";
    spawnFloorHazard(state, kind, rng);
    state.hazardTimer = 14 + rng() * 8;
  }

  if (state.coffeeTimer <= 0) {
    const kind: PickupKind = state.chapter.weekday === "Friday" && rng() < 0.3 ? "pizza" : "coffee";
    spawnPickup(state, kind, undefined, undefined, rng);
    state.coffeeTimer = 11 + rng() * 6;
  }

  if (state.eventTimer <= 0) {
    triggerOfficeEvent(state, rng, events);
    state.eventTimer = 28 + rng() * 14;
  }

  // Mid-day Boss at 11:30 AM (minute 150), Final C-Suite Boss at 3:45 PM (minute 405)
  if (workMinute >= 150 && !state.spawnedBosses.has(state.chapter.midBoss)) {
    state.spawnedBosses.add(state.chapter.midBoss);
    spawnEnemy(state, state.chapter.midBoss, rng, events);
  }
  if (workMinute >= 405 && !state.spawnedBosses.has(state.chapter.finalBoss)) {
    state.spawnedBosses.add(state.chapter.finalBoss);
    spawnEnemy(state, state.chapter.finalBoss, rng, events);
  }

  // Update Dynamic Floor Hazards
  for (let i = state.hazards.length - 1; i >= 0; i -= 1) {
    const hz = state.hazards[i];
    hz.elapsed += dt;
    hz.tickCooldown = Math.max(0, hz.tickCooldown - dt);

    if (hz.kind === "runaway_chair") {
      hz.x += hz.vx * dt;
      hz.z += hz.vz * dt;
      for (const enemy of state.enemies) {
        if (enemy.aiPhase === "dying") continue;
        if (dist2D(hz.x, hz.z, enemy.x, enemy.z) <= hz.radius + enemy.radius) {
          const dir = norm2D(hz.vx, hz.vz);
          enemy.knockX += dir.x * 11;
          enemy.knockZ += dir.z * 11;
          if (hz.tickCooldown <= 0) {
            damageEnemy(state, enemy, p.productivity * 0.9, false, events, rng, options, undefined, undefined, true);
            hz.tickCooldown = 0.25;
          }
        }
      }
      if (dist2D(hz.x, hz.z, p.x, p.z) <= hz.radius + p.radius * 0.8) {
        damagePlayer(state, 9, 4, 1, "ROGUE CHAIR!", "#94a3b8", events, options);
      }
      if (Math.abs(hz.x) > WORLD_BOUNDS.halfW + 1 || hz.elapsed >= hz.duration) {
        state.hazards.splice(i, 1);
      }
      continue;
    }

    if (hz.kind === "heat_vent" && hz.elapsed > 1.2 && hz.tickCooldown <= 0) {
      if (dist2D(hz.x, hz.z, p.x, p.z) <= hz.radius + p.radius * 0.6) {
        damagePlayer(state, 8, 5, 1, "SERVER STEAM!", "#fb923c", events, options);
        hz.tickCooldown = 0.85;
      }
      for (const enemy of state.enemies) {
        if (enemy.aiPhase === "dying") continue;
        if (dist2D(hz.x, hz.z, enemy.x, enemy.z) <= hz.radius + enemy.radius) {
          damageEnemy(state, enemy, 8, false, events, rng, options, undefined, undefined, true);
          hz.tickCooldown = 0.65;
        }
      }
    }

    if (hz.kind === "coffee_spill") {
      for (const enemy of state.enemies) {
        if (enemy.aiPhase !== "dying" && dist2D(hz.x, hz.z, enemy.x, enemy.z) <= hz.radius) {
          enemy.slowTimer = Math.max(enemy.slowTimer, 0.25);
        }
      }
    }

    if (hz.elapsed >= hz.duration) {
      state.hazards.splice(i, 1);
    }
  }

  // Update Telegraphs & Stasis Fields
  for (let i = state.telegraphs.length - 1; i >= 0; i -= 1) {
    const tg = state.telegraphs[i];
    tg.elapsed += dt;

    if (tg.kind === "stasis_field") {
      for (const enemy of state.enemies) {
        if (enemy.aiPhase === "dying") continue;
        if (dist2D(tg.x, tg.z, enemy.x, enemy.z) <= tg.radius + enemy.radius) {
          enemy.slowTimer = Math.max(enemy.slowTimer, 0.35);
          enemy.markedTimer = Math.max(enemy.markedTimer, 0.45);
        }
      }
      if (tg.elapsed >= tg.duration) state.telegraphs.splice(i, 1);
      continue;
    }

    if (!tg.resolved && tg.elapsed >= tg.duration) {
      tg.resolved = true;
      if (tg.ownerId !== "player") {
        if (
          tg.kind === "meeting_ring" ||
          tg.kind === "shockwave" ||
          tg.kind === "policy_ring" ||
          tg.kind === "tax_ring"
        ) {
          if (dist2D(p.x, p.z, tg.x, tg.z) <= tg.radius + p.radius * 0.65) {
            if (tg.kind === "meeting_ring") {
              state.meetingLock = Math.max(state.meetingLock, 1.15 / p.meetingResist);
              state.meetingsEndured += 1;
              damagePlayer(state, 12 / p.meetingResist, 12, 3, "QUICK SYNC!", "#f59e0b", events, options);
            } else if (tg.kind === "policy_ring") {
              state.policySilenceTimer = Math.max(state.policySilenceTimer, 3.2 / p.meetingResist);
              damagePlayer(state, 10 / p.meetingResist, 10, 2, "POLICY SILENCE!", "#c084fc", events, options);
            } else if (tg.kind === "tax_ring") {
              const fee = Math.min(state.salary, 22);
              state.salary = Math.max(0, state.salary - fee);
              damagePlayer(state, 14, 10, 3, fee > 0 ? `AUDIT -$${fee}!` : "BUDGET CUT!", "#10b981", events, options);
            } else {
              damagePlayer(state, 16, 10, 2, "SHOCKWAVE!", "#f87171", events, options);
            }
          }
        }
      }
    }

    if (tg.elapsed >= tg.duration + 0.18) {
      state.telegraphs.splice(i, 1);
    }
  }

  // Update Projectiles (Curving Arcs, Wall Bounces, Hazard Splatters, Pierce & Ricochet)
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const shot = state.projectiles[i];
    if (shot.curveRate) {
      const ca = Math.cos(shot.curveRate * dt);
      const sa = Math.sin(shot.curveRate * dt);
      const nvx = shot.vx * ca - shot.vz * sa;
      const nvz = shot.vx * sa + shot.vz * ca;
      shot.vx = nvx;
      shot.vz = nvz;
    }

    const prevX = shot.x;
    const prevZ = shot.z;
    shot.x += shot.vx * dt;
    shot.z += shot.vz * dt;
    shot.ttl -= dt;

    const hitArenaX = Math.abs(shot.x) > WORLD_BOUNDS.halfW;
    const hitArenaZ = Math.abs(shot.z) > WORLD_BOUNDS.halfD;
    const hitWall = CAMPUS_WALLS.find(
      (w) => resolveCircleAABB(shot.x, shot.z, shot.radius * 0.6, w) !== null
    );

    if (hitArenaX || hitArenaZ || hitWall) {
      if (shot.wallBounces && shot.wallBounces > 0) {
        shot.wallBounces -= 1;
        if (hitArenaX) {
          shot.vx = -shot.vx;
          shot.x = prevX;
        } else if (hitArenaZ) {
          shot.vz = -shot.vz;
          shot.z = prevZ;
        } else if (hitWall) {
          const hitOnX = resolveCircleAABB(shot.x, prevZ, shot.radius * 0.6, hitWall) !== null;
          const hitOnZ = resolveCircleAABB(prevX, shot.z, shot.radius * 0.6, hitWall) !== null;
          if (hitOnX) {
            shot.vx = -shot.vx;
            shot.x = prevX;
          }
          if (hitOnZ || !hitOnX) {
            shot.vz = -shot.vz;
            shot.z = prevZ;
          }
        }
        shot.ttl = Math.max(shot.ttl, 0.85);
      } else {
        if (shot.spawnsHazard) {
          spawnHazardAtPoint(state, shot.spawnsHazard, prevX, prevZ);
        }
        state.projectiles.splice(i, 1);
        continue;
      }
    }

    if (shot.fromEnemy) {
      if (dist2D(shot.x, shot.z, p.x, p.z) <= shot.radius + p.radius) {
        if (shot.appliesSilence && shot.appliesSilence > 0) {
          state.policySilenceTimer = Math.max(
            state.policySilenceTimer,
            shot.appliesSilence / p.meetingResist
          );
        }
        if (shot.appliesTax && shot.appliesTax > 0) {
          const fine = Math.min(state.salary, shot.appliesTax);
          state.salary = Math.max(0, state.salary - fine);
        }
        if (shot.spawnsHazard) {
          spawnHazardAtPoint(state, shot.spawnsHazard, shot.x, shot.z);
        }
        damagePlayer(
          state,
          shot.damage,
          shot.appliesFocusDrain ?? 8,
          1,
          shot.callout || "DIRECTIVE!",
          shot.color,
          events,
          options
        );
        state.projectiles.splice(i, 1);
        continue;
      }
      if (shot.ttl <= 0) {
        if (shot.spawnsHazard) {
          spawnHazardAtPoint(state, shot.spawnsHazard, shot.x, shot.z);
        }
        state.projectiles.splice(i, 1);
        continue;
      }
    } else {
      for (const enemy of state.enemies) {
        if (enemy.aiPhase === "dying" || shot.hitIds.has(enemy.id)) continue;
        if (dist2D(shot.x, shot.z, enemy.x, enemy.z) <= shot.radius + enemy.radius) {
          shot.hitIds.add(enemy.id);
          const knockDir = norm2D(shot.vx, shot.vz);
          const knockScale =
            shot.knockScale ?? (state.employee.id === "senior" && p.weaponEvolved ? 5.2 : 3.2);
          enemy.knockX += knockDir.x * (enemy.boss ? 1.1 : knockScale);
          enemy.knockZ += knockDir.z * (enemy.boss ? 1.1 : knockScale);
          if (shot.slowDuration && shot.slowDuration > 0) {
            enemy.slowTimer = Math.max(enemy.slowTimer, shot.slowDuration);
          }
          if (shot.markDuration && shot.markDuration > 0) {
            enemy.markedTimer = Math.max(enemy.markedTimer, shot.markDuration);
          }
          damageEnemy(
            state,
            enemy,
            shot.damage,
            shot.crit,
            events,
            rng,
            options,
            knockDir.x,
            knockDir.z,
            shot.pierce > 0
          );

          // Splash AoE weapons (Hydro Water Bottle, 27" Monitor, Hot Coffee Mug, Evolved Tape)
          if (shot.splashRadius && shot.splashRadius > 0) {
            for (const other of state.enemies) {
              if (other.id === enemy.id || other.aiPhase === "dying") continue;
              const sd = dist2D(shot.x, shot.z, other.x, other.z);
              if (sd <= shot.splashRadius + other.radius) {
                if (shot.slowDuration && shot.slowDuration > 0) {
                  other.slowTimer = Math.max(other.slowTimer, shot.slowDuration * 0.85);
                }
                const spDir = norm2D(other.x - shot.x, other.z - shot.z);
                other.knockX += spDir.x * (other.boss ? 0.7 : knockScale * 0.55);
                other.knockZ += spDir.z * (other.boss ? 0.7 : knockScale * 0.55);
                damageEnemy(state, other, shot.damage * 0.58, false, events, rng, options, spDir.x, spDir.z, true);
              }
            }
            events.push({
              type: "hit",
              x: shot.x,
              z: shot.z,
              color: shot.color,
              weight: 0.75
            });
          }

          if (shot.ricochet > 0) {
            let nextTarget: EnemyEntity | null = null;
            let bestDist = 9.0;
            for (const other of state.enemies) {
              if (other.aiPhase === "dying" || shot.hitIds.has(other.id)) continue;
              const d = dist2D(shot.x, shot.z, other.x, other.z);
              if (d < bestDist) {
                bestDist = d;
                nextTarget = other;
              }
            }
            if (nextTarget) {
              const spd = Math.hypot(shot.vx, shot.vz);
              const nd = norm2D(nextTarget.x - shot.x, nextTarget.z - shot.z);
              shot.vx = nd.x * spd;
              shot.vz = nd.z * spd;
              shot.ricochet -= 1;
              shot.ttl = Math.max(shot.ttl, 0.45);
              break;
            }
          }

          if (shot.pierce > 0) {
            shot.pierce -= 1;
          } else {
            shot.ttl = -1;
            break;
          }
        }
      }
    }

    if (shot.ttl <= 0) state.projectiles.splice(i, 1);
  }

  // Update Enemies with Doorway-Aware Steering & Corporate Hierarchy Policies
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    if (enemy.aiPhase === "dying") {
      enemy.deathTimer -= dt;
      enemy.x += enemy.knockX * dt;
      enemy.z += enemy.knockZ * dt;
      enemy.knockX *= Math.exp(-8 * dt);
      enemy.knockZ *= Math.exp(-8 * dt);
      if (enemy.deathTimer <= 0) {
        state.enemies.splice(i, 1);
      }
      continue;
    }

    enemy.contactCooldown = Math.max(0, enemy.contactCooldown - dt);
    enemy.abilityCooldown = Math.max(0, enemy.abilityCooldown - dt);
    enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
    enemy.markedTimer = Math.max(0, enemy.markedTimer - dt);
    enemy.rallyTimer = Math.max(0, enemy.rallyTimer - dt);
    enemy.castTimer = Math.max(0, enemy.castTimer - dt);

    if (Math.abs(enemy.knockX) > 0.05 || Math.abs(enemy.knockZ) > 0.05) {
      moveWithCollisions(enemy, enemy.knockX * dt, enemy.knockZ * dt, enemy.radius);
      const decay = Math.exp(-10 * dt);
      enemy.knockX *= decay;
      enemy.knockZ *= decay;
    }

    const slowFactor = enemy.slowTimer > 0 ? 0.36 : 1.0;
    const rallyBoost = enemy.rallyTimer > 0 ? 1.22 : 1.0;
    const steerPt = getDoorwaySteerTarget(enemy.x, enemy.z, p.x, p.z);
    const toSteer = norm2D(steerPt.x - enemy.x, steerPt.z - enemy.z);
    const toPlayer = norm2D(p.x - enemy.x, p.z - enemy.z);
    const dToPlayer = dist2D(p.x, p.z, enemy.x, enemy.z);

    if (enemy.aiPhase !== "windup" && enemy.aiPhase !== "active") {
      enemy.facingX = dToPlayer < 12 ? toPlayer.x : toSteer.x;
      enemy.facingZ = dToPlayer < 12 ? toPlayer.z : toSteer.z;
    }
    enemy.walkPhase += dt * enemy.speed * slowFactor * rallyBoost * 1.9;

    updateEnemyPolicy(
      state,
      enemy,
      dt,
      slowFactor * rallyBoost,
      toSteer.x,
      toSteer.z,
      toPlayer.x,
      toPlayer.z,
      dToPlayer,
      rng,
      events
    );

    if (dToPlayer < p.radius + enemy.radius && enemy.contactCooldown <= 0) {
      const def = ENEMY_ARCHETYPES[enemy.typeId];
      const resist = def.meeting ? p.meetingResist : 1;
      damagePlayer(
        state,
        def.damage / resist,
        def.focusDamage,
        def.rankTier >= 3 ? 3 : 1,
        def.meeting ? "MEETING!" : def.shortLabel,
        def.color,
        events,
        options
      );
      enemy.contactCooldown = 1.05;
    }
  }

  // Update Magnetic XP Orbs
  const magnetRange = 5.6 + (p.range - 12.2) * 0.25;
  for (let i = state.xpOrbs.length - 1; i >= 0; i -= 1) {
    const orb = state.xpOrbs[i];
    orb.ttl -= dt;
    orb.bob += dt * 5.2;
    const d = dist2D(p.x, p.z, orb.x, orb.z);
    if (d < magnetRange) {
      const pull = norm2D(p.x - orb.x, p.z - orb.z);
      const pullSpeed = 12.5 + (magnetRange - d) * 2.5;
      orb.x += pull.x * pullSpeed * dt;
      orb.z += pull.z * pullSpeed * dt;
    }
    if (d <= p.radius + 0.55) {
      state.salary += orb.salary;
      grantXp(state, orb.xp, events);
      events.push({ type: "orb", x: orb.x, z: orb.z, color: orb.color });
      state.xpOrbs.splice(i, 1);
    } else if (orb.ttl <= 0) {
      state.xpOrbs.splice(i, 1);
    }
  }

  // Update Pickups
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const pk = state.pickups[i];
    pk.ttl -= dt;
    pk.bob += dt * 4.2;
    if (dist2D(p.x, p.z, pk.x, pk.z) <= p.radius + pk.radius + 0.45) {
      if (pk.kind === "coffee") {
        const heal = 24 * (1 + p.coffeeBoost);
        p.energy = Math.min(p.maxEnergy, p.energy + heal);
        p.focus = Math.min(p.maxFocus, p.focus + 14);
        addFloater(state, "+COFFEE", p.x, 2.2, p.z, "#d97706");
      } else if (pk.kind === "pizza") {
        p.happiness = Math.min(160, p.happiness + 16);
        p.energy = Math.min(p.maxEnergy, p.energy + 18);
        addFloater(state, "+PIZZA", p.x, 2.2, p.z, "#fbbf24");
      } else {
        p.focus = Math.min(p.maxFocus, p.focus + 22);
        p.skillCooldown = Math.max(0, p.skillCooldown - 2.5);
        addFloater(state, "+DONUT BOOST", p.x, 2.2, p.z, "#f472b6");
      }
      events.push({ type: "pickup", x: pk.x, z: pk.z, color: "#fbbf24" });
      state.pickups.splice(i, 1);
    } else if (pk.ttl <= 0) {
      state.pickups.splice(i, 1);
    }
  }

  // Check Defeat
  if (p.energy <= 0) {
    finalizeRun(state, save, false, events);
    return events;
  }

  // Check Victory
  const finalBossAlive = state.enemies.some(
    (e) => e.typeId === state.chapter.finalBoss && e.aiPhase !== "dying"
  );
  if (
    (state.defeatedBosses.has(state.chapter.finalBoss) && state.elapsed >= state.dayLength * 0.85) ||
    (state.elapsed >= state.dayLength && !finalBossAlive)
  ) {
    finalizeRun(state, save, true, events);
  }

  return events;
}

function rallyNearbyAllies(state: GameState, leader: EnemyEntity, radius = 6.8): void {
  for (const ally of state.enemies) {
    if (ally.id === leader.id || ally.aiPhase === "dying") continue;
    if (dist2D(leader.x, leader.z, ally.x, ally.z) <= radius) {
      ally.rallyTimer = Math.max(ally.rallyTimer, 1.35);
    }
  }
}

function spawnHazardAtPoint(
  state: GameState,
  kind: FloorHazardKind,
  x: number,
  z: number
): void {
  if (state.hazards.length >= 6) {
    const idx = state.hazards.findIndex((h) => h.kind === kind);
    if (idx >= 0) state.hazards.splice(idx, 1);
    else return;
  }
  const durMult = state.difficulty.hazardDurationMult;
  state.hazards.push({
    id: nextId(state, "hz"),
    kind,
    x: clamp(x, -WORLD_BOUNDS.halfW + 1.5, WORLD_BOUNDS.halfW - 1.5),
    z: clamp(z, -WORLD_BOUNDS.halfD + 1.5, WORLD_BOUNDS.halfD - 1.5),
    vx: 0,
    vz: 0,
    radius: kind === "coffee_spill" ? 1.85 : 1.75,
    elapsed: 0,
    duration: (kind === "coffee_spill" ? 7.5 : 6.5) * durMult,
    tickCooldown: 0
  });
}

interface EnemyShotOptions {
  kind: EnemyProjectileKind;
  speed: number;
  damage: number;
  color: string;
  radius?: number;
  ttl?: number;
  curveRate?: number;
  arcHeight?: number;
  wallBounces?: number;
  spawnsHazard?: FloorHazardKind;
  appliesSilence?: number;
  appliesFocusDrain?: number;
  appliesTax?: number;
  callout?: string;
}

function fireEnemyProjectile(
  state: GameState,
  enemy: EnemyEntity,
  dirX: number,
  dirZ: number,
  opts: EnemyShotOptions
): void {
  const ttl = opts.ttl ?? 2.35;
  enemy.castTimer = Math.max(enemy.castTimer, 0.34);
  state.projectiles.push({
    id: nextId(state, "pr"),
    fromEnemy: true,
    enemyKind: opts.kind,
    x: enemy.x + dirX * (enemy.radius + 0.25),
    z: enemy.z + dirZ * (enemy.radius + 0.25),
    vx: dirX * opts.speed,
    vz: dirZ * opts.speed,
    radius: opts.radius ?? 0.36,
    damage: opts.damage,
    color: opts.color,
    pierce: 0,
    ricochet: 0,
    hitIds: new Set<string>(),
    ttl,
    maxTtl: ttl,
    crit: false,
    curveRate: opts.curveRate,
    arcHeight: opts.arcHeight,
    wallBounces: opts.wallBounces,
    spawnsHazard: opts.spawnsHazard,
    appliesSilence: opts.appliesSilence,
    appliesFocusDrain: opts.appliesFocusDrain,
    appliesTax: opts.appliesTax,
    callout: opts.callout
  });
}

function updateEnemyPolicy(
  state: GameState,
  enemy: EnemyEntity,
  dt: number,
  speedMult: number,
  steerX: number,
  steerZ: number,
  toX: number,
  toZ: number,
  dToPlayer: number,
  rng: () => number,
  events: SimEvent[]
): void {
  const speed = enemy.speed * speedMult;
  const p = state.player;
  const def = ENEMY_ARCHETYPES[enemy.typeId];
  const sameRoom = getRoomAtPosition(enemy.x, enemy.z).id === state.currentRoomId;

  const moveWithSlide = (mx: number, mz: number, spd: number) => {
    const bumped = moveWithCollisions(enemy, mx * spd * dt, mz * spd * dt, enemy.radius);
    if (bumped) {
      moveWithCollisions(
        enemy,
        -mz * spd * 0.72 * enemy.orbitSign * dt,
        mx * spd * 0.72 * enemy.orbitSign * dt,
        enemy.radius
      );
    }
    return bumped;
  };

  // === TIER 1 SWARMERS: Unread Email (Agile Hop Dash) vs Overeager Intern (Arcing Coffee Toss) ===
  if (enemy.policy === "swarmer") {
    if (enemy.typeId === "intern") {
      const wave = Math.sin(enemy.walkPhase * 0.7) * 0.34 * enemy.orbitSign;
      const n = norm2D(steerX - steerZ * wave, steerZ + steerX * wave);
      moveWithSlide(n.x, n.z, speed);

      // Intern lobs an arcing hot coffee cup that splatters into a real slowing coffee_spill puddle!
      if (sameRoom && dToPlayer < 9.5 && dToPlayer > 2.4 && enemy.abilityCooldown <= 0) {
        enemy.abilityCooldown = 4.2 + rng() * 1.4;
        const flightTime = clamp(dToPlayer / 7.2, 0.55, 1.25);
        const lobSpeed = dToPlayer / flightTime;
        fireEnemyProjectile(state, enemy, toX, toZ, {
          kind: "coffee_cup",
          speed: lobSpeed,
          damage: 7.5,
          color: "#d97706",
          radius: 0.36,
          ttl: flightTime,
          arcHeight: 2.25,
          spawnsHazard: "coffee_spill",
          appliesFocusDrain: 5,
          callout: "HOT COFFEE!"
        });
      }
      return;
    }

    // Unread Email: agile zig-zag with brief reply-all hop bursts when closing in
    const hopBoost = sameRoom && dToPlayer < 5.6 && enemy.abilityCooldown <= 0 ? 1.55 : 1.0;
    if (hopBoost > 1) {
      enemy.abilityCooldown = 2.6 + rng() * 0.8;
      enemy.castTimer = 0.25;
      enemy.knockX += toX * 4.2;
      enemy.knockZ += toZ * 4.2;
    }
    const wave = Math.sin(enemy.walkPhase * 1.05) * 0.45 * enemy.orbitSign;
    const n = norm2D(steerX - steerZ * wave, steerZ + steerX * wave);
    moveWithSlide(n.x, n.z, speed * hopBoost);
    return;
  }

  // === P0 BUG CHARGER & VP OF OPS BRUISER ===
  if (enemy.policy === "charger" || enemy.policy === "vp_bruiser") {
    const isVp = enemy.policy === "vp_bruiser";
    if (enemy.aiPhase === "move") {
      if (
        isVp &&
        dToPlayer < 4.6 &&
        enemy.abilityCooldown <= 0 &&
        countActiveTelegraphs(state) < MAX_CONCURRENT_TELEGRAPHS
      ) {
        enemy.abilityCooldown = 3.5;
        enemy.castTimer = 0.45;
        state.telegraphs.push({
          id: nextId(state, "tg"),
          kind: "shockwave",
          ownerId: enemy.id,
          x: enemy.x,
          z: enemy.z,
          dirX: 0,
          dirZ: -1,
          radius: 4.2,
          length: 0,
          elapsed: 0,
          duration: 0.72,
          resolved: false,
          color: def.accentColor
        });
        events.push({ type: "telegraph", x: enemy.x, z: enemy.z, color: def.accentColor });
        return;
      }

      if (
        sameRoom &&
        dToPlayer < (isVp ? 10.2 : 8.5) &&
        dToPlayer > 2.5 &&
        enemy.abilityCooldown <= 0 &&
        countActiveTelegraphs(state) < MAX_CONCURRENT_TELEGRAPHS
      ) {
        enemy.aiPhase = "windup";
        enemy.aiTimer = isVp ? 0.62 : 0.55;
        enemy.lungeDirX = toX;
        enemy.lungeDirZ = toZ;
        state.telegraphs.push({
          id: nextId(state, "tg"),
          kind: "lunge_line",
          ownerId: enemy.id,
          x: enemy.x,
          z: enemy.z,
          dirX: toX,
          dirZ: toZ,
          radius: isVp ? 0.95 : 0.75,
          length: isVp ? 8.8 : 7.4,
          elapsed: 0,
          duration: enemy.aiTimer,
          resolved: false,
          color: def.accentColor
        });
        events.push({ type: "telegraph", x: enemy.x, z: enemy.z, color: def.accentColor });
      } else {
        moveWithSlide(steerX, steerZ, speed);
      }
    } else if (enemy.aiPhase === "windup") {
      enemy.facingX = enemy.lungeDirX;
      enemy.facingZ = enemy.lungeDirZ;
      enemy.aiTimer -= dt;
      if (enemy.aiTimer <= 0) {
        enemy.aiPhase = "active";
        enemy.aiTimer = isVp ? 0.48 : 0.42;
      }
    } else if (enemy.aiPhase === "active") {
      const lungeSpeed = (isVp ? 14.5 : 13.5) * speedMult;
      const bumped = moveWithCollisions(
        enemy,
        enemy.lungeDirX * lungeSpeed * dt,
        enemy.lungeDirZ * lungeSpeed * dt,
        enemy.radius
      );
      enemy.aiTimer -= dt;
      if (bumped || enemy.aiTimer <= 0) {
        enemy.aiPhase = "recover";
        enemy.aiTimer = 0.62;
        enemy.abilityCooldown = isVp ? 3.1 : 3.3;
        // VP of Ops releases a 3-way Executive Directive burst on charge finish!
        if (isVp) {
          const baseA = Math.atan2(toZ, toX);
          for (const off of [-0.36, 0, 0.36]) {
            fireEnemyProjectile(state, enemy, Math.cos(baseA + off), Math.sin(baseA + off), {
              kind: "exec_directive",
              speed: 9.2,
              damage: 11,
              color: "#f97316",
              radius: 0.4,
              ttl: 1.9,
              appliesFocusDrain: 9,
              callout: "RESTRUCTURED!"
            });
          }
        }
      }
    } else if (enemy.aiPhase === "recover") {
      enemy.aiTimer -= dt;
      if (enemy.aiTimer <= 0) enemy.aiPhase = "move";
    }
    return;
  }

  // === JUNIOR ANALYST: Midrange Twin-Sheet Excel Spreadsheet Double-Tap ===
  if (enemy.policy === "ranged") {
    const idealDist = 7.6;
    if (!sameRoom || dToPlayer > idealDist + 1.4) {
      moveWithSlide(steerX, steerZ, speed);
    } else if (dToPlayer < idealDist - 1.8) {
      moveWithSlide(-toX, -toZ, speed * 0.65);
    } else {
      moveWithSlide(-toZ * enemy.orbitSign, toX * enemy.orbitSign, speed * 0.7);
    }
    if (sameRoom && dToPlayer < 13 && enemy.abilityCooldown <= 0) {
      enemy.abilityCooldown = 2.8 + rng() * 0.85;
      const baseA = Math.atan2(toZ, toX);
      for (const off of [-0.11, 0.11]) {
        fireEnemyProjectile(state, enemy, Math.cos(baseA + off), Math.sin(baseA + off), {
          kind: "spreadsheet",
          speed: 8.6,
          damage: 7.5,
          color: "#22c55e",
          radius: 0.34,
          ttl: 2.1,
          appliesFocusDrain: 7,
          callout: "SPREADSHEET!"
        });
      }
    }
    return;
  }

  // === TECH LEAD: Architecture Rally Aura + 3-Card PR Rejection Fan ===
  if (enemy.policy === "lead_buffer") {
    rallyNearbyAllies(state, enemy, 6.8);
    if (!sameRoom || dToPlayer > 8.4) {
      moveWithSlide(steerX, steerZ, speed);
    } else if (dToPlayer < 4.8) {
      moveWithSlide(-toX, -toZ, speed * 0.55);
    } else {
      moveWithSlide(-toZ * enemy.orbitSign, toX * enemy.orbitSign, speed * 0.6);
    }
    if (sameRoom && dToPlayer < 12.5 && enemy.abilityCooldown <= 0) {
      enemy.abilityCooldown = 2.9 + rng() * 0.8;
      const baseA = Math.atan2(toZ, toX);
      for (const off of [-0.25, 0, 0.25]) {
        fireEnemyProjectile(state, enemy, Math.cos(baseA + off), Math.sin(baseA + off), {
          kind: "code_review",
          speed: 9.4,
          damage: 9,
          color: "#14b8a6",
          radius: 0.36,
          ttl: 2.0,
          appliesFocusDrain: 11,
          callout: "PR REJECTED!"
        });
      }
    }
    return;
  }

  // === PRODUCT LEAD: Alternates Scope Creep Summon & Twin Curving Boomerang Kanban Cards ===
  if (enemy.policy === "lead_spawner") {
    if (!sameRoom || dToPlayer > 9.2) {
      moveWithSlide(steerX, steerZ, speed);
    } else if (dToPlayer < 5.5) {
      moveWithSlide(-toX, -toZ, speed * 0.65);
    } else {
      moveWithSlide(-toZ * enemy.orbitSign, toX * enemy.orbitSign, speed * 0.58);
    }
    if (sameRoom && enemy.abilityCooldown <= 0 && dToPlayer < 14.5) {
      enemy.volleyStep += 1;
      if (enemy.volleyStep % 2 === 1) {
        // Throw 2 curving sticky Kanban cards that bend around desks!
        enemy.abilityCooldown = 2.8 + rng() * 0.7;
        const baseA = Math.atan2(toZ, toX);
        fireEnemyProjectile(state, enemy, Math.cos(baseA - 0.36), Math.sin(baseA - 0.36), {
          kind: "kanban_card",
          speed: 8.8,
          damage: 9.5,
          color: "#f59e0b",
          radius: 0.36,
          ttl: 2.3,
          curveRate: 0.78,
          appliesFocusDrain: 9,
          callout: "KANBAN TICKET!"
        });
        fireEnemyProjectile(state, enemy, Math.cos(baseA + 0.36), Math.sin(baseA + 0.36), {
          kind: "kanban_card",
          speed: 8.8,
          damage: 9.5,
          color: "#f59e0b",
          radius: 0.36,
          ttl: 2.3,
          curveRate: -0.78,
          appliesFocusDrain: 9,
          callout: "KANBAN TICKET!"
        });
      } else if (state.enemies.length < 22) {
        enemy.abilityCooldown = 4.6 + rng() * 1.1;
        enemy.castTimer = 0.45;
        const summonId: EnemyTypeId = rng() < 0.55 ? "intern" : "email";
        spawnEnemy(state, summonId, rng, events, {
          x: enemy.x + (rng() - 0.5) * 1.6,
          z: enemy.z + (rng() - 0.5) * 1.6
        });
        addFloater(state, "SCOPE CREEP!", enemy.x, 2.2, enemy.z, "#f59e0b");
      } else {
        enemy.abilityCooldown = 2.4;
      }
    }
    return;
  }

  // === HR SPECIALIST & HR DIRECTOR: Policy Silence Rings + Stamped HR Policy Memos ===
  if (enemy.policy === "hr_silencer" || enemy.policy === "hr_director") {
    const isDirector = enemy.policy === "hr_director";
    if (!sameRoom || dToPlayer > 8.8) {
      moveWithSlide(steerX, steerZ, speed);
    } else if (dToPlayer < 4.8) {
      moveWithSlide(-toX, -toZ, speed * 0.55);
    } else {
      moveWithSlide(-toZ * enemy.orbitSign, toX * enemy.orbitSign, speed * 0.62);
    }

    if (sameRoom && dToPlayer < 12.2 && enemy.abilityCooldown <= 0) {
      enemy.abilityCooldown = isDirector ? 3.7 : 4.2 + rng() * 1.0;
      enemy.castTimer = 0.42;

      if (countActiveTelegraphs(state) < MAX_CONCURRENT_TELEGRAPHS) {
        state.telegraphs.push({
          id: nextId(state, "tg"),
          kind: "policy_ring",
          ownerId: enemy.id,
          x: p.x,
          z: p.z,
          dirX: 0,
          dirZ: -1,
          radius: isDirector ? 3.1 : 2.45,
          length: 0,
          elapsed: 0,
          duration: isDirector ? 0.78 : 0.84,
          resolved: false,
          color: isDirector ? "#f43f5e" : "#c084fc"
        });
        events.push({ type: "telegraph", x: p.x, z: p.z, color: "#c084fc" });
      }

      const baseA = Math.atan2(toZ, toX);
      if (isDirector) {
        // 5-folder staggered PIP compliance wave (alternating fast/slow speeds!)
        const offsets = [-0.42, -0.21, 0, 0.21, 0.42];
        offsets.forEach((off, idx) => {
          fireEnemyProjectile(state, enemy, Math.cos(baseA + off), Math.sin(baseA + off), {
            kind: "policy_memo",
            speed: idx % 2 === 0 ? 10.2 : 7.6,
            damage: 10,
            color: "#e11d48",
            radius: 0.38,
            ttl: 2.35,
            appliesSilence: 1.8,
            appliesFocusDrain: 10,
            callout: "PIP MEMO!"
          });
        });
      } else {
        // HR Specialist throws a silencing Policy Memo
        fireEnemyProjectile(state, enemy, toX, toZ, {
          kind: "policy_memo",
          speed: 7.8,
          damage: 9,
          color: "#a855f7",
          radius: 0.38,
          ttl: 2.4,
          appliesSilence: 1.6,
          appliesFocusDrain: 10,
          callout: "HR MEMO!"
        });
      }
    }
    return;
  }

  // === IT SECURITY AUDITOR: Directional Shield + Midrange Hex Firewall Disc + Close EMP Slam ===
  if (enemy.policy === "shield_auditor") {
    enemy.facingX = toX;
    enemy.facingZ = toZ;
    moveWithSlide(steerX, steerZ, speed);

    if (
      dToPlayer < 4.2 &&
      enemy.abilityCooldown <= 0 &&
      countActiveTelegraphs(state) < MAX_CONCURRENT_TELEGRAPHS
    ) {
      enemy.abilityCooldown = 4.0;
      enemy.castTimer = 0.45;
      state.telegraphs.push({
        id: nextId(state, "tg"),
        kind: "shockwave",
        ownerId: enemy.id,
        x: enemy.x,
        z: enemy.z,
        dirX: 0,
        dirZ: -1,
        radius: 3.45,
        length: 0,
        elapsed: 0,
        duration: 0.72,
        resolved: false,
        color: "#38bdf8"
      });
      events.push({ type: "telegraph", x: enemy.x, z: enemy.z, color: "#38bdf8" });
    } else if (sameRoom && dToPlayer >= 4.4 && dToPlayer < 11.2 && enemy.abilityCooldown <= 0) {
      enemy.abilityCooldown = 3.5 + rng() * 0.9;
      fireEnemyProjectile(state, enemy, toX, toZ, {
        kind: "firewall_disc",
        speed: 8.2,
        damage: 11.5,
        color: "#38bdf8",
        radius: 0.46,
        ttl: 2.3,
        appliesFocusDrain: 9,
        callout: "FIREWALL!"
      });
    }
    return;
  }

  // === MIDDLE MANAGER & SENIOR MANAGER: Sync Rings + Ricocheting/Curving Calendar Invites ===
  if (enemy.policy === "manager" || enemy.policy === "senior_manager") {
    const isSenior = enemy.policy === "senior_manager";
    if (isSenior) rallyNearbyAllies(state, enemy, 7.6);

    if (!sameRoom || dToPlayer > 8.0) {
      moveWithSlide(steerX, steerZ, speed);
    } else if (dToPlayer < 4.5) {
      moveWithSlide(-toX, -toZ, speed * 0.55);
    } else {
      moveWithSlide(-toZ * enemy.orbitSign, toX * enemy.orbitSign, speed * 0.52);
    }

    if (sameRoom && dToPlayer < 11.2 && enemy.abilityCooldown <= 0) {
      enemy.abilityCooldown = isSenior ? 3.8 : 4.2 + rng() * 1.1;
      enemy.castTimer = 0.42;

      if (countActiveTelegraphs(state) < MAX_CONCURRENT_TELEGRAPHS) {
        state.telegraphs.push({
          id: nextId(state, "tg"),
          kind: "meeting_ring",
          ownerId: enemy.id,
          x: p.x,
          z: p.z,
          dirX: 0,
          dirZ: -1,
          radius: isSenior ? 2.7 : 2.35,
          length: 0,
          elapsed: 0,
          duration: 0.78,
          resolved: false,
          color: "#f59e0b"
        });
        if (isSenior) {
          state.telegraphs.push({
            id: nextId(state, "tg"),
            kind: "meeting_ring",
            ownerId: enemy.id,
            x: p.x + p.facingX * 2.8,
            z: p.z + p.facingZ * 2.8,
            dirX: 0,
            dirZ: -1,
            radius: 2.35,
            length: 0,
            elapsed: 0,
            duration: 0.92,
            resolved: false,
            color: "#fbbf24"
          });
        }
        events.push({ type: "telegraph", x: p.x, z: p.z, color: "#f59e0b" });
      }

      const baseA = Math.atan2(toZ, toX);
      if (isSenior) {
        // Senior Manager throws 2 curving golden Calendar Invites that cross paths
        fireEnemyProjectile(state, enemy, Math.cos(baseA - 0.3), Math.sin(baseA - 0.3), {
          kind: "calendar_invite",
          speed: 9.0,
          damage: 11,
          color: "#eab308",
          radius: 0.38,
          ttl: 2.4,
          curveRate: 0.52,
          wallBounces: 1,
          appliesFocusDrain: 12,
          callout: "SYNC INVITE!"
        });
        fireEnemyProjectile(state, enemy, Math.cos(baseA + 0.3), Math.sin(baseA + 0.3), {
          kind: "calendar_invite",
          speed: 9.0,
          damage: 11,
          color: "#eab308",
          radius: 0.38,
          ttl: 2.4,
          curveRate: -0.52,
          wallBounces: 1,
          appliesFocusDrain: 12,
          callout: "SYNC INVITE!"
        });
      } else {
        // Middle Manager flicks a wall-bouncing Calendar Invite!
        fireEnemyProjectile(state, enemy, toX, toZ, {
          kind: "calendar_invite",
          speed: 8.8,
          damage: 10,
          color: "#f59e0b",
          radius: 0.38,
          ttl: 2.6,
          wallBounces: 1,
          appliesFocusDrain: 10,
          callout: "QUICK SYNC!"
        });
      }
    }
    return;
  }

  // === TIER 4: 5 UNIQUE C-SUITE FLOOR BOSSES ===
  rallyNearbyAllies(state, enemy, 8.5);
  moveWithSlide(steerX, steerZ, speed);

  if (enemy.abilityCooldown <= 0) {
    const phase2 = enemy.bossPhase === 2;
    enemy.volleyStep += 1;
    enemy.castTimer = 0.5;
    enemy.abilityCooldown = phase2 ? 2.35 : 3.05;
    const step = enemy.volleyStep % 3;
    const baseAngle = Math.atan2(toZ, toX);

    if (enemy.typeId === "boss_cto") {
      // CTO Chad Sterling: Rotating Server-Blade Spiral + Prod Outage Shockwave + P0 Bugs
      if (step === 1) {
        const blades = phase2 ? 8 : 6;
        const spinOffset = enemy.volleyStep * 0.42;
        for (let b = 0; b < blades; b += 1) {
          const a = spinOffset + (b / blades) * Math.PI * 2;
          fireEnemyProjectile(state, enemy, Math.cos(a), Math.sin(a), {
            kind: "server_blade",
            speed: phase2 ? 9.8 : 8.6,
            damage: phase2 ? 12.5 : 10.5,
            color: "#06b6d4",
            radius: 0.42,
            ttl: 2.5,
            curveRate: phase2 ? 0.32 : 0.18,
            appliesFocusDrain: 9,
            callout: "SERVER BLADE!"
          });
        }
      } else if (step === 2 && countActiveTelegraphs(state) < MAX_CONCURRENT_TELEGRAPHS) {
        state.telegraphs.push({
          id: nextId(state, "tg"),
          kind: "shockwave",
          ownerId: enemy.id,
          x: enemy.x,
          z: enemy.z,
          dirX: 0,
          dirZ: -1,
          radius: phase2 ? 4.8 : 4.0,
          length: 0,
          elapsed: 0,
          duration: 0.78,
          resolved: false,
          color: "#06b6d4"
        });
        events.push({ type: "telegraph", x: enemy.x, z: enemy.z, color: "#06b6d4" });
        if (phase2 && state.outage <= 0) {
          state.outage = 7 * (1 - clamp(state.player.outageResist, 0, 0.65));
          events.push({
            type: "outage_start",
            x: SERVER_STATION.x,
            z: SERVER_STATION.z,
            message: "CTO Chad triggered a Prod Outage! Reboot the IT Server Console!"
          });
        }
      } else if (state.enemies.length < 22) {
        spawnEnemy(state, "bug", rng, events, { x: enemy.x - 1.5, z: enemy.z + 1.2 });
        spawnEnemy(state, "email", rng, events, { x: enemy.x + 1.5, z: enemy.z - 1.2 });
      }
      return;
    }

    if (enemy.typeId === "boss_hr") {
      // Head of HR Diane Vance: Dual Policy Silence Rings + Sweeping Curved PIP Wave + HR Escorts
      if (step === 1) {
        const count = phase2 ? 6 : 4;
        const swing = enemy.volleyStep % 2 === 0 ? 0.55 : -0.55;
        for (let k = 0; k < count; k += 1) {
          const frac = k / (count - 1) - 0.5;
          const a = baseAngle + frac * 0.95;
          fireEnemyProjectile(state, enemy, Math.cos(a), Math.sin(a), {
            kind: "policy_memo",
            speed: phase2 ? 9.6 : 8.4,
            damage: phase2 ? 12 : 10,
            color: "#c026d3",
            radius: 0.4,
            ttl: 2.4,
            curveRate: swing,
            appliesSilence: 2.0,
            appliesFocusDrain: 11,
            callout: "PERFORMANCE REVIEW!"
          });
        }
      } else if (step === 2 && countActiveTelegraphs(state) < MAX_CONCURRENT_TELEGRAPHS) {
        state.telegraphs.push({
          id: nextId(state, "tg"),
          kind: "policy_ring",
          ownerId: enemy.id,
          x: p.x,
          z: p.z,
          dirX: 0,
          dirZ: -1,
          radius: phase2 ? 3.5 : 3.0,
          length: 0,
          elapsed: 0,
          duration: 0.78,
          resolved: false,
          color: "#c026d3"
        });
        events.push({ type: "telegraph", x: p.x, z: p.z, color: "#c026d3" });
      } else if (state.enemies.length < 22) {
        spawnEnemy(state, "hr_specialist", rng, events, { x: enemy.x - 1.6, z: enemy.z + 1.2 });
        spawnEnemy(state, "intern", rng, events, { x: enemy.x + 1.6, z: enemy.z - 1.2 });
      }
      return;
    }

    if (enemy.typeId === "boss_cfo") {
      // CFO Victor Sterling-Hayes: 8-Way Gilded Audit Ledger Nova + Audit Tax Rings + IT Auditors
      if (step === 1) {
        const count = phase2 ? 10 : 8;
        for (let k = 0; k < count; k += 1) {
          const a = baseAngle + (k / count) * Math.PI * 2;
          fireEnemyProjectile(state, enemy, Math.cos(a), Math.sin(a), {
            kind: "audit_ledger",
            speed: phase2 ? 9.0 : 8.0,
            damage: phase2 ? 13 : 11,
            color: "#10b981",
            radius: 0.42,
            ttl: 2.5,
            curveRate: k % 2 === 0 ? 0.35 : -0.35,
            appliesTax: 8,
            appliesFocusDrain: 9,
            callout: "TAX AUDIT!"
          });
        }
      } else if (step === 2 && countActiveTelegraphs(state) < MAX_CONCURRENT_TELEGRAPHS) {
        state.telegraphs.push({
          id: nextId(state, "tg"),
          kind: "tax_ring",
          ownerId: enemy.id,
          x: p.x,
          z: p.z,
          dirX: 0,
          dirZ: -1,
          radius: phase2 ? 3.5 : 3.05,
          length: 0,
          elapsed: 0,
          duration: 0.76,
          resolved: false,
          color: "#10b981"
        });
        events.push({ type: "telegraph", x: p.x, z: p.z, color: "#10b981" });
      } else if (state.enemies.length < 22) {
        spawnEnemy(state, "it_auditor", rng, events, { x: enemy.x - 1.6, z: enemy.z + 1.2 });
        spawnEnemy(state, "analyst", rng, events, { x: enemy.x + 1.6, z: enemy.z - 1.2 });
      }
      return;
    }

    if (enemy.typeId === "boss_coo") {
      // COO Elena Cross: Pincer Cross-Volleys + Sync Lock Ring + Manager Squad Drops
      if (step === 1) {
        const pairs = phase2 ? 3 : 2;
        for (let k = 0; k < pairs; k += 1) {
          const spread = 0.25 + k * 0.22;
          fireEnemyProjectile(state, enemy, Math.cos(baseAngle - spread), Math.sin(baseAngle - spread), {
            kind: "calendar_invite",
            speed: 9.8,
            damage: 12,
            color: "#f97316",
            radius: 0.4,
            ttl: 2.5,
            curveRate: 0.62,
            wallBounces: 1,
            appliesFocusDrain: 10,
            callout: "OPS DIRECTIVE!"
          });
          fireEnemyProjectile(state, enemy, Math.cos(baseAngle + spread), Math.sin(baseAngle + spread), {
            kind: "calendar_invite",
            speed: 9.8,
            damage: 12,
            color: "#f97316",
            radius: 0.4,
            ttl: 2.5,
            curveRate: -0.62,
            wallBounces: 1,
            appliesFocusDrain: 10,
            callout: "OPS DIRECTIVE!"
          });
        }
      } else if (step === 2 && countActiveTelegraphs(state) < MAX_CONCURRENT_TELEGRAPHS) {
        state.telegraphs.push({
          id: nextId(state, "tg"),
          kind: "meeting_ring",
          ownerId: enemy.id,
          x: p.x,
          z: p.z,
          dirX: 0,
          dirZ: -1,
          radius: phase2 ? 3.5 : 3.0,
          length: 0,
          elapsed: 0,
          duration: 0.74,
          resolved: false,
          color: "#f97316"
        });
        events.push({ type: "telegraph", x: p.x, z: p.z, color: "#f97316" });
      } else if (state.enemies.length < 22) {
        spawnEnemy(state, "manager", rng, events, { x: enemy.x - 1.5, z: enemy.z + 1.2 });
        spawnEnemy(state, "intern", rng, events, { x: enemy.x + 1.5, z: enemy.z - 1.2 });
      }
      return;
    }

    // CEO Arthur Pendelton (Floor 50 Final Boss): Imperial Rotating Golden Directives + Chained Executive Rings
    if (step === 1) {
      const count = phase2 ? 12 : 8;
      const offset = enemy.volleyStep * 0.28;
      for (let k = 0; k < count; k += 1) {
        const a = offset + (k / count) * Math.PI * 2;
        fireEnemyProjectile(state, enemy, Math.cos(a), Math.sin(a), {
          kind: "exec_directive",
          speed: phase2 ? 10.2 : 9.0,
          damage: phase2 ? 14 : 12,
          color: "#eab308",
          radius: 0.44,
          ttl: 2.6,
          curveRate: phase2 ? 0.28 : 0,
          appliesFocusDrain: 12,
          callout: "EXECUTIVE ORDER!"
        });
      }
    } else if (step === 2 && countActiveTelegraphs(state) < MAX_CONCURRENT_TELEGRAPHS) {
      state.telegraphs.push({
        id: nextId(state, "tg"),
        kind: "meeting_ring",
        ownerId: enemy.id,
        x: p.x,
        z: p.z,
        dirX: 0,
        dirZ: -1,
        radius: phase2 ? 3.6 : 3.1,
        length: 0,
        elapsed: 0,
        duration: 0.76,
        resolved: false,
        color: "#eab308"
      });
      if (phase2) {
        state.telegraphs.push({
          id: nextId(state, "tg"),
          kind: "shockwave",
          ownerId: enemy.id,
          x: enemy.x,
          z: enemy.z,
          dirX: 0,
          dirZ: -1,
          radius: 4.8,
          length: 0,
          elapsed: 0,
          duration: 0.8,
          resolved: false,
          color: "#ef4444"
        });
      }
      events.push({ type: "telegraph", x: p.x, z: p.z, color: "#eab308" });
    } else if (state.enemies.length < 22) {
      spawnEnemy(state, "manager", rng, events, { x: enemy.x - 1.6, z: enemy.z + 1.2 });
      spawnEnemy(state, "analyst", rng, events, { x: enemy.x + 1.6, z: enemy.z - 1.2 });
    }
  }
}

function triggerOfficeEvent(state: GameState, rng: () => number, events: SimEvent[]): void {
  const options = ["outage", "ambush", "bugstorm"];
  if (state.chapter.weekday === "Wednesday") options.push("outage", "bugstorm");
  const pick = options[Math.floor(rng() * options.length)];

  if (pick === "outage") {
    state.outage = 11 * (1 - clamp(state.player.outageResist, 0, 0.7));
    events.push({
      type: "outage_start",
      x: SERVER_STATION.x,
      z: SERVER_STATION.z,
      message: "Internet Outage! Head to the IT Server Room to reboot (+$55)."
    });
  } else if (pick === "ambush") {
    const allowed = state.chapter.allowedEnemies;
    const leader: EnemyTypeId = allowed.includes("senior_manager")
      ? "senior_manager"
      : allowed.includes("manager")
      ? "manager"
      : "tech_lead";
    spawnEnemy(state, leader, rng, events);
    events.push({
      type: "toast",
      message: `Calendar Ambush: ${ENEMY_ARCHETYPES[leader].name} wants an impromptu sync!`
    });
  } else {
    spawnEnemy(state, "bug", rng, events);
    spawnEnemy(state, "bug", rng, events);
    events.push({
      type: "toast",
      message: "Production Bug Swarm spotted near the Engineering Bullpen!"
    });
  }
}
