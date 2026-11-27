import { computeJoystickVector, type JoystickVector } from "../game/joystick";

interface StickInstance {
  zone: HTMLElement;
  knob: HTMLElement;
  pointerId: number | null;
  originX: number;
  originY: number;
  maxRadius: number;
  state: JoystickVector;
}

const ZERO_STICK: JoystickVector = { x: 0, y: 0, active: false, knobX: 0, knobY: 0 };

export class TouchJoystickController {
  private readonly moveStick: StickInstance | null;
  private readonly aimStick: StickInstance | null;
  private readonly aimLabel: HTMLElement | null;
  private lastFpsMode: boolean | null = null;

  constructor(onInteract?: () => void) {
    const moveZone = document.getElementById("moveJoystick");
    const moveKnob = document.getElementById("moveJoystickKnob");
    const aimZone = document.getElementById("aimJoystick");
    const aimKnob = document.getElementById("aimJoystickKnob");
    this.aimLabel = document.getElementById("aimJoystickLabel");

    this.moveStick =
      moveZone && moveKnob ? this.createStick(moveZone, moveKnob, onInteract) : null;
    this.aimStick =
      aimZone && aimKnob ? this.createStick(aimZone, aimKnob, onInteract) : null;
  }

  private createStick(
    zone: HTMLElement,
    knob: HTMLElement,
    onInteract?: () => void
  ): StickInstance {
    const inst: StickInstance = {
      zone,
      knob,
      pointerId: null,
      originX: 0,
      originY: 0,
      maxRadius: 38,
      state: { ...ZERO_STICK }
    };

    const updateFromClient = (clientX: number, clientY: number) => {
      const vec = computeJoystickVector(
        clientX - inst.originX,
        clientY - inst.originY,
        inst.maxRadius,
        0.12
      );
      inst.state = vec;
      inst.knob.style.transform = `translate3d(${vec.knobX.toFixed(1)}px, ${vec.knobY.toFixed(1)}px, 0)`;
    };

    const releaseStick = (pointerId?: number) => {
      if (pointerId !== undefined && inst.pointerId !== pointerId) return;
      inst.pointerId = null;
      inst.state = { ...ZERO_STICK };
      inst.knob.style.transform = "translate3d(0px, 0px, 0)";
      inst.zone.classList.remove("is-active");
    };

    zone.addEventListener("pointerdown", (event) => {
      if (inst.pointerId !== null) return;
      event.preventDefault();
      event.stopPropagation();
      onInteract?.();

      const rect = zone.getBoundingClientRect();
      inst.originX = rect.left + rect.width * 0.5;
      inst.originY = rect.top + rect.height * 0.5;
      inst.maxRadius = Math.max(28, rect.width * 0.34);
      inst.pointerId = event.pointerId;
      zone.classList.add("is-active");
      try {
        zone.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic pointer events in tests may not support capture
      }
      updateFromClient(event.clientX, event.clientY);
    });

    zone.addEventListener("pointermove", (event) => {
      if (inst.pointerId !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      updateFromClient(event.clientX, event.clientY);
    });

    zone.addEventListener("pointerup", (event) => {
      if (inst.pointerId !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      releaseStick(event.pointerId);
    });

    zone.addEventListener("pointercancel", (event) => {
      releaseStick(event.pointerId);
    });

    zone.addEventListener("lostpointercapture", () => {
      releaseStick();
    });

    return inst;
  }

  public getMoveVector(): JoystickVector {
    return this.moveStick ? this.moveStick.state : ZERO_STICK;
  }

  public getAimVector(): JoystickVector {
    return this.aimStick ? this.aimStick.state : ZERO_STICK;
  }

  public setFpsMode(isFps: boolean): void {
    if (this.lastFpsMode === isFps) return;
    this.lastFpsMode = isFps;
    if (this.aimLabel) {
      this.aimLabel.textContent = isFps ? "LOOK" : "AIM";
    }
  }

  public reset(): void {
    for (const stick of [this.moveStick, this.aimStick]) {
      if (!stick) continue;
      stick.pointerId = null;
      stick.state = { ...ZERO_STICK };
      stick.knob.style.transform = "translate3d(0px, 0px, 0)";
      stick.zone.classList.remove("is-active");
    }
  }
}
