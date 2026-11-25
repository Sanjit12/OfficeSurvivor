import {
  ALL_STATIONS,
  CAMPUS_DOORWAYS,
  ENEMY_ARCHETYPES,
  OFFICE_ROOMS,
  WORLD_BOUNDS
} from "../game/data";
import type { GameState } from "../game/types";

/**
 * Lightweight 2D Canvas Tactical Floorplan Minimap
 * Renders all 10 corporate rooms, wide doorways, 8 room-anchored station icons,
 * enemy hierarchy ranks (dots / elite diamonds / C-Suite gold stars), and
 * the player arrow + FPS vision cone.
 */
export class CampusMinimap {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  public render(state: GameState, isFps: boolean, fpsYaw: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const pad = 8;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;

    const toX = (wx: number) => pad + ((wx + WORLD_BOUNDS.halfW) / (WORLD_BOUNDS.halfW * 2)) * innerW;
    const toY = (wz: number) => pad + ((wz + WORLD_BOUNDS.halfD) / (WORLD_BOUNDS.halfD * 2)) * innerH;

    // Background slate
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0b121e";
    ctx.fillRect(0, 0, w, h);

    // 1. Rooms
    for (const room of OFFICE_ROOMS) {
      const rx = toX(room.minX);
      const ry = toY(room.minZ);
      const rw = toX(room.maxX) - rx;
      const rh = toY(room.maxZ) - ry;
      const isCurrent = room.id === state.currentRoomId;

      ctx.fillStyle = isCurrent ? "rgba(40, 184, 157, 0.24)" : "rgba(30, 41, 59, 0.82)";
      ctx.fillRect(rx + 1, ry + 1, rw - 2, rh - 2);

      ctx.strokeStyle = isCurrent ? room.accentColor : "rgba(148, 163, 184, 0.34)";
      ctx.lineWidth = isCurrent ? 1.5 : 1;
      ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);

      // Compact room label
      ctx.fillStyle = isCurrent ? "#f8fafc" : "rgba(148, 163, 184, 0.65)";
      ctx.font = "700 8px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label =
        room.shortLabel === "BOARDROOM"
          ? "BOARD"
          : room.shortLabel === "WASHROOMS"
          ? "WC"
          : room.shortLabel === "CAFETERIA"
          ? "CAFE"
          : room.shortLabel === "IT SERVERS"
          ? "IT"
          : room.shortLabel === "CEO SUITE"
          ? "CEO"
          : room.shortLabel === "CFO SUITE"
          ? "CFO"
          : room.shortLabel === "HR OFFICE"
          ? "HR"
          : room.shortLabel;
      ctx.fillText(label, rx + rw / 2, ry + rh / 2);
    }

    // 2. Doorway openings (draw bright gap cutouts over room borders)
    ctx.fillStyle = "#1f2e42";
    for (const door of CAMPUS_DOORWAYS) {
      const dx = toX(door.x);
      const dy = toY(door.z);
      if (door.orientation === "horizontal") {
        ctx.fillRect(dx - 6, dy - 2, 12, 4);
      } else {
        ctx.fillRect(dx - 2, dy - 6, 4, 12);
      }
    }

    // 3. 8 Interactive Room Stations
    for (const st of ALL_STATIONS) {
      const sx = toX(st.x);
      const sy = toY(st.z);
      const ready = state.stationCooldowns[st.id] <= 0.05 || (st.id === "server" && state.outage > 0);
      ctx.beginPath();
      ctx.arc(sx, sy, ready ? 3.2 : 2.1, 0, Math.PI * 2);
      ctx.fillStyle = st.id === "server" && state.outage > 0 ? "#ef4444" : ready ? st.color : "rgba(148,163,184,0.35)";
      ctx.fill();
      if (ready) {
        ctx.strokeStyle = "#0b121e";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 4. Enemies (Tier 1/2 dots, Tier 3 amber diamonds, Tier 4 C-Suite gold stars)
    for (const enemy of state.enemies) {
      if (enemy.aiPhase === "dying") continue;
      const ex = toX(enemy.x);
      const ey = toY(enemy.z);
      const def = ENEMY_ARCHETYPES[enemy.typeId];

      if (enemy.boss) {
        ctx.fillStyle = enemy.bossPhase === 2 ? "#ef4444" : "#eab308";
        ctx.beginPath();
        ctx.arc(ex, ey, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (enemy.elite) {
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(-2.6, -2.6, 5.2, 5.2);
        ctx.restore();
      } else {
        ctx.fillStyle = def.rankTier === 2 ? "#38bdf8" : "#f87171";
        ctx.beginPath();
        ctx.arc(ex, ey, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Player Arrow + Translucent FPS Vision Cone
    const px = toX(state.player.x);
    const py = toY(state.player.z);
    const headingAngle = isFps
      ? Math.atan2(-Math.cos(fpsYaw), -Math.sin(fpsYaw))
      : Math.atan2(state.player.facingZ, state.player.facingX);

    if (isFps) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(headingAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 22, -0.52, 0.52);
      ctx.closePath();
      ctx.fillStyle = "rgba(40, 184, 157, 0.28)";
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(headingAngle);
    ctx.beginPath();
    ctx.moveTo(5.5, 0);
    ctx.lineTo(-3.8, -3.6);
    ctx.lineTo(-2.0, 0);
    ctx.lineTo(-3.8, 3.6);
    ctx.closePath();
    ctx.fillStyle = "#5eead4";
    ctx.fill();
    ctx.strokeStyle = "#041915";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}
