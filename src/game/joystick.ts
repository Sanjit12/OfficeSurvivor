export interface JoystickVector {
  /** Normalized horizontal axis in [-1, 1] (right is +1) */
  x: number;
  /** Normalized vertical axis in [-1, 1] (down is +1, up is -1) */
  y: number;
  /** True when displaced past deadzone */
  active: boolean;
  /** Clamped visual knob offset in CSS pixels */
  knobX: number;
  /** Clamped visual knob offset in CSS pixels */
  knobY: number;
}

export function computeJoystickVector(
  dx: number,
  dy: number,
  maxRadius: number,
  deadzone = 0.12
): JoystickVector {
  const safeMax = Math.max(1, maxRadius);
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-4) {
    return { x: 0, y: 0, active: false, knobX: 0, knobY: 0 };
  }

  const clampedDist = Math.min(dist, safeMax);
  const nx = dx / dist;
  const ny = dy / dist;
  const knobX = nx * clampedDist;
  const knobY = ny * clampedDist;

  const rawMag = clampedDist / safeMax;
  if (rawMag <= deadzone) {
    return { x: 0, y: 0, active: false, knobX, knobY };
  }

  // Smoothly remap [deadzone..1] -> [0..1] for responsive low-speed navigation
  const scaledMag = Math.min(1, (rawMag - deadzone) / (1 - deadzone));
  return {
    x: nx * scaledMag,
    y: ny * scaledMag,
    active: true,
    knobX,
    knobY
  };
}

export function combineMoveVectors(
  kbX: number,
  kbZ: number,
  joyX: number,
  joyY: number
): { moveX: number; moveZ: number } {
  const sumX = kbX + joyX;
  const sumZ = kbZ + joyY;
  const mag = Math.hypot(sumX, sumZ);
  if (mag > 1) {
    return { moveX: sumX / mag, moveZ: sumZ / mag };
  }
  return { moveX: sumX, moveZ: sumZ };
}

export function computeFpsStickLookDelta(
  joyX: number,
  joyY: number,
  sensitivity: number,
  dt: number
): { dYaw: number; dPitch: number } {
  const yawSpeed = 2.45 * sensitivity;
  const pitchSpeed = 1.35 * sensitivity;
  return {
    dYaw: (-joyX * yawSpeed * dt) || 0,
    dPitch: (-joyY * pitchSpeed * dt) || 0
  };
}
