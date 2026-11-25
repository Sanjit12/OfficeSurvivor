import type { GameSettings, KeyAction, KeyBindings } from "./types";

export const SETTINGS_KEY = "office-survivor-3d-settings-v1";

export const KEY_ACTION_META: Array<{ action: KeyAction; label: string; hint: string }> = [
  { action: "moveUp", label: "Move Forward / Up", hint: "North (3P) or forward (FPS)" },
  { action: "moveDown", label: "Move Back / Down", hint: "South (3P) or backward (FPS)" },
  { action: "moveLeft", label: "Strafe / Move Left", hint: "West (3P) or left strafe (FPS)" },
  { action: "moveRight", label: "Strafe / Move Right", hint: "East (3P) or right strafe (FPS)" },
  { action: "dodge", label: "Dodge Roll", hint: "Directional i-frame evade" },
  { action: "skill", label: "Signature Skill", hint: "Employee active ability" },
  { action: "claimPerk", label: "Claim Perk", hint: "Open queued level-up cards" },
  { action: "toggleView", label: "Toggle FPS View", hint: "Switch Third-Person / First-Person" },
  { action: "pause", label: "Pause Shift", hint: "Pause & open settings" },
  { action: "mute", label: "Mute Audio", hint: "Quick sound toggle" }
];

export function createDefaultBindings(): KeyBindings {
  return {
    moveUp: "w",
    moveDown: "s",
    moveLeft: "a",
    moveRight: "d",
    dodge: "shift",
    skill: " ",
    claimPerk: "e",
    toggleView: "v",
    pause: "p",
    mute: "m"
  };
}

export function createDefaultSettings(): GameSettings {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    audio: {
      masterVolume: 0.8,
      sfxVolume: 0.85,
      uiVolume: 0.75,
      muted: false
    },
    video: {
      quality: "high",
      shadows: true,
      fpsCap: 60
    },
    camera: {
      viewMode: "third",
      zoom: "standard",
      tilt: "isometric",
      mouseSensitivity: 1.0
    },
    gameplay: {
      aimMode: "auto",
      screenShake: !prefersReducedMotion,
      hitstop: !prefersReducedMotion,
      damageNumbers: true
    },
    bindings: createDefaultBindings()
  };
}

function clampUnit(value: unknown, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

export function loadSettingsFromStorage(storage?: Pick<Storage, "getItem">): GameSettings {
  const defaults = createDefaultSettings();
  if (!storage) return defaults;
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const quality =
      parsed.video?.quality === "low" ||
      parsed.video?.quality === "medium" ||
      parsed.video?.quality === "high"
        ? parsed.video.quality
        : defaults.video.quality;
    const fpsCap =
      parsed.video?.fpsCap === 0 || parsed.video?.fpsCap === 30 || parsed.video?.fpsCap === 60
        ? parsed.video.fpsCap
        : defaults.video.fpsCap;
    const viewMode =
      parsed.camera?.viewMode === "third" || parsed.camera?.viewMode === "fps"
        ? parsed.camera.viewMode
        : defaults.camera.viewMode;
    const zoom =
      parsed.camera?.zoom === "close" ||
      parsed.camera?.zoom === "standard" ||
      parsed.camera?.zoom === "wide"
        ? parsed.camera.zoom
        : defaults.camera.zoom;
    const tilt =
      parsed.camera?.tilt === "tactical" ||
      parsed.camera?.tilt === "isometric" ||
      parsed.camera?.tilt === "cinematic"
        ? parsed.camera.tilt
        : defaults.camera.tilt;
    const rawSens = parsed.camera?.mouseSensitivity;
    const mouseSensitivity =
      typeof rawSens === "number" && !Number.isNaN(rawSens)
        ? Math.max(0.3, Math.min(2.0, rawSens))
        : defaults.camera.mouseSensitivity;
    const aimMode =
      parsed.gameplay?.aimMode === "auto" || parsed.gameplay?.aimMode === "manual"
        ? parsed.gameplay.aimMode
        : defaults.gameplay.aimMode;

    const mergedBindings: KeyBindings = { ...defaults.bindings };
    if (parsed.bindings) {
      for (const key of Object.keys(defaults.bindings) as KeyAction[]) {
        const candidate = parsed.bindings[key];
        if (typeof candidate === "string" && candidate.length > 0) {
          mergedBindings[key] = candidate.toLowerCase();
        }
      }
    }

    return {
      audio: {
        masterVolume: clampUnit(parsed.audio?.masterVolume, defaults.audio.masterVolume),
        sfxVolume: clampUnit(parsed.audio?.sfxVolume, defaults.audio.sfxVolume),
        uiVolume: clampUnit(parsed.audio?.uiVolume, defaults.audio.uiVolume),
        muted: typeof parsed.audio?.muted === "boolean" ? parsed.audio.muted : defaults.audio.muted
      },
      video: {
        quality,
        shadows: typeof parsed.video?.shadows === "boolean" ? parsed.video.shadows : defaults.video.shadows,
        fpsCap
      },
      camera: { viewMode, zoom, tilt, mouseSensitivity },
      gameplay: {
        aimMode,
        screenShake:
          typeof parsed.gameplay?.screenShake === "boolean"
            ? parsed.gameplay.screenShake
            : defaults.gameplay.screenShake,
        hitstop:
          typeof parsed.gameplay?.hitstop === "boolean"
            ? parsed.gameplay.hitstop
            : defaults.gameplay.hitstop,
        damageNumbers:
          typeof parsed.gameplay?.damageNumbers === "boolean"
            ? parsed.gameplay.damageNumbers
            : defaults.gameplay.damageNumbers
      },
      bindings: mergedBindings
    };
  } catch {
    return defaults;
  }
}

export function persistSettingsToStorage(
  settings: GameSettings,
  storage?: Pick<Storage, "setItem">
): void {
  if (!storage) return;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

const RESERVED_KEYS = new Set(["escape", "meta", "alt", "control", "capslock", "enter", "1", "2", "3"]);

export function normalizeKeyToken(rawKey: string): string {
  const lower = rawKey.toLowerCase();
  if (lower === "spacebar" || lower === "space") return " ";
  return lower;
}

export function rebindKeyAction(
  settings: GameSettings,
  action: KeyAction,
  rawKey: string
): { ok: boolean; swappedWith?: KeyAction; reason?: string } {
  const token = normalizeKeyToken(rawKey);
  if (!token || RESERVED_KEYS.has(token)) {
    return { ok: false, reason: "That key is reserved by the menu system." };
  }

  const previous = settings.bindings[action];
  let swappedWith: KeyAction | undefined;
  for (const other of Object.keys(settings.bindings) as KeyAction[]) {
    if (other !== action && settings.bindings[other] === token) {
      settings.bindings[other] = previous;
      swappedWith = other;
      break;
    }
  }
  settings.bindings[action] = token;
  return { ok: true, swappedWith };
}

export function formatKeyLabel(keyToken: string): string {
  const k = normalizeKeyToken(keyToken);
  if (k === " ") return "SPACE";
  if (k === "shift") return "SHIFT";
  if (k === "tab") return "TAB";
  if (k === "arrowup") return "UP";
  if (k === "arrowdown") return "DOWN";
  if (k === "arrowleft") return "LEFT";
  if (k === "arrowright") return "RIGHT";
  return k.length === 1 ? k.toUpperCase() : k.slice(0, 6).toUpperCase();
}

export const FPS_PITCH_MIN = -0.56;
export const FPS_PITCH_MAX = 0.52;

export function clampFpsPitch(pitch: number): number {
  return Math.max(FPS_PITCH_MIN, Math.min(FPS_PITCH_MAX, pitch));
}

/**
 * Converts local FPS input (forward in [-1, 1], strafeRight in [-1, 1]) into
 * world-space XZ movement based on camera yaw (yaw = 0 faces North / -Z).
 */
export function computeFpsMoveVector(
  forward: number,
  strafeRight: number,
  yaw: number
): { moveX: number; moveZ: number } {
  const sinY = Math.sin(yaw);
  const cosY = Math.cos(yaw);
  // Forward = (-sin(yaw), -cos(yaw)); Right = (cos(yaw), -sin(yaw))
  const moveX = -sinY * forward + cosY * strafeRight;
  const moveZ = -cosY * forward - sinY * strafeRight;
  const len = Math.hypot(moveX, moveZ);
  if (len <= 0.0001) return { moveX: 0, moveZ: 0 };
  return { moveX: moveX / len, moveZ: moveZ / len };
}
