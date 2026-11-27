import "./index.css";
import { SoundEngine } from "./game/audio";
import { getChapterForDay } from "./game/data";
import {
  applyPerk,
  createDefaultSave,
  createGameState,
  loadSaveFromStorage,
  openQueuedUpgrade,
  persistSaveToStorage,
  purchaseShopUpgrade,
  rerollPendingPerks,
  resolveDilemma,
  stepSimulation,
  triggerDodgeRoll,
  triggerSignatureSkill
} from "./game/rules";
import {
  computeFpsMoveVector,
  createDefaultSettings,
  formatKeyLabel,
  loadSettingsFromStorage,
  normalizeKeyToken,
  persistSettingsToStorage,
  rebindKeyAction
} from "./game/settings";
import type {
  DifficultyId,
  EmployeeClassId,
  GameSettings,
  GameState,
  InputSnapshot,
  KeyAction,
  OfficeWeaponId,
  SimEvent
} from "./game/types";
import { WorldRenderer } from "./scene/worldRenderer";
import { HudController } from "./ui/hudController";
import { TouchJoystickController } from "./ui/touchJoysticks";
import { combineMoveVectors, computeFpsStickLookDelta } from "./game/joystick";

const mount = document.getElementById("canvasMount")!;
let save = loadSaveFromStorage(window.localStorage);
let settings = loadSettingsFromStorage(window.localStorage);
let game: GameState | null = null;
let rebindingAction: KeyAction | null = null;

const sound = new SoundEngine();
sound.applySettings(settings.audio);
const renderer = new WorldRenderer(mount, save.selectedClass, save.selectedWeapon, settings);
renderer.setFloorTheme(getChapterForDay(save.selectedDay || save.day).themeColor);

// Unified input hub: continuous held states + single-frame edge buffers
const heldKeys = new Set<string>();
let dodgeBufferTimer = 0;
let skillBufferTimer = 0;
let pointerDown = false;
let pointerHasMoved = false;
let pointerClientX = 0;
let pointerClientY = 0;
let titleDragActive = false;
let titleDragLastX = 0;
let fpsDragActive = false;
let fpsDragLastX = 0;
let fpsDragLastY = 0;

const joysticks = new TouchJoystickController(() => sound.unlock());

function exitPointerLockSafe(): void {
  try {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  } catch {
    // Ignore pointer lock errors in restricted iframes
  }
}

function requestPointerLockSafe(el: HTMLElement): void {
  try {
    const res = (el as HTMLElement & { requestPointerLock?: () => Promise<void> | void }).requestPointerLock?.();
    if (res && typeof (res as Promise<void>).catch === "function") {
      (res as Promise<void>).catch(() => {});
    }
  } catch {
    // Fallback drag-look & arrow-key look remain active automatically
  }
}

function clearInputs(): void {
  heldKeys.clear();
  pointerDown = false;
  fpsDragActive = false;
  dodgeBufferTimer = 0;
  skillBufferTimer = 0;
  joysticks.reset();
}

function toggleCameraViewMode(): void {
  const nextMode = settings.camera.viewMode === "fps" ? "third" : "fps";
  settings.camera.viewMode = nextMode;
  if (nextMode === "fps") {
    const yaw = game ? Math.atan2(-game.player.facingX, -game.player.facingZ) : 0;
    renderer.resetFpsLook(yaw, -0.05);
  } else {
    exitPointerLockSafe();
  }
  applyAllSettings(settings, true);
  const toggleKey = formatKeyLabel(settings.bindings.toggleView);
  hud.showToast(
    nextMode === "fps"
      ? `First-Person View — Click to look (or drag / arrows). Press [${toggleKey}] for 3P.`
      : `Third-Person View restored. Press [${toggleKey}] for FPS.`
  );
}

function applyAllSettings(next: GameSettings, playTick = false): void {
  const wasFps = settings.camera.viewMode === "fps";
  settings = next;
  if (wasFps && settings.camera.viewMode !== "fps") {
    exitPointerLockSafe();
  }
  persistSettingsToStorage(settings, window.localStorage);
  sound.applySettings(settings.audio);
  renderer.applySettings(settings);
  hud.syncSettingsUi(settings, rebindingAction);
  if (playTick) {
    sound.unlock();
    sound.uiTick();
  }
}

function handleSimEvents(events: SimEvent[]): void {
  for (const ev of events) {
    switch (ev.type) {
      case "shoot":
        sound.shoot((ev.weight || 0) > 0.4);
        break;
      case "hit":
        sound.hit(false);
        if (ev.x !== undefined && ev.z !== undefined) {
          renderer.spawnBurst(ev.x, ev.z, ev.color || "#f8fafc", 5, 4.2);
        }
        break;
      case "crit":
        sound.hit(true);
        if (ev.x !== undefined && ev.z !== undefined) {
          renderer.spawnBurst(ev.x, ev.z, "#fbbf24", 10, 6.2);
        }
        break;
      case "kill":
        sound.kill((ev.weight || 0) > 1.0);
        if (ev.x !== undefined && ev.z !== undefined) {
          renderer.spawnBurst(
            ev.x,
            ev.z,
            ev.color || "#38bdf8",
            (ev.weight || 0) > 1.0 ? 28 : 12,
            (ev.weight || 0) > 1.0 ? 8.5 : 5.4
          );
        }
        break;
      case "player_hit":
        sound.playerHit();
        if (ev.x !== undefined && ev.z !== undefined) {
          renderer.spawnBurst(ev.x, ev.z, ev.color || "#ef4444", 14, 6.0);
        }
        break;
      case "dodge":
        sound.dodge();
        if (ev.x !== undefined && ev.z !== undefined) {
          renderer.spawnBurst(ev.x, ev.z, ev.color || "#7dd3fc", 12, 5.2);
        }
        break;
      case "skill":
        sound.skill();
        if (ev.x !== undefined && ev.z !== undefined) {
          renderer.spawnBurst(ev.x, ev.z, ev.color || "#28b89d", 20, 7.5);
        }
        break;
      case "orb":
        sound.orb();
        break;
      case "pickup":
        sound.pickup();
        if (ev.x !== undefined && ev.z !== undefined) {
          renderer.spawnBurst(ev.x, ev.z, ev.color || "#fbbf24", 10, 4.5);
        }
        break;
      case "station_buff":
        sound.stationBuff();
        if (ev.x !== undefined && ev.z !== undefined) {
          renderer.spawnBurst(ev.x, ev.z, ev.color || "#38bdf8", 18, 6.8);
        }
        if (ev.message) hud.showToast(ev.message);
        break;
      case "telegraph":
        sound.telegraph();
        break;
      case "level_up":
        sound.levelUp();
        if (ev.x !== undefined && ev.z !== undefined) {
          renderer.spawnBurst(ev.x, ev.z, "#28b89d", 24, 7.0);
        }
        hud.showToast(
          `Level Up Ready! Press [${formatKeyLabel(settings.bindings.claimPerk)}] when ready to claim.`
        );
        break;
      case "evolve":
        sound.evolve();
        if (ev.x !== undefined && ev.z !== undefined) {
          renderer.spawnBurst(ev.x, ev.z, "#fbbf24", 30, 8.2);
        }
        if (ev.message) hud.showToast(ev.message);
        break;
      case "boss_spawn":
        sound.bossSpawn();
        if (ev.message) hud.showToast(ev.message);
        break;
      case "boss_phase":
        sound.bossPhase();
        if (ev.x !== undefined && ev.z !== undefined) {
          renderer.spawnBurst(ev.x, ev.z, "#ef4444", 26, 8.0);
        }
        if (ev.message) hud.showToast(ev.message);
        break;
      case "outage_start":
      case "outage_clear":
      case "toast":
        if (ev.message) hud.showToast(ev.message);
        if (ev.type === "outage_clear" && ev.x !== undefined && ev.z !== undefined) {
          sound.pickup();
          renderer.spawnBurst(ev.x, ev.z, "#38bdf8", 22, 6.8);
        }
        break;
      case "room_change":
        // Room plate & minimap update live every frame without toast spam
        break;
      case "comms":
        if (ev.speaker && ev.message) {
          hud.showComms(
            ev.speaker,
            ev.role || "Apex Corp",
            ev.avatarColor || "#28b89d",
            ev.message,
            ev.portraitId
          );
        }
        break;
      case "victory":
        sound.victory();
        persistSaveToStorage(save, window.localStorage);
        hud.renderTitle(save);
        break;
      case "defeat":
        sound.defeat();
        persistSaveToStorage(save, window.localStorage);
        hud.renderTitle(save);
        break;
    }
  }
}

function startWorkday(dayOverride?: number): void {
  sound.unlock();
  clearInputs();
  hud.closeSettings();
  hud.closeDirectory();
  exitPointerLockSafe();
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  const chosenDay = dayOverride ?? save.selectedDay ?? save.day;
  game = createGameState(
    save,
    save.selectedClass,
    chosenDay,
    save.selectedDifficulty,
    save.selectedWeapon
  );
  renderer.setFloorTheme(game.chapter.themeColor);
  renderer.resetFpsLook(0, -0.05);
  document.body.dataset.state = "playing";
  hud.hideComms();
  hud.showToast(
    `FL ${game.chapter.floorNumber} · ${game.chapter.title} (${game.difficulty.label}) — Equipped: ${game.weapon.name}`
  );
}

const hud = new HudController(
  {
    onSelectClass: (id: EmployeeClassId) => {
      save.selectedClass = id;
      persistSaveToStorage(save, window.localStorage);
      renderer.setHeroLoadout(id, save.selectedWeapon, false);
      hud.renderTitle(save);
      sound.unlock();
      sound.uiTick();
    },
    onSelectWeapon: (weaponId: OfficeWeaponId) => {
      save.selectedWeapon = weaponId;
      persistSaveToStorage(save, window.localStorage);
      renderer.setHeroLoadout(save.selectedClass, weaponId, false);
      hud.renderTitle(save);
      sound.unlock();
      sound.uiTick();
    },
    onSelectDay: (day: number) => {
      save.selectedDay = day;
      persistSaveToStorage(save, window.localStorage);
      renderer.setFloorTheme(getChapterForDay(day).themeColor);
      hud.renderTitle(save);
      sound.unlock();
      sound.uiTick();
    },
    onSelectDifficulty: (diff: DifficultyId) => {
      save.selectedDifficulty = diff;
      persistSaveToStorage(save, window.localStorage);
      hud.renderTitle(save);
      sound.unlock();
      sound.uiTick();
    },
    onBuyUpgrade: (itemId: string) => {
      sound.unlock();
      const res = purchaseShopUpgrade(save, itemId);
      if (res.ok) {
        sound.pickup();
        persistSaveToStorage(save, window.localStorage);
        hud.renderTitle(save);
        hud.showToast("Office upgrade installed.");
      } else if (res.reason) {
        hud.showToast(res.reason);
      }
    },
    onStartWorkday: () => startWorkday(),
    onResetSave: () => {
      save = createDefaultSave();
      persistSaveToStorage(save, window.localStorage);
      renderer.setHeroLoadout(save.selectedClass, save.selectedWeapon, false);
      hud.renderTitle(save);
      hud.showToast("Save reset. Fresh lanyard, same Floor 42.");
    },
    onClaimQueuedPerk: () => {
      if (!game || game.screen !== "playing") return;
      if (openQueuedUpgrade(game)) {
        sound.unlock();
        sound.uiTick();
        clearInputs();
      }
    },
    onPickPerk: (perkId: string) => {
      if (!game || game.screen !== "upgrade") return;
      sound.unlock();
      const events: SimEvent[] = [];
      if (applyPerk(game, perkId, events)) {
        sound.pickup();
        clearInputs();
        handleSimEvents(events);
      }
    },
    onRerollPerks: () => {
      if (!game || game.screen !== "upgrade") return;
      sound.unlock();
      const events: SimEvent[] = [];
      if (rerollPendingPerks(game, Math.random, events)) {
        sound.uiTick();
      }
      handleSimEvents(events);
    },
    onDeferPerk: () => {
      if (!game || game.screen !== "upgrade") return;
      game.screen = "playing";
      clearInputs();
    },
    onPickDilemma: (choiceId: string) => {
      if (!game || game.screen !== "dilemma") return;
      sound.unlock();
      const events: SimEvent[] = [];
      if (resolveDilemma(game, choiceId, events)) {
        sound.pickup();
        clearInputs();
        handleSimEvents(events);
      }
    },
    onTriggerDodge: () => {
      if (!game || game.screen !== "playing") return;
      sound.unlock();
      const events: SimEvent[] = [];
      if (triggerDodgeRoll(game, game.player.facingX, game.player.facingZ, events)) {
        handleSimEvents(events);
      }
    },
    onTriggerSkill: () => {
      if (!game || game.screen !== "playing") return;
      sound.unlock();
      const events: SimEvent[] = [];
      if (triggerSignatureSkill(game, events)) {
        handleSimEvents(events);
      }
    },
    onToggleViewMode: () => {
      toggleCameraViewMode();
    },
    onToggleMute: () => {
      settings.audio.muted = !settings.audio.muted;
      applyAllSettings(settings, !settings.audio.muted);
    },
    onTogglePause: () => {
      if (!game) return;
      if (game.screen === "playing") {
        game.screen = "paused";
        exitPointerLockSafe();
        clearInputs();
      } else if (game.screen === "paused") {
        hud.closeSettings();
        game.screen = "playing";
        clearInputs();
      }
    },
    onRestartDay: () => {
      if (!game) return;
      startWorkday(game.day);
    },
    onReturnLobby: (openShopTab = false) => {
      game = null;
      exitPointerLockSafe();
      clearInputs();
      hud.closeSettings();
      document.body.dataset.state = "title";
      hud.renderTitle(save);
      hud.setTitleTab(openShopTab ? "shop" : "roster");
    },
    onSettingsChanged: (next: GameSettings, playPreviewTick = false) => {
      applyAllSettings(next, playPreviewTick);
    },
    onResetSettings: () => {
      rebindingAction = null;
      applyAllSettings(createDefaultSettings(), true);
      hud.showToast("Settings restored to defaults.");
    },
    onStartRebind: (action: KeyAction) => {
      rebindingAction = action;
      hud.syncSettingsUi(settings, rebindingAction);
    },
    onSettingsOpenChange: (open: boolean) => {
      if (open) exitPointerLockSafe();
      if (!open) rebindingAction = null;
      clearInputs();
    }
  },
  settings,
  renderer.isSoftwareGl
);

hud.renderTitle(save);

// Keyboard Input Listeners (Dynamic Custom Keybindings + Rebind Capture)
window.addEventListener("keydown", (event) => {
  const key = normalizeKeyToken(event.key);

  // Intercept key while listening for a custom keybind inside Settings
  if (rebindingAction) {
    event.preventDefault();
    if (key === "escape") {
      rebindingAction = null;
      hud.syncSettingsUi(settings, null);
      return;
    }
    const res = rebindKeyAction(settings, rebindingAction, event.key);
    rebindingAction = null;
    if (res.ok) {
      applyAllSettings(settings, true);
      hud.showToast(
        res.swappedWith ? "Key rebound (swapped with conflicting control)." : "Key binding updated."
      );
    } else if (res.reason) {
      hud.syncSettingsUi(settings, null);
      hud.showToast(res.reason);
    }
    return;
  }

  // Escape closes Settings or Corporate Directory modal if open
  if (hud.isSettingsOpen()) {
    if (key === "escape") {
      event.preventDefault();
      hud.closeSettings();
    }
    return;
  }
  if (hud.isDirectoryOpen()) {
    if (key === "escape") {
      event.preventDefault();
      hud.closeDirectory();
    }
    return;
  }

  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
    event.preventDefault();
  }

  const b = settings.bindings;

  // Title start handshake via Enter or Space (unless focused on an input/button)
  if (!game || game.screen === "title") {
    if (!event.repeat && key === "enter") {
      startWorkday();
    }
    return;
  }

  // Defer perk modal with Escape
  if (!event.repeat && key === "escape" && game.screen === "upgrade") {
    game.screen = "playing";
    clearInputs();
    return;
  }

  // Pause toggle
  if (!event.repeat && (key === "escape" || key === b.pause)) {
    if (game.screen === "playing") {
      game.screen = "paused";
      exitPointerLockSafe();
      clearInputs();
    } else if (game.screen === "paused") {
      game.screen = "playing";
      clearInputs();
    }
    return;
  }

  // Toggle First-Person / Third-Person view
  if (!event.repeat && key === b.toggleView && game.screen === "playing") {
    toggleCameraViewMode();
    return;
  }

  // Mute shortcut
  if (!event.repeat && key === b.mute) {
    settings.audio.muted = !settings.audio.muted;
    applyAllSettings(settings, !settings.audio.muted);
    return;
  }

  // On-demand Claim Queued Perk hotkey
  if (!event.repeat && key === b.claimPerk && game.screen === "playing") {
    if (openQueuedUpgrade(game)) {
      sound.unlock();
      sound.uiTick();
      exitPointerLockSafe();
      clearInputs();
    }
    return;
  }

  // Quick numeric picks for Perks / Dilemmas
  if (!event.repeat && game.screen === "upgrade") {
    const idx = Number(key) - 1;
    if (idx >= 0 && idx < game.pendingPerks.length) {
      const events: SimEvent[] = [];
      applyPerk(game, game.pendingPerks[idx].id, events);
      handleSimEvents(events);
    }
    return;
  }
  if (!event.repeat && game.screen === "dilemma" && game.activeDilemma) {
    const idx = Number(key) - 1;
    if (idx >= 0 && idx < game.activeDilemma.choices.length) {
      const events: SimEvent[] = [];
      resolveDilemma(game, game.activeDilemma.choices[idx].id, events);
      handleSimEvents(events);
    }
    return;
  }

  // Dodge Roll & Active Skill input buffers (0.12s)
  if (!event.repeat && key === b.dodge && game.screen === "playing") {
    dodgeBufferTimer = 0.12;
  }
  if (!event.repeat && key === b.skill && game.screen === "playing") {
    skillBufferTimer = 0.12;
  }

  heldKeys.add(key);
});

window.addEventListener("keyup", (event) => {
  heldKeys.delete(normalizeKeyToken(event.key));
});

window.addEventListener("blur", clearInputs);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearInputs();
});

// Pointer Aiming, FPS Mouse Look (Pointer Lock + Drag Fallback) & Title 3D Turntable Drag
const canvasEl = renderer.getCanvas();
canvasEl.addEventListener("pointerdown", (event) => {
  sound.unlock();
  if (event.button !== 0) return;
  if (!game || game.screen === "title") {
    titleDragActive = true;
    titleDragLastX = event.clientX;
    return;
  }
  pointerDown = true;
  pointerHasMoved = true;
  pointerClientX = event.clientX;
  pointerClientY = event.clientY;

  if (settings.camera.viewMode === "fps" && game.screen === "playing" && !hud.isSettingsOpen()) {
    fpsDragActive = true;
    fpsDragLastX = event.clientX;
    fpsDragLastY = event.clientY;
    if (document.pointerLockElement !== canvasEl) {
      requestPointerLockSafe(canvasEl);
    }
  }
});

window.addEventListener("pointermove", (event) => {
  if (titleDragActive && (!game || game.screen === "title")) {
    const dx = event.clientX - titleDragLastX;
    titleDragLastX = event.clientX;
    renderer.adjustTitleOrbit(dx * 0.011);
    return;
  }

  if (
    game &&
    game.screen === "playing" &&
    !hud.isSettingsOpen() &&
    settings.camera.viewMode === "fps"
  ) {
    const sens = settings.camera.mouseSensitivity;
    if (document.pointerLockElement === canvasEl) {
      renderer.rotateFpsLook(-event.movementX * 0.0024 * sens, -event.movementY * 0.002 * sens);
      return;
    }
    if (fpsDragActive) {
      const dx = event.clientX - fpsDragLastX;
      const dy = event.clientY - fpsDragLastY;
      fpsDragLastX = event.clientX;
      fpsDragLastY = event.clientY;
      renderer.rotateFpsLook(-dx * 0.005 * sens, -dy * 0.004 * sens);
      return;
    }
  }

  pointerHasMoved = true;
  pointerClientX = event.clientX;
  pointerClientY = event.clientY;
});

window.addEventListener("pointerup", () => {
  titleDragActive = false;
  fpsDragActive = false;
  pointerDown = false;
});

// Live ResizeObserver for responsive viewport + accurate raycasting
const resizeObserver = new ResizeObserver(() => renderer.resize());
resizeObserver.observe(mount);

// Support ?autostart=1 for instant gameplay verification
if (new URLSearchParams(window.location.search).has("autostart")) {
  startWorkday();
}

// Read-only state inspection hook for automated verification (zero visible debug UI)
(window as unknown as { __OFFICE_STATE__?: () => unknown }).__OFFICE_STATE__ = () => {
  const look = renderer.getFpsLook();
  const activeTypes = game
    ? Array.from(new Set(game.enemies.filter((e) => e.aiPhase !== "dying").map((e) => e.typeId)))
    : [];
  const stationsReady = game
    ? Object.entries(game.stationCooldowns)
        .filter(([, cd]) => cd <= 0.05)
        .map(([id]) => id)
    : [];
  return {
    screen: game ? game.screen : "title",
    viewMode: settings.camera.viewMode,
    fpsYaw: Number(look.yaw.toFixed(3)),
    fpsPitch: Number(look.pitch.toFixed(3)),
    pointerLocked: document.pointerLockElement === canvasEl,
    day: game ? game.day : save.selectedDay,
    floorNumber: game ? game.chapter.floorNumber : getChapterForDay(save.selectedDay || save.day).floorNumber,
    currentRoomId: game ? game.currentRoomId : "atrium",
    difficulty: game ? game.difficulty.id : save.selectedDifficulty,
    selectedClass: save.selectedClass,
    selectedWeapon: game ? game.weapon.id : save.selectedWeapon,
    weaponName: game ? (game.player.weaponEvolved ? game.weapon.evolvedName : game.weapon.name) : save.selectedWeapon,
    elapsed: game ? Number(game.elapsed.toFixed(2)) : 0,
    level: game ? game.level : 1,
    xp: game ? Math.round(game.xp) : 0,
    xpNeeded: game ? game.xpNeeded : 125,
    pendingLevelUps: game ? game.pendingLevelUps : 0,
    player: game
      ? {
          x: Number(game.player.x.toFixed(2)),
          z: Number(game.player.z.toFixed(2)),
          energy: Math.round(game.player.energy),
          moraleShield: Math.round(game.player.moraleShield),
          dodgeCooldown: Number(game.player.dodgeCooldown.toFixed(2)),
          skillCooldown: Number(game.player.skillCooldown.toFixed(2)),
          weaponEvolved: game.player.weaponEvolved
        }
      : null,
    policySilenceTimer: game ? Number(game.policySilenceTimer.toFixed(2)) : 0,
    enemies: game ? game.enemies.length : 0,
    activeEnemyTypes: activeTypes,
    stationsReady,
    xpOrbs: game ? game.xpOrbs.length : 0,
    hazards: game ? game.hazards.length : 0,
    kills: game ? game.kills : 0,
    salary: game ? game.salary : 0,
    settingsOpen: hud.isSettingsOpen(),
    directoryOpen: hud.isDirectoryOpen(),
    settings,
    isSoftwareGl: renderer.isSoftwareGl
  };
};

if (new URLSearchParams(window.location.search).has("verify")) {
  (window as unknown as { __OFFICE_VERIFY__?: unknown }).__OFFICE_VERIFY__ = {
    step(seconds: number) {
      if (!game || game.screen !== "playing") return;
      const idle: InputSnapshot = {
        moveX: 0,
        moveZ: 0,
        dodgePressed: false,
        skillPressed: false,
        aimMode: "auto",
        aimActive: false,
        aimWorldX: 0,
        aimWorldZ: 0
      };
      const steps = Math.max(1, Math.round(seconds / 0.05));
      for (let i = 0; i < steps && game.screen === "playing"; i++) {
        stepSimulation(game, save, 0.05, idle, Math.random, { hitstopEnabled: false });
      }
      renderer.renderFrame(game, save.selectedClass, save.selectedWeapon, 0.016);
      hud.syncFrame(game, renderer, settings.camera.viewMode === "fps", renderer.getFpsLook().yaw);
    },
    moveTo(x: number, z: number) {
      if (!game) return;
      game.player.x = x;
      game.player.z = z;
      renderer.renderFrame(game, save.selectedClass, save.selectedWeapon, 0.016);
      hud.syncFrame(game, renderer, settings.camera.viewMode === "fps", renderer.getFpsLook().yaw);
    }
  };
}

// Start main Three.js + Simulation loop (auto-paced via afterDraw on software WebGL)
renderer.startLoop((dt) => {
  if (game && game.screen === "playing" && !hud.isSettingsOpen() && !hud.isDirectoryOpen()) {
    const b = settings.bindings;
    const isFps = settings.camera.viewMode === "fps";

    let moveX = 0;
    let moveZ = 0;
    let aimWorldX = 0;
    let aimWorldZ = 0;
    let aimActive = false;

    const moveJoy = joysticks.getMoveVector();
    const aimJoy = joysticks.getAimVector();
    joysticks.setFpsMode(isFps);

    if (isFps) {
      // Smooth keyboard turning via Left/Right Arrows + Right Virtual Joystick Look
      const turnInput =
        (heldKeys.has("arrowleft") && b.moveLeft !== "arrowleft" ? 1 : 0) -
        (heldKeys.has("arrowright") && b.moveRight !== "arrowright" ? 1 : 0);
      if (turnInput !== 0) {
        renderer.rotateFpsLook(turnInput * 2.25 * settings.camera.mouseSensitivity * dt, 0);
      }
      if (aimJoy.active) {
        const delta = computeFpsStickLookDelta(
          aimJoy.x,
          aimJoy.y,
          settings.camera.mouseSensitivity,
          dt
        );
        renderer.rotateFpsLook(delta.dYaw, delta.dPitch);
      }

      const kbForward =
        (heldKeys.has(b.moveUp) || heldKeys.has("arrowup") ? 1 : 0) -
        (heldKeys.has(b.moveDown) || heldKeys.has("arrowdown") ? 1 : 0);
      const kbStrafe =
        (heldKeys.has(b.moveRight) ? 1 : 0) - (heldKeys.has(b.moveLeft) ? 1 : 0);
      const combinedFps = combineMoveVectors(kbStrafe, -kbForward, moveJoy.x, moveJoy.y);
      const look = renderer.getFpsLook();
      const vec = computeFpsMoveVector(-combinedFps.moveZ, combinedFps.moveX, look.yaw);
      moveX = vec.moveX;
      moveZ = vec.moveZ;

      const aimPt = renderer.getFpsAimWorldPoint(game.player.x, game.player.z, 16);
      const lockedOrManual =
        settings.gameplay.aimMode === "manual" ||
        pointerDown ||
        aimJoy.active ||
        document.pointerLockElement === canvasEl;
      if (lockedOrManual) {
        aimActive = true;
        aimWorldX = aimPt.x;
        aimWorldZ = aimPt.z;
      }
      renderer.setAimReticle(false, 0, 0);
    } else {
      const kbX =
        (heldKeys.has(b.moveRight) || heldKeys.has("arrowright") ? 1 : 0) -
        (heldKeys.has(b.moveLeft) || heldKeys.has("arrowleft") ? 1 : 0);
      const kbZ =
        (heldKeys.has(b.moveDown) || heldKeys.has("arrowdown") ? 1 : 0) -
        (heldKeys.has(b.moveUp) || heldKeys.has("arrowup") ? 1 : 0);
      const combined = combineMoveVectors(kbX, kbZ, moveJoy.x, moveJoy.y);
      moveX = combined.moveX;
      moveZ = combined.moveZ;

      const manualMode = settings.gameplay.aimMode === "manual";
      if (aimJoy.active) {
        aimActive = true;
        aimWorldX = game.player.x + aimJoy.x * 10;
        aimWorldZ = game.player.z + aimJoy.y * 10;
      } else if ((manualMode && pointerHasMoved) || pointerDown) {
        const worldPt = renderer.screenToWorld(pointerClientX, pointerClientY);
        if (worldPt) {
          aimActive = true;
          aimWorldX = worldPt.x;
          aimWorldZ = worldPt.z;
        }
      }
      renderer.setAimReticle(aimActive && (manualMode || pointerDown || aimJoy.active), aimWorldX, aimWorldZ);
    }

    const input: InputSnapshot = {
      moveX,
      moveZ,
      dodgePressed: dodgeBufferTimer > 0,
      skillPressed: skillBufferTimer > 0,
      aimMode: settings.gameplay.aimMode,
      aimActive,
      aimWorldX,
      aimWorldZ
    };
    if (dodgeBufferTimer > 0) dodgeBufferTimer = Math.max(0, dodgeBufferTimer - dt);
    if (skillBufferTimer > 0) skillBufferTimer = Math.max(0, skillBufferTimer - dt);

    const events = stepSimulation(game, save, dt, input, Math.random, {
      hitstopEnabled: settings.gameplay.hitstop
    });
    if (input.dodgePressed && game.player.dodgeCooldown > 0) dodgeBufferTimer = 0;
    if (input.skillPressed && game.player.skillCooldown > 0) skillBufferTimer = 0;
    if (game.screen !== "playing") {
      exitPointerLockSafe();
    }
    handleSimEvents(events);
  } else {
    renderer.setAimReticle(false, 0, 0);
  }

  renderer.renderFrame(game, save.selectedClass, save.selectedWeapon, dt);
  const look = renderer.getFpsLook();
  hud.syncFrame(game, renderer, settings.camera.viewMode === "fps", look.yaw);
});
