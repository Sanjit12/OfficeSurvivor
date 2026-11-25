import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPerk,
  countLivingByTier,
  createDefaultSave,
  createGameState,
  damageEnemy,
  formatWorkClock,
  getFlowMultiplier,
  getSpawnCaps,
  isPointBlocked,
  loadSaveFromStorage,
  moveWithCollisions,
  openQueuedUpgrade,
  pickEnemyArchetype,
  purchaseShopUpgrade,
  rerollPendingPerks,
  resolveDilemma,
  spawnEnemy,
  stepSimulation,
  triggerDodgeRoll,
  triggerSignatureSkill
} from "./rules";
import {
  ALL_STATIONS,
  CAMPUS_DOORWAYS,
  CFO_TERMINAL_STATION,
  DIFFICULTIES,
  EMPLOYEE_CLASSES,
  ENEMY_ARCHETYPES,
  getDoorwaySteerTarget,
  getRoomAtPosition,
  HIERARCHY_LIST,
  HR_SHREDDER_STATION,
  LEGACY_SAVE_KEY,
  LOUNGE_STATION,
  OFFICE_OBSTACLES,
  OFFICE_ROOMS,
  OFFICE_WEAPONS,
  PRINTER_STATION,
  STORY_CHAPTERS,
  WASHROOM_STATION,
  WHITEBOARD_STATION
} from "./data";
import {
  clampFpsPitch,
  computeFpsMoveVector,
  createDefaultSettings,
  formatKeyLabel,
  loadSettingsFromStorage,
  persistSettingsToStorage,
  rebindKeyAction
} from "./settings";
import { getEmployeePortraitSvg, getEnemyPortraitSvg, getWeaponIconSvg } from "../ui/portraits";
import type { InputSnapshot } from "./types";

const idleInput: InputSnapshot = {
  moveX: 0,
  moveZ: 0,
  dodgePressed: false,
  skillPressed: false,
  aimMode: "auto",
  aimActive: false,
  aimWorldX: 0,
  aimWorldZ: 0
};

test("10-room campus spawn, all 14 doorways, and all 8 interactive stations are unobstructed", () => {
  assert.equal(OFFICE_ROOMS.length, 10);
  assert.equal(ALL_STATIONS.length, 8);
  assert.equal(isPointBlocked(0, 0, 0.62), false, "Central atrium spawn must be clear");
  assert.equal(getRoomAtPosition(0, 0).id, "atrium");

  for (const door of CAMPUS_DOORWAYS) {
    assert.equal(
      isPointBlocked(door.x, door.z, 0.62),
      false,
      `Doorway between ${door.rooms[0]} and ${door.rooms[1]} must be clear`
    );
  }

  for (const station of ALL_STATIONS) {
    assert.equal(
      isPointBlocked(station.x, station.z, 0.62),
      false,
      `${station.label} must not overlap obstacles or walls`
    );
  }
});

test("doorway navigation steers cross-room actors through a real doorway", () => {
  const target = getDoorwaySteerTarget(-26, -20, 0, 0); // CEO Suite -> Atrium
  assert.ok(Math.hypot(target.x, target.z) < 28, "Cross-room steering should target an opening");
  assert.equal(getRoomAtPosition(-26, -20).id, "ceo_suite");
  assert.equal(getRoomAtPosition(-26, 20).id, "washrooms");
  assert.equal(getRoomAtPosition(17, 20).id, "cafeteria");
  assert.equal(getRoomAtPosition(31, 20).id, "lounge");
  assert.equal(getRoomAtPosition(26, 0).id, "it_room");
});

test("obstacle collision pushes entities cleanly outside furniture and wall footprints", () => {
  const desk = OFFICE_OBSTACLES.find((o) => o.kind === "desk")!;
  const actor = { x: desk.x, z: desk.z };
  const collided = moveWithCollisions(actor, 0, 0, 0.62);
  assert.equal(collided, true);
  assert.equal(isPointBlocked(actor.x, actor.z, 0.61), false);
});

test("permanent shop upgrades deduct salary and scale stats on new run", () => {
  const save = createDefaultSave();
  save.bank = 200;
  const buy = purchaseShopUpgrade(save, "laptop");
  assert.equal(buy.ok, true);
  assert.equal(save.upgrades.laptop, 1);
  assert.equal(save.bank, 125);

  const baseState = createGameState(createDefaultSave(), "junior");
  const upgradedState = createGameState(save, "junior");
  assert.ok(upgradedState.player.productivity > baseState.player.productivity);
});

test("workday clock formats 9:00 AM through 5:00 PM accurately", () => {
  assert.equal(formatWorkClock(0, 210), "9:00 AM");
  assert.equal(formatWorkClock(105, 210), "1:00 PM");
  assert.equal(formatWorkClock(210, 210), "5:00 PM");
});

test("level-ups queue without freezing combat and open on demand with reroll", () => {
  const save = createDefaultSave();
  const state = createGameState(save, "senior");
  assert.ok(state.xpNeeded >= 120, "Initial XP threshold should pace early game smoothly");

  const boss = spawnEnemy(state, "boss_cto", () => 0.5);
  state.xp = state.xpNeeded - 20;
  damageEnemy(state, boss, boss.hp + 10, true, [], () => 0.5);

  assert.equal(state.screen, "playing");
  assert.ok(state.pendingLevelUps >= 1);

  assert.equal(openQueuedUpgrade(state, () => 0.4), true);
  assert.equal(state.screen, "upgrade");
  assert.equal(state.pendingPerks.length, 3);

  state.salary = 100;
  const firstIds = state.pendingPerks.map((p) => p.id).join(",");
  assert.equal(rerollPendingPerks(state, () => 0.7), true);
  assert.equal(state.pendingPerks.length, 3);
  assert.notEqual(state.pendingPerks.map((p) => p.id).join(","), firstIds);
});

test("universal dodge roll grants i-frames, cooldown, and trims meeting lock", () => {
  const save = createDefaultSave();
  const state = createGameState(save, "senior");
  state.meetingLock = 1.0;
  state.player.invuln = 0;

  assert.equal(triggerDodgeRoll(state, 1, 0, []), true);
  assert.ok(state.player.dodgeTimer > 0);
  assert.ok(state.player.dodgeCooldown > 0);
  assert.ok(state.player.invuln > 0);
  assert.ok(state.meetingLock < 1.0);
  assert.equal(triggerDodgeRoll(state, 1, 0, []), false, "Cannot dodge while on cooldown");
});

test("weapon evolution unlocks at min level with employee synergy perk", () => {
  const save = createDefaultSave();
  const state = createGameState(save, "qa");
  state.level = 3;
  state.pendingLevelUps = 1;
  state.screen = "upgrade";
  const events: ReturnType<typeof stepSimulation> = [];

  assert.equal(state.player.weaponEvolved, false);
  assert.equal(applyPerk(state, "rubber_duck", events), true);
  assert.equal(state.player.weaponEvolved, true);
  assert.ok(state.player.ricochet >= 2);
  assert.ok(events.some((e) => e.type === "evolve"));
});

test("C-Suite boss transitions to Phase II based on difficulty threshold", () => {
  const save = createDefaultSave();
  const stdState = createGameState(save, "senior", 1, "standard");
  const boss = spawnEnemy(stdState, "boss_cto", () => 0.5);
  assert.equal(boss.bossPhase, 1);

  const events: ReturnType<typeof stepSimulation> = [];
  damageEnemy(stdState, boss, boss.maxHp * 0.55, false, events, () => 0.5);
  assert.equal(boss.bossPhase, 2);
  assert.ok(events.some((e) => e.type === "boss_phase"));

  // Executive Nightmare triggers Phase II earlier (at 65% HP)
  const nightState = createGameState(save, "senior", 5, "nightmare");
  const ceo = spawnEnemy(nightState, "boss_ceo", () => 0.5);
  damageEnemy(nightState, ceo, ceo.maxHp * 0.4, false, [], () => 0.5);
  assert.equal(ceo.bossPhase, 2);
});

test("IT Auditor directional Firewall Shield blocks frontal non-pierce shots but not flanks or pierce", () => {
  const save = createDefaultSave();
  const state = createGameState(save, "junior");
  const auditor = spawnEnemy(state, "it_auditor", () => 0.5);
  auditor.x = 5;
  auditor.z = 0;
  // Facing left (-X) directly toward player at (0, 0)
  auditor.facingX = -1;
  auditor.facingZ = 0;

  const hp0 = auditor.hp;
  // Shot moving +X hits the front shield (-1 dot +1 = -1 -> frontal hit)
  damageEnemy(state, auditor, 20, false, [], () => 0.5, undefined, 1, 0, false);
  const frontDamage = hp0 - auditor.hp;
  assert.ok(frontDamage < 10, `Expected frontal shield block (<10 dmg), got ${frontDamage}`);

  const hp1 = auditor.hp;
  // Flank shot from behind moving -X (-1 dot -1 = +1 -> rear hit)
  damageEnemy(state, auditor, 20, false, [], () => 0.5, undefined, -1, 0, false);
  const flankDamage = hp1 - auditor.hp;
  assert.ok(flankDamage >= 19, `Expected full flank damage (>=19), got ${flankDamage}`);

  const hp2 = auditor.hp;
  // Frontal piercing shot bypasses Firewall Shield
  damageEnemy(state, auditor, 20, false, [], () => 0.5, undefined, 1, 0, true);
  const pierceDamage = hp2 - auditor.hp;
  assert.ok(pierceDamage >= 19, `Expected piercing bypass (>=19), got ${pierceDamage}`);
});

test("interactive room stations (Whiteboard, Printer, Washroom, Lounge, HR Shredder, CFO Terminal) activate cleanly", () => {
  const save = createDefaultSave();
  const state = createGameState(save, "junior");

  // Boardroom Whiteboard
  state.player.x = WHITEBOARD_STATION.x;
  state.player.z = WHITEBOARD_STATION.z;
  stepSimulation(state, save, 0.04, idleInput, () => 0.5);
  assert.ok(state.whiteboardBuffTimer > 0);
  assert.equal(state.currentRoomId, "boardroom");

  // Bullpen Turbo Printer
  state.stationCooldowns.printer = 0;
  state.player.x = PRINTER_STATION.x;
  state.player.z = PRINTER_STATION.z;
  const salaryBefore = state.salary;
  stepSimulation(state, save, 0.04, idleInput, () => 0.5);
  assert.ok(state.salary >= salaryBefore + 35);

  // Washroom Freshen-Up cleanses HR Policy Silence & Meeting Lock + grants Haste
  state.policySilenceTimer = 4.0;
  state.meetingLock = 2.0;
  state.player.x = WASHROOM_STATION.x;
  state.player.z = WASHROOM_STATION.z;
  stepSimulation(state, save, 0.04, idleInput, () => 0.5);
  assert.equal(state.policySilenceTimer, 0);
  assert.equal(state.meetingLock, 0);
  assert.ok(state.hasteTimer > 0);

  // Casual Lounge Nap Pod grants Morale Shield
  state.player.x = LOUNGE_STATION.x;
  state.player.z = LOUNGE_STATION.z;
  stepSimulation(state, save, 0.04, idleInput, () => 0.5);
  assert.ok(state.player.moraleShield >= 24);

  // HR Policy Shredder resets Signature Skill cooldown
  state.player.skillCooldown = 10;
  state.player.x = HR_SHREDDER_STATION.x;
  state.player.z = HR_SHREDDER_STATION.z;
  stepSimulation(state, save, 0.04, idleInput, () => 0.5);
  assert.equal(state.player.skillCooldown, 0);

  // CFO Audit Terminal enables 2x Salary surge
  state.stationCooldowns.cfo_terminal = 0;
  state.player.x = CFO_TERMINAL_STATION.x;
  state.player.z = CFO_TERMINAL_STATION.z;
  stepSimulation(state, save, 0.04, idleInput, () => 0.5);
  assert.ok(state.salaryBoostTimer > 0);
});

test("HR Policy Silence blocks signature skill until cleansed", () => {
  const save = createDefaultSave();
  const state = createGameState(save, "junior");
  state.policySilenceTimer = 3.0;
  const events: ReturnType<typeof stepSimulation> = [];
  assert.equal(triggerSignatureSkill(state, events), false);
  assert.ok(events.some((e) => e.type === "toast"));
});

test("4 difficulty tiers, 5 tower floors, and v2-to-v3 save migration work cleanly", () => {
  assert.equal(DIFFICULTIES.length, 4);
  assert.equal(STORY_CHAPTERS.length, 5);
  assert.deepEqual(
    STORY_CHAPTERS.map((c) => c.floorNumber),
    [12, 24, 32, 42, 50]
  );

  const save = createDefaultSave();
  const internState = createGameState(save, "junior", 1, "intern");
  const nightState = createGameState(save, "junior", 1, "nightmare");
  const internBug = spawnEnemy(internState, "bug", () => 0.5);
  const nightBug = spawnEnemy(nightState, "bug", () => 0.5);
  assert.ok(nightBug.maxHp > internBug.maxHp * 1.5);

  // Migrate legacy v2 save seamlessly
  const mem = new Map<string, string>();
  mem.set(
    LEGACY_SAVE_KEY,
    JSON.stringify({
      day: 3,
      selectedDay: 2,
      highestDayCleared: 2,
      selectedDifficulty: "crunch",
      bank: 420,
      selectedClass: "qa",
      upgrades: { laptop: 2 },
      achievements: ["Survived Monday"]
    })
  );
  const storage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    }
  };
  const migrated = loadSaveFromStorage(storage);
  assert.equal(migrated.bank, 420);
  assert.equal(migrated.selectedClass, "qa");
  assert.equal(migrated.highestDayCleared, 2);
  assert.equal(migrated.floorBestDifficulty[1], "crunch");
  assert.equal(migrated.floorBestDifficulty[2], "crunch");
});

test("all 4 playable employees and all 17 corporate ranks have valid inline SVG portraits", () => {
  assert.equal(HIERARCHY_LIST.length, 17);
  for (const emp of EMPLOYEE_CLASSES) {
    const svg = getEmployeePortraitSvg(emp.id);
    assert.ok(svg.startsWith("<svg") && svg.includes("</svg>"), `Missing SVG for ${emp.id}`);
  }
  for (const enemy of HIERARCHY_LIST) {
    const svg = getEnemyPortraitSvg(enemy.id);
    assert.ok(svg.startsWith("<svg") && svg.includes("</svg>"), `Missing SVG for ${enemy.id}`);
  }
});

test("settings keybind rebinding swaps duplicates and rejects reserved keys", () => {
  const settings = createDefaultSettings();
  const bad = rebindKeyAction(settings, "dodge", "Escape");
  assert.equal(bad.ok, false);

  const swap = rebindKeyAction(settings, "dodge", "e");
  assert.equal(swap.ok, true);
  assert.equal(swap.swappedWith, "claimPerk");
  assert.equal(settings.bindings.dodge, "e");
  assert.equal(settings.bindings.claimPerk, "shift");
  assert.equal(formatKeyLabel(" "), "SPACE");
});

test("each employee signature skill triggers its distinct mechanic", () => {
  const save = createDefaultSave();
  const maya = createGameState(save, "junior");
  assert.equal(triggerSignatureSkill(maya, []), true);
  assert.equal(maya.projectiles.length, 6);

  const marcus = createGameState(save, "senior");
  marcus.meetingLock = 2;
  const bug = spawnEnemy(marcus, "bug", () => 0.5);
  bug.x = 2.0;
  bug.z = 0;
  const hpBefore = bug.hp;
  assert.equal(triggerSignatureSkill(marcus, []), true);
  assert.equal(marcus.meetingLock, 0);
  assert.ok(bug.hp < hpBefore);

  const priya = createGameState(save, "qa");
  const mgr = spawnEnemy(priya, "manager", () => 0.5);
  mgr.x = 2.5;
  mgr.z = 0;
  assert.equal(triggerSignatureSkill(priya, []), true);
  assert.ok(priya.telegraphs.some((t) => t.kind === "stasis_field"));

  const devon = createGameState(save, "devops");
  devon.player.energy = 50;
  assert.equal(triggerSignatureSkill(devon, []), true);
  assert.equal(devon.drones.length, 1);
  assert.equal(devon.player.energy, 68);
});

test("lunch dilemma triggers at 12:30 PM and resolves choice effects", () => {
  const save = createDefaultSave();
  const state = createGameState(save, "junior");
  state.elapsed = state.dayLength * (211 / 480);
  const events = stepSimulation(state, save, 0.03, idleInput, () => 0.5);
  assert.equal(state.screen, "dilemma");
  assert.ok(state.activeDilemma);
  assert.ok(events.some((e) => e.type === "dilemma"));

  const resolved = resolveDilemma(state, state.activeDilemma!.choices[0].id);
  assert.ok(resolved);
  assert.equal(state.screen, "playing");
});

test("burnout loss condition is reachable and flow multiplier scales", () => {
  const save = createDefaultSave();
  const state = createGameState(save, "junior");
  state.salary = 100;
  state.player.energy = 0;
  const events = stepSimulation(state, save, 0.03, idleInput, () => 0.5);
  assert.equal(state.screen, "gameover");
  assert.ok(save.bank > 0);
  assert.ok(events.some((e) => e.type === "defeat"));
  assert.equal(getFlowMultiplier(0), 1);
  assert.equal(getFlowMultiplier(5), 1.5);
  assert.equal(getFlowMultiplier(20), 3);
});

test("FPS movement math is camera-relative and FPS settings persist cleanly", () => {
  const north = computeFpsMoveVector(1, 0, 0);
  assert.ok(Math.abs(north.moveX) < 1e-6);
  assert.ok(Math.abs(north.moveZ - -1) < 1e-6);

  const rightFromNorth = computeFpsMoveVector(0, 1, 0);
  assert.ok(Math.abs(rightFromNorth.moveX - 1) < 1e-6);
  assert.ok(Math.abs(rightFromNorth.moveZ) < 1e-6);

  const east = computeFpsMoveVector(1, 0, -Math.PI / 2);
  assert.ok(Math.abs(east.moveX - 1) < 1e-6);
  assert.ok(Math.abs(east.moveZ) < 1e-6);

  const diag = computeFpsMoveVector(1, 1, 0.4);
  assert.ok(Math.abs(Math.hypot(diag.moveX, diag.moveZ) - 1) < 1e-6);

  assert.ok(clampFpsPitch(2.0) <= 0.52);
  assert.ok(clampFpsPitch(-2.0) >= -0.56);

  const mem = new Map<string, string>();
  const storage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    }
  };
  const s = createDefaultSettings();
  s.camera.viewMode = "fps";
  s.camera.mouseSensitivity = 1.4;
  s.bindings.toggleView = "f";
  persistSettingsToStorage(s, storage);

  const loaded = loadSettingsFromStorage(storage);
  assert.equal(loaded.camera.viewMode, "fps");
  assert.equal(loaded.camera.mouseSensitivity, 1.4);
  assert.equal(loaded.bindings.toggleView, "f");
});

test("spawn pacing stays calm, caps total enemies, and keeps Tier 2/3 heavies rare relative to Tier 1", () => {
  const save = createDefaultSave();
  const state = createGameState(save, "junior", 1, "standard");

  const earlyCaps = getSpawnCaps(state);
  assert.ok(earlyCaps.totalCap <= 10, `Early cap should stay calm (<=10), got ${earlyCaps.totalCap}`);
  assert.ok(earlyCaps.tier3Cap <= earlyCaps.tier2Cap);
  assert.ok(earlyCaps.tier2Cap < earlyCaps.totalCap);

  // Mid-shift distribution check: Tier 1 should clearly outnumber Tier 2 + Tier 3
  state.elapsed = state.dayLength * 0.52;
  let seed = 1337;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const rolledTiers = { 1: 0, 2: 0, 3: 0 };
  for (let i = 0; i < 200; i++) {
    const kind = pickEnemyArchetype(state, rng);
    const tier = ENEMY_ARCHETYPES[kind].rankTier as 1 | 2 | 3;
    rolledTiers[tier]++;
  }
  assert.ok(
    rolledTiers[1] > (rolledTiers[2] + rolledTiers[3]) * 2,
    `Tier 1 (${rolledTiers[1]}) should strongly outnumber Tier 2 (${rolledTiers[2]}) + Tier 3 (${rolledTiers[3]})`
  );
  assert.ok(
    rolledTiers[3] < rolledTiers[2],
    `Tier 3 elites (${rolledTiers[3]}) should be rarer than Tier 2 leads (${rolledTiers[2]})`
  );

  // Hard per-tier caps: once filled, pickEnemyArchetype never returns capped heavy tiers
  const midCaps = getSpawnCaps(state);
  for (let i = 0; i < midCaps.tier2Cap; i++) spawnEnemy(state, "tech_lead", rng);
  for (let i = 0; i < midCaps.tier3Cap; i++) spawnEnemy(state, "manager", rng);
  const counts = countLivingByTier(state);
  assert.equal(counts.tier2, midCaps.tier2Cap);
  assert.equal(counts.tier3, midCaps.tier3Cap);
  for (let i = 0; i < 60; i++) {
    const kind = pickEnemyArchetype(state, rng);
    assert.equal(
      ENEMY_ARCHETYPES[kind].rankTier,
      1,
      `Expected Tier 1 fallback when Tier 2 & 3 caps are full, got ${kind}`
    );
  }

  // Simulated 35s Floor 1 shift stays bounded and never floods with heavies
  const sim = createGameState(save, "senior", 1, "standard");
  sim.player.invuln = 99;
  for (let step = 0; step < 350; step++) {
    stepSimulation(sim, save, 0.1, idleInput, rng);
  }
  const simCaps = getSpawnCaps(sim);
  const simCounts = countLivingByTier(sim);
  assert.ok(simCounts.total <= simCaps.totalCap + 2, `Total enemies (${simCounts.total}) exceeded cap (${simCaps.totalCap})`);
  assert.ok(simCounts.tier3 <= simCaps.tier3Cap, `Tier 3 count (${simCounts.tier3}) exceeded cap (${simCaps.tier3Cap})`);
  assert.ok(simCounts.tier2 <= simCaps.tier2Cap, `Tier 2 count (${simCounts.tier2}) exceeded cap (${simCaps.tier2Cap})`);
});

test("all 10 selectable office item weapons have SVG art, distinct firing patterns, and splash/slow/mark mechanics", () => {
  assert.equal(OFFICE_WEAPONS.length, 10);
  const required = ["stapler", "mouse", "keyboard", "phone", "bottle", "tablet", "monitor", "mug", "scissors", "tape"];
  for (const id of required) {
    assert.ok(OFFICE_WEAPONS.some((w) => w.id === id), `Missing office weapon: ${id}`);
    const svg = getWeaponIconSvg(id as (typeof OFFICE_WEAPONS)[number]["id"]);
    assert.ok(svg.startsWith("<svg") && svg.includes("</svg>"), `Missing SVG icon for ${id}`);
  }

  const save = createDefaultSave();
  assert.equal(save.selectedWeapon, "stapler");

  // Mechanical Keyboard fires 4-keycap shotgun spread
  const kbState = createGameState(save, "junior", 1, "standard", "keyboard");
  const targetA = spawnEnemy(kbState, "manager", () => 0.5);
  targetA.x = 4;
  targetA.z = 0;
  kbState.player.shootTimer = 0;
  stepSimulation(kbState, save, 0.05, idleInput, () => 0.99);
  const kbShots = kbState.projectiles.filter((p) => !p.fromEnemy && p.weaponId === "keyboard");
  assert.equal(kbShots.length, 4, `Expected 4 keyboard keycap shots, got ${kbShots.length}`);

  // Hydro Water Bottle splashes nearby enemies and applies slow
  const botState = createGameState(save, "senior", 1, "standard", "bottle");
  const e1 = spawnEnemy(botState, "manager", () => 0.5);
  const e2 = spawnEnemy(botState, "manager", () => 0.5);
  e1.x = 3.0;
  e1.z = 0;
  e2.x = 4.2;
  e2.z = 0.6;
  const e2HpBefore = e2.hp;
  botState.player.shootTimer = 0;
  for (let i = 0; i < 6; i++) {
    stepSimulation(botState, save, 0.05, idleInput, () => 0.99);
  }
  assert.ok(e1.slowTimer > 0, "Hydro Water Bottle hit should slow primary target");
  assert.ok(e2.hp < e2HpBefore, "Hydro Water Bottle should deal AoE splash damage to nearby enemy");
  assert.ok(e2.slowTimer > 0, "Hydro Water Bottle splash should slow nearby enemy");

  // Company Phone marks target and has built-in ricochet
  const phoneState = createGameState(save, "junior", 1, "standard", "phone");
  assert.ok(phoneState.player.ricochet >= 1);
  const pe = spawnEnemy(phoneState, "manager", () => 0.5);
  pe.x = 3.0;
  pe.z = 0;
  phoneState.player.shootTimer = 0;
  for (let i = 0; i < 5; i++) {
    stepSimulation(phoneState, save, 0.05, idleInput, () => 0.99);
  }
  assert.ok(pe.markedTimer > 0, "Company Phone hit should apply crit mark");

  // 27" Monitor is heavy siege cannon with built-in pierce & high damage
  const monState = createGameState(save, "junior", 1, "standard", "monitor");
  assert.ok(monState.player.pierce >= 1);
  assert.ok(monState.weapon.damageMult >= 2.0);
});


