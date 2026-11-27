import * as THREE from "three";
import { ENEMY_ARCHETYPES } from "../game/data";
import type {
  EmployeeClassDef,
  EnemyArchetypeDef,
  EnemyProjectileKind,
  EnemyTypeId,
  HumanoidHairStyle,
  HumanoidPropStyle,
  OfficeWeaponId,
  PickupKind
} from "../game/types";

export interface CharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  gearGroup: THREE.Group;
  meetingRing: THREE.Mesh;
  materialsToFlash: THREE.MeshStandardMaterial[];
}

export interface EnemyRig {
  root: THREE.Group;
  visual: THREE.Group;
  leftLeg?: THREE.Group;
  rightLeg?: THREE.Group;
  leftArm?: THREE.Group;
  rightArm?: THREE.Group;
  wingLeft?: THREE.Object3D;
  wingRight?: THREE.Object3D;
  halo?: THREE.Object3D;
  rallyHalo?: THREE.Mesh;
  rankRing?: THREE.Mesh;
  hpBarBg: THREE.Mesh;
  hpBarFill: THREE.Mesh;
  nameplate: THREE.Sprite;
  markRing: THREE.Mesh;
  flashMaterials: THREE.MeshStandardMaterial[];
  baseEmissives: THREE.Color[];
}

// Shared unit geometries to keep memory and software-WebGL overhead low
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
const UNIT_SPHERE = new THREE.SphereGeometry(0.5, 10, 8);
const UNIT_CONE = new THREE.ConeGeometry(0.5, 1, 6);

function scaledMesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  sx: number,
  sy: number,
  sz: number,
  x: number,
  y: number,
  z: number,
  castShadow = false
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = castShadow;
  return m;
}

function makeContactShadow(shadowTexture: THREE.Texture, radius: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.52,
      depthWrite: false
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.015;
  return mesh;
}

const NAMEPLATE_LABELS: Record<EnemyTypeId, { label: string; sub: string }> = {
  email: { label: "EMAIL", sub: "REPLY HOP" },
  bug: { label: "P0 BUG", sub: "CHARGER" },
  intern: { label: "INTERN", sub: "COFFEE TOSS" },
  analyst: { label: "ANALYST", sub: "SPREADSHEETS" },
  tech_lead: { label: "★ TECH LEAD", sub: "RALLY + PR FAN" },
  product_lead: { label: "★ PRODUCT LEAD", sub: "KANBAN + SUMMON" },
  hr_specialist: { label: "★ HR SPECIALIST", sub: "HR SILENCE" },
  it_auditor: { label: "★ IT AUDITOR", sub: "SHIELD + DISC" },
  manager: { label: "★★ MANAGER", sub: "SYNC + INVITE" },
  senior_manager: { label: "★★ SR. MANAGER", sub: "DUAL INVITE" },
  hr_director: { label: "★★ HR DIRECTOR", sub: "PIP WAVE" },
  vp_ops: { label: "★★ VP OF OPS", sub: "CHARGE + SLAM" },
  boss_cto: { label: "♛ CTO CHAD", sub: "SERVER BLADES" },
  boss_hr: { label: "♛ HEAD OF HR", sub: "PIP STORM" },
  boss_cfo: { label: "♛ CFO VICTOR", sub: "AUDIT LEDGERS" },
  boss_coo: { label: "♛ COO ELENA", sub: "OPS PINCER" },
  boss_ceo: { label: "♛ CEO ARTHUR", sub: "EXEC DECREE" }
};

const NAMEPLATE_TEXTURE_CACHE = new Map<EnemyTypeId, THREE.CanvasTexture>();

function getEnemyNameplateTexture(def: EnemyArchetypeDef): THREE.CanvasTexture {
  const existing = NAMEPLATE_TEXTURE_CACHE.get(def.id);
  if (existing) return existing;

  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 92;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const info = NAMEPLATE_LABELS[def.id] || { label: def.shortLabel, sub: def.department };
  const tier = def.rankTier;
  const borderColor =
    tier === 4 ? "#facc15" : tier === 3 ? "#f59e0b" : tier === 2 ? def.accentColor : "#64748b";
  const bgFill =
    tier === 4
      ? "rgba(44, 14, 24, 0.94)"
      : tier === 3
      ? "rgba(28, 20, 12, 0.92)"
      : tier === 2
      ? "rgba(12, 22, 36, 0.9)"
      : "rgba(12, 18, 28, 0.84)";

  // Rounded dark nameplate background
  const pad = 6;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(pad + r, pad);
  ctx.lineTo(pad + w - r, pad);
  ctx.quadraticCurveTo(pad + w, pad, pad + w, pad + r);
  ctx.lineTo(pad + w, pad + h - r);
  ctx.quadraticCurveTo(pad + w, pad + h, pad + w - r, pad + h);
  ctx.lineTo(pad + r, pad + h);
  ctx.quadraticCurveTo(pad, pad + h, pad, pad + h - r);
  ctx.lineTo(pad, pad + r);
  ctx.quadraticCurveTo(pad, pad, pad + r, pad);
  ctx.closePath();
  ctx.fillStyle = bgFill;
  ctx.fill();

  // Left color swatch bar matching the enemy archetype color
  ctx.save();
  ctx.clip();
  ctx.fillStyle = def.color;
  ctx.fillRect(pad, pad, 14, h);
  ctx.restore();

  // Crisp tier-colored outline
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = tier >= 3 ? 4 : tier === 2 ? 3 : 2;
  ctx.stroke();

  // Main role title
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = tier === 4 ? "#fef08a" : tier === 3 ? "#fde68a" : "#f8fafc";
  ctx.font = tier >= 3 ? "900 30px system-ui, -apple-system, sans-serif" : "800 28px system-ui, -apple-system, sans-serif";
  ctx.fillText(info.label, canvas.width / 2 + 4, 34);

  // Role trait / behavior subtitle so players instantly know what this enemy does
  ctx.fillStyle = tier === 1 ? "#94a3b8" : borderColor;
  ctx.font = "700 18px monospace";
  ctx.fillText(info.sub, canvas.width / 2 + 4, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  NAMEPLATE_TEXTURE_CACHE.set(def.id, tex);
  return tex;
}

function addHairMesh(
  parent: THREE.Group,
  style: HumanoidHairStyle,
  hairMat: THREE.Material,
  headY: number,
  castShadows: boolean
): void {
  if (style === "bun") {
    parent.add(scaledMesh(UNIT_BOX, hairMat, 0.44, 0.14, 0.44, 0, headY + 0.19, 0.02, castShadows));
    parent.add(scaledMesh(UNIT_BOX, hairMat, 0.42, 0.22, 0.14, 0, headY + 0.05, 0.19));
    parent.add(scaledMesh(UNIT_SPHERE, hairMat, 0.22, 0.22, 0.22, 0, headY + 0.3, 0.12, castShadows));
  } else if (style === "bob") {
    parent.add(scaledMesh(UNIT_BOX, hairMat, 0.46, 0.15, 0.46, 0, headY + 0.19, 0.01, castShadows));
    parent.add(scaledMesh(UNIT_BOX, hairMat, 0.47, 0.34, 0.16, 0, headY + 0.01, 0.17));
    parent.add(scaledMesh(UNIT_BOX, hairMat, 0.09, 0.32, 0.26, -0.22, headY - 0.01, 0.02));
    parent.add(scaledMesh(UNIT_BOX, hairMat, 0.09, 0.32, 0.26, 0.22, headY - 0.01, 0.02));
  } else if (style === "slick" || style === "silver_exec") {
    parent.add(scaledMesh(UNIT_BOX, hairMat, 0.45, 0.15, 0.47, 0, headY + 0.2, 0.03, castShadows));
    const wave = scaledMesh(UNIT_BOX, hairMat, 0.36, 0.09, 0.18, 0, headY + 0.26, -0.1, castShadows);
    wave.rotation.x = 0.22;
    parent.add(wave);
    parent.add(scaledMesh(UNIT_BOX, hairMat, 0.43, 0.22, 0.12, 0, headY + 0.06, 0.2));
  } else if (style === "fade") {
    parent.add(scaledMesh(UNIT_BOX, hairMat, 0.4, 0.11, 0.4, 0, headY + 0.2, 0.01, castShadows));
  } else if (style === "messy") {
    parent.add(scaledMesh(UNIT_BOX, hairMat, 0.46, 0.15, 0.46, 0, headY + 0.19, 0.02, castShadows));
    const tuftA = scaledMesh(UNIT_BOX, hairMat, 0.16, 0.11, 0.18, -0.12, headY + 0.26, -0.06);
    tuftA.rotation.z = 0.28;
    const tuftB = scaledMesh(UNIT_BOX, hairMat, 0.16, 0.1, 0.18, 0.13, headY + 0.25, -0.04);
    tuftB.rotation.z = -0.32;
    parent.add(tuftA, tuftB);
  } else {
    parent.add(scaledMesh(UNIT_BOX, hairMat, 0.44, 0.14, 0.44, 0, headY + 0.19, 0.02, castShadows));
    parent.add(scaledMesh(UNIT_BOX, hairMat, 0.42, 0.22, 0.12, 0, headY + 0.06, 0.19));
  }
}

function addEyewearMesh(
  parent: THREE.Group,
  eyewear: "none" | "glasses" | "visor" | "monocle" | "headset" | undefined,
  accentMat: THREE.Material,
  darkMat: THREE.Material,
  goldMat: THREE.Material,
  headY: number
): void {
  if (!eyewear || eyewear === "none") return;
  if (eyewear === "glasses") {
    const rimL = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.014, 6, 12), darkMat);
    rimL.position.set(-0.095, headY + 0.01, -0.215);
    const rimR = rimL.clone();
    rimR.position.x = 0.095;
    const bridge = scaledMesh(UNIT_BOX, darkMat, 0.06, 0.018, 0.018, 0, headY + 0.02, -0.215);
    parent.add(rimL, rimR, bridge);
  } else if (eyewear === "visor") {
    parent.add(scaledMesh(UNIT_BOX, accentMat, 0.42, 0.12, 0.08, 0, headY + 0.02, -0.215));
  } else if (eyewear === "monocle") {
    const mono = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.016, 6, 14), goldMat);
    mono.position.set(0.095, headY + 0.01, -0.22);
    parent.add(mono);
  } else if (eyewear === "headset") {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.028, 6, 14, Math.PI), darkMat);
    band.position.set(0, headY + 0.06, 0);
    const cupL = scaledMesh(UNIT_CYL, accentMat, 0.15, 0.07, 0.15, -0.235, headY, 0);
    cupL.rotation.z = Math.PI / 2;
    const cupR = cupL.clone();
    cupR.position.x = 0.235;
    parent.add(band, cupL, cupR);
  }
}

export function buildOfficeWeaponMesh(
  weaponId: OfficeWeaponId,
  mode: "held" | "fps" | "projectile" = "held",
  evolved = false
): THREE.Group {
  const g = new THREE.Group();
  const darkMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.42, metalness: 0.52 });
  const steelMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.24, metalness: 0.85 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: "#f1f5f9", roughness: 0.35, metalness: 0.1 });
  const goldTrim = evolved ? "#fbbf24" : null;

  const makeGlow = (hex: string, intensity = 0.7) =>
    new THREE.MeshStandardMaterial({
      color: goldTrim || hex,
      emissive: goldTrim || hex,
      emissiveIntensity: evolved ? intensity * 1.45 : intensity,
      roughness: 0.22,
      metalness: 0.35
    });

  switch (weaponId) {
    case "stapler": {
      const redMat = new THREE.MeshStandardMaterial({
        color: evolved ? "#f59e0b" : "#ef4444",
        emissive: evolved ? "#f59e0b" : "#991b1b",
        emissiveIntensity: evolved ? 0.55 : 0.22,
        roughness: 0.28,
        metalness: 0.35
      });
      g.add(scaledMesh(UNIT_BOX, darkMat, 0.14, 0.05, 0.44, 0, -0.04, 0));
      const top = scaledMesh(UNIT_BOX, redMat, 0.13, 0.09, 0.42, 0, 0.05, -0.01);
      top.rotation.x = 0.08;
      g.add(top);
      g.add(scaledMesh(UNIT_BOX, steelMat, 0.1, 0.04, 0.24, 0, 0.0, -0.08));
      break;
    }
    case "mouse": {
      const glow = makeGlow("#38bdf8", 0.85);
      g.add(scaledMesh(UNIT_BOX, whiteMat, 0.18, 0.09, 0.3, 0, 0, 0));
      g.add(scaledMesh(UNIT_SPHERE, whiteMat, 0.17, 0.08, 0.28, 0, 0.03, 0.01));
      g.add(scaledMesh(UNIT_CYL, glow, 0.035, 0.06, 0.035, 0, 0.06, -0.07));
      g.add(scaledMesh(UNIT_BOX, glow, 0.185, 0.02, 0.26, 0, -0.02, 0));
      break;
    }
    case "keyboard": {
      g.add(scaledMesh(UNIT_BOX, darkMat, 0.56, 0.055, 0.22, 0, 0, 0));
      const keyCols = ["#38bdf8", "#a855f7", "#f59e0b", "#34d399", "#f43f5e"];
      for (let i = 0; i < 5; i += 1) {
        const km = makeGlow(keyCols[i], 0.85);
        g.add(scaledMesh(UNIT_BOX, km, 0.085, 0.025, 0.06, -0.2 + i * 0.1, 0.038, -0.04));
        g.add(scaledMesh(UNIT_BOX, steelMat, 0.085, 0.022, 0.055, -0.2 + i * 0.1, 0.036, 0.045));
      }
      break;
    }
    case "phone": {
      const scr = makeGlow("#60a5fa", 0.95);
      const badge = makeGlow("#ef4444", 1.1);
      g.add(scaledMesh(UNIT_BOX, darkMat, 0.18, 0.3, 0.035, 0, 0.05, 0));
      g.add(scaledMesh(UNIT_BOX, scr, 0.15, 0.24, 0.04, 0, 0.05, 0));
      g.add(scaledMesh(UNIT_SPHERE, badge, 0.055, 0.055, 0.055, 0.07, 0.16, -0.02));
      break;
    }
    case "bottle": {
      const flaskMat = new THREE.MeshStandardMaterial({
        color: evolved ? "#38bdf8" : "#0891b2",
        emissive: "#06b6d4",
        emissiveIntensity: evolved ? 0.55 : 0.25,
        roughness: 0.25,
        metalness: 0.65
      });
      g.add(scaledMesh(UNIT_CYL, flaskMat, 0.17, 0.42, 0.17, 0, 0.05, 0));
      g.add(scaledMesh(UNIT_CYL, steelMat, 0.176, 0.09, 0.176, 0, 0.05, 0));
      g.add(scaledMesh(UNIT_CYL, darkMat, 0.12, 0.08, 0.12, 0, 0.29, 0));
      break;
    }
    case "tablet": {
      const scr = makeGlow("#28b89d", 0.85);
      g.add(scaledMesh(UNIT_BOX, darkMat, 0.44, 0.32, 0.035, 0, 0.06, 0));
      g.add(scaledMesh(UNIT_BOX, scr, 0.38, 0.26, 0.04, 0, 0.06, 0));
      const stylus = scaledMesh(UNIT_CYL, whiteMat, 0.024, 0.3, 0.024, 0.18, 0.08, -0.04);
      stylus.rotation.z = -0.45;
      g.add(stylus);
      break;
    }
    case "monitor": {
      const scr = makeGlow("#3b82f6", 0.9);
      g.add(scaledMesh(UNIT_BOX, darkMat, 0.68, 0.42, 0.06, 0, 0.14, 0));
      g.add(scaledMesh(UNIT_BOX, scr, 0.62, 0.35, 0.068, 0, 0.14, 0));
      g.add(scaledMesh(UNIT_BOX, steelMat, 0.1, 0.16, 0.06, 0, -0.1, 0.04));
      g.add(scaledMesh(UNIT_BOX, steelMat, 0.32, 0.035, 0.18, 0, -0.18, 0.03));
      break;
    }
    case "mug": {
      const mugMat = new THREE.MeshStandardMaterial({
        color: evolved ? "#fbbf24" : "#f59e0b",
        emissive: "#b45309",
        emissiveIntensity: evolved ? 0.55 : 0.22,
        roughness: 0.3
      });
      const coffeeMat = new THREE.MeshStandardMaterial({ color: "#3b1806", roughness: 0.2 });
      g.add(scaledMesh(UNIT_CYL, mugMat, 0.22, 0.26, 0.22, 0, 0.02, 0));
      g.add(scaledMesh(UNIT_CYL, coffeeMat, 0.19, 0.03, 0.19, 0, 0.145, 0));
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.024, 6, 12), mugMat);
      handle.position.set(0.12, 0.02, 0);
      g.add(handle);
      break;
    }
    case "scissors": {
      const orangeMat = new THREE.MeshStandardMaterial({
        color: evolved ? "#fbbf24" : "#f97316",
        emissive: "#ea580c",
        emissiveIntensity: evolved ? 0.6 : 0.25,
        roughness: 0.35
      });
      const bladeA = scaledMesh(UNIT_BOX, steelMat, 0.04, 0.02, 0.42, -0.02, 0.02, -0.12);
      bladeA.rotation.y = 0.22;
      const bladeB = scaledMesh(UNIT_BOX, steelMat, 0.04, 0.02, 0.42, 0.02, 0.01, -0.12);
      bladeB.rotation.y = -0.22;
      const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.02, 6, 12), orangeMat);
      ringA.rotation.x = Math.PI / 2;
      ringA.position.set(-0.075, 0.015, 0.14);
      const ringB = ringA.clone();
      ringB.position.x = 0.075;
      g.add(bladeA, bladeB, ringA, ringB);
      break;
    }
    case "tape": {
      const tapeMat = makeGlow("#eab308", 0.5);
      g.add(scaledMesh(UNIT_BOX, darkMat, 0.14, 0.12, 0.36, 0, -0.02, 0));
      const roll = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.035, 8, 14), tapeMat);
      roll.rotation.y = Math.PI / 2;
      roll.position.set(0, 0.06, 0.04);
      g.add(roll);
      g.add(scaledMesh(UNIT_BOX, steelMat, 0.12, 0.03, 0.04, 0, 0.04, -0.17));
      break;
    }
  }

  if (mode === "fps") {
    const fpsScale = weaponId === "monitor" ? 0.56 : weaponId === "keyboard" ? 0.62 : weaponId === "tablet" ? 0.68 : 0.92;
    g.scale.setScalar(fpsScale);
  } else if (mode === "projectile") {
    const projScale = weaponId === "monitor" ? 1.15 : weaponId === "keyboard" ? 0.95 : 1.1;
    g.scale.setScalar(projScale);
  }
  return g;
}

const HEX_DISC_GEO = new THREE.CylinderGeometry(0.46, 0.46, 0.08, 6);
const HEX_CORE_GEO = new THREE.CylinderGeometry(0.26, 0.26, 0.11, 6);

export function buildEnemyProjectileMesh(kind: EnemyProjectileKind): THREE.Group {
  const g = new THREE.Group();
  const paperMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.78, metalness: 0.04 });
  const darkMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.46, metalness: 0.45 });
  const steelMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.25, metalness: 0.85 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: "#facc15",
    emissive: "#ca8a04",
    emissiveIntensity: 0.42,
    roughness: 0.24,
    metalness: 0.86
  });

  switch (kind) {
    case "spreadsheet": {
      // Flying Excel sheet with green header bar, dark grid lines & rising 3D bar chart
      const greenMat = new THREE.MeshStandardMaterial({
        color: "#16a34a",
        emissive: "#15803d",
        emissiveIntensity: 0.35,
        roughness: 0.4
      });
      const chartAmber = new THREE.MeshStandardMaterial({ color: "#f59e0b", roughness: 0.35 });
      g.add(scaledMesh(UNIT_BOX, paperMat, 0.68, 0.045, 0.54, 0, 0, 0));
      g.add(scaledMesh(UNIT_BOX, greenMat, 0.68, 0.055, 0.14, 0, 0.008, -0.2));
      g.add(scaledMesh(UNIT_BOX, darkMat, 0.56, 0.052, 0.03, 0, 0.005, 0.0));
      g.add(scaledMesh(UNIT_BOX, darkMat, 0.56, 0.052, 0.03, 0, 0.005, 0.13));
      // Mini 3D chart columns popping off the corner
      g.add(scaledMesh(UNIT_BOX, greenMat, 0.07, 0.14, 0.07, -0.16, 0.09, 0.06));
      g.add(scaledMesh(UNIT_BOX, chartAmber, 0.07, 0.22, 0.07, -0.05, 0.13, 0.06));
      break;
    }
    case "kanban_card": {
      // Boomerang golden sticky note with priority ribbon and red pin
      const noteMat = new THREE.MeshStandardMaterial({
        color: "#facc15",
        emissive: "#d97706",
        emissiveIntensity: 0.28,
        roughness: 0.65
      });
      const ribbonMat = new THREE.MeshStandardMaterial({ color: "#ea580c", roughness: 0.42 });
      const pinMat = new THREE.MeshStandardMaterial({ color: "#ef4444", roughness: 0.28, metalness: 0.2 });
      g.add(scaledMesh(UNIT_BOX, noteMat, 0.6, 0.045, 0.6, 0, 0, 0));
      g.add(scaledMesh(UNIT_BOX, ribbonMat, 0.6, 0.055, 0.12, 0, 0.006, -0.22));
      g.add(scaledMesh(UNIT_BOX, darkMat, 0.42, 0.052, 0.035, 0, 0.004, 0.0));
      g.add(scaledMesh(UNIT_BOX, darkMat, 0.34, 0.052, 0.035, -0.04, 0.004, 0.12));
      g.add(scaledMesh(UNIT_SPHERE, pinMat, 0.12, 0.12, 0.12, 0, 0.06, -0.22));
      break;
    }
    case "code_review": {
      // Sleek dark PR ticket card with teal bar and bold red rejection X
      const tealMat = new THREE.MeshStandardMaterial({
        color: "#14b8a6",
        emissive: "#0d9488",
        emissiveIntensity: 0.45,
        roughness: 0.3
      });
      const redMat = new THREE.MeshStandardMaterial({
        color: "#ef4444",
        emissive: "#dc2626",
        emissiveIntensity: 0.55,
        roughness: 0.28
      });
      g.add(scaledMesh(UNIT_BOX, darkMat, 0.54, 0.06, 0.72, 0, 0, 0));
      g.add(scaledMesh(UNIT_BOX, tealMat, 0.56, 0.07, 0.14, 0, 0.005, -0.28));
      const xA = scaledMesh(UNIT_BOX, redMat, 0.36, 0.08, 0.065, 0, 0.015, 0.06);
      xA.rotation.y = Math.PI / 4;
      const xB = scaledMesh(UNIT_BOX, redMat, 0.36, 0.08, 0.065, 0, 0.015, 0.06);
      xB.rotation.y = -Math.PI / 4;
      g.add(xA, xB);
      break;
    }
    case "coffee_cup": {
      // Arcing hot takeaway coffee cup with cardboard sleeve, lid & dark splash crest
      const sleeveMat = new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.85 });
      const splashMat = new THREE.MeshStandardMaterial({
        color: "#451a03",
        emissive: "#78350f",
        emissiveIntensity: 0.25,
        roughness: 0.2
      });
      g.add(scaledMesh(UNIT_CYL, paperMat, 0.36, 0.52, 0.36, 0, 0, 0));
      g.add(scaledMesh(UNIT_CYL, sleeveMat, 0.39, 0.22, 0.39, 0, -0.02, 0));
      g.add(scaledMesh(UNIT_CYL, darkMat, 0.4, 0.09, 0.4, 0, 0.28, 0));
      g.add(scaledMesh(UNIT_SPHERE, splashMat, 0.22, 0.16, 0.22, 0.08, 0.38, 0));
      g.add(scaledMesh(UNIT_SPHERE, splashMat, 0.12, 0.12, 0.12, -0.12, 0.44, 0.06));
      break;
    }
    case "policy_memo": {
      // Stamped HR compliance dossier with purple folder, cream pages & red PIP seal
      const folderMat = new THREE.MeshStandardMaterial({
        color: "#9333ea",
        emissive: "#6b21a8",
        emissiveIntensity: 0.32,
        roughness: 0.5
      });
      const sealMat = new THREE.MeshStandardMaterial({
        color: "#f43f5e",
        emissive: "#e11d48",
        emissiveIntensity: 0.55,
        roughness: 0.25
      });
      g.add(scaledMesh(UNIT_BOX, folderMat, 0.68, 0.08, 0.54, 0, 0, 0));
      g.add(scaledMesh(UNIT_BOX, paperMat, 0.62, 0.09, 0.46, 0.03, 0.008, 0));
      g.add(scaledMesh(UNIT_CYL, sealMat, 0.22, 0.11, 0.22, 0.12, 0.02, 0.08));
      g.add(scaledMesh(UNIT_BOX, goldMat, 0.18, 0.11, 0.07, -0.2, 0.02, -0.24));
      break;
    }
    case "calendar_invite": {
      // Bouncing Outlook/Calendar invite tile with amber date header & busy blocks
      const headerMat = new THREE.MeshStandardMaterial({
        color: "#f59e0b",
        emissive: "#d97706",
        emissiveIntensity: 0.45,
        roughness: 0.32
      });
      const alertMat = new THREE.MeshStandardMaterial({
        color: "#ef4444",
        emissive: "#dc2626",
        emissiveIntensity: 0.5,
        roughness: 0.3
      });
      g.add(scaledMesh(UNIT_BOX, paperMat, 0.64, 0.065, 0.62, 0, 0, 0));
      g.add(scaledMesh(UNIT_BOX, headerMat, 0.66, 0.075, 0.18, 0, 0.006, -0.22));
      g.add(scaledMesh(UNIT_CYL, steelMat, 0.065, 0.12, 0.065, -0.18, 0.03, -0.31));
      g.add(scaledMesh(UNIT_CYL, steelMat, 0.065, 0.12, 0.065, 0.18, 0.03, -0.31));
      g.add(scaledMesh(UNIT_BOX, headerMat, 0.22, 0.075, 0.12, -0.12, 0.006, 0.04));
      g.add(scaledMesh(UNIT_BOX, alertMat, 0.24, 0.08, 0.14, 0.12, 0.01, 0.14));
      break;
    }
    case "firewall_disc": {
      // Heavy hexagonal spinning IT security firewall buckler disc
      const rimMat = new THREE.MeshStandardMaterial({
        color: "#38bdf8",
        emissive: "#0284c7",
        emissiveIntensity: 0.65,
        roughness: 0.24,
        metalness: 0.55
      });
      const outer = new THREE.Mesh(HEX_DISC_GEO, rimMat);
      const core = new THREE.Mesh(HEX_CORE_GEO, darkMat);
      g.add(outer, core);
      g.add(scaledMesh(UNIT_BOX, steelMat, 0.86, 0.05, 0.09, 0, 0.03, 0));
      g.add(scaledMesh(UNIT_BOX, steelMat, 0.09, 0.05, 0.86, 0, 0.03, 0));
      break;
    }
    case "server_blade": {
      // 1U rackmount server blade with silver rack ears, cyan status LEDs & twin fan rings
      const chassisMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.32, metalness: 0.78 });
      const ledMat = new THREE.MeshStandardMaterial({
        color: "#06b6d4",
        emissive: "#06b6d4",
        emissiveIntensity: 0.95,
        roughness: 0.2
      });
      g.add(scaledMesh(UNIT_BOX, chassisMat, 0.52, 0.14, 0.8, 0, 0, 0));
      g.add(scaledMesh(UNIT_BOX, steelMat, 0.62, 0.12, 0.07, 0, 0, -0.38));
      g.add(scaledMesh(UNIT_BOX, ledMat, 0.36, 0.05, 0.05, 0, 0.02, -0.41));
      g.add(scaledMesh(UNIT_CYL, steelMat, 0.2, 0.16, 0.2, 0, 0.01, -0.08));
      g.add(scaledMesh(UNIT_CYL, ledMat, 0.2, 0.16, 0.2, 0, 0.01, 0.18));
      break;
    }
    case "audit_ledger": {
      // Heavy gilded emerald-green accounting ledger book with cream pages & gold clasp
      const coverMat = new THREE.MeshStandardMaterial({
        color: "#059669",
        emissive: "#047857",
        emissiveIntensity: 0.3,
        roughness: 0.42,
        metalness: 0.22
      });
      const creamMat = new THREE.MeshStandardMaterial({ color: "#fef3c7", roughness: 0.85 });
      g.add(scaledMesh(UNIT_BOX, coverMat, 0.64, 0.16, 0.52, 0, 0, 0));
      g.add(scaledMesh(UNIT_BOX, creamMat, 0.58, 0.11, 0.48, 0.04, 0, 0));
      g.add(scaledMesh(UNIT_BOX, goldMat, 0.1, 0.18, 0.53, -0.28, 0, 0));
      g.add(scaledMesh(UNIT_BOX, goldMat, 0.22, 0.18, 0.22, 0.04, 0.01, 0));
      break;
    }
    case "exec_directive": {
      // Imperial obsidian-and-gold executive decree tablet with crimson ribbon & medallion
      const obsidianMat = new THREE.MeshStandardMaterial({ color: "#1e1b4b", roughness: 0.28, metalness: 0.62 });
      const crimsonMat = new THREE.MeshStandardMaterial({
        color: "#dc2626",
        emissive: "#b91c1c",
        emissiveIntensity: 0.45,
        roughness: 0.32
      });
      g.add(scaledMesh(UNIT_BOX, goldMat, 0.62, 0.08, 0.82, 0, 0, 0));
      g.add(scaledMesh(UNIT_BOX, obsidianMat, 0.5, 0.1, 0.7, 0, 0.005, 0));
      g.add(scaledMesh(UNIT_BOX, crimsonMat, 0.14, 0.12, 0.76, 0, 0.01, 0));
      g.add(scaledMesh(UNIT_CYL, goldMat, 0.22, 0.14, 0.22, 0, 0.02, -0.06));
      break;
    }
  }

  return g;
}

export function createEmployeeRig(
  employee: EmployeeClassDef,
  weaponId: OfficeWeaponId,
  shadowTexture: THREE.Texture,
  castShadows: boolean
): CharacterRig {
  const root = new THREE.Group();
  root.add(makeContactShadow(shadowTexture, 0.74));

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: employee.palette.primary,
    roughness: 0.68,
    metalness: 0.08
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: employee.palette.secondary,
    roughness: 0.78,
    metalness: 0.12
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: employee.palette.accent,
    emissive: employee.palette.accent,
    emissiveIntensity: 0.38,
    roughness: 0.25,
    metalness: 0.55
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: "#e2e8f0",
    roughness: 0.75
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: employee.palette.skin,
    roughness: 0.65,
    metalness: 0.02
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: employee.palette.hair,
    roughness: 0.8,
    metalness: 0.05
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: "#cbd5e1",
    roughness: 0.24,
    metalness: 0.82
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: "#111827",
    roughness: 0.55,
    metalness: 0.15
  });

  // Articulated legs pivoted at hip (y = 0.62)
  const buildLeg = (side: number): THREE.Group => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.15, 0.62, 0);
    hip.add(scaledMesh(UNIT_BOX, secondaryMat, 0.18, 0.48, 0.21, 0, -0.24, 0, castShadows));
    hip.add(scaledMesh(UNIT_BOX, shoeMat, 0.2, 0.14, 0.31, 0, -0.55, -0.04, castShadows));
    return hip;
  };
  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  bodyGroup.add(leftLeg, rightLeg);

  // Pelvis / Belt
  bodyGroup.add(scaledMesh(UNIT_BOX, shoeMat, 0.52, 0.1, 0.3, 0, 0.65, 0));

  // Torso (Tailored Hoodie / Jacket / Blazer / Utility Vest)
  bodyGroup.add(scaledMesh(UNIT_BOX, primaryMat, 0.56, 0.66, 0.32, 0, 1.0, 0, castShadows));
  bodyGroup.add(scaledMesh(UNIT_BOX, shirtMat, 0.18, 0.44, 0.33, 0, 1.05, -0.01));

  // Collar + Employee Lanyard & Glowing Access Badge
  bodyGroup.add(scaledMesh(UNIT_CYL, skinMat, 0.16, 0.14, 0.16, 0, 1.35, 0));
  bodyGroup.add(scaledMesh(UNIT_BOX, accentMat, 0.12, 0.16, 0.03, 0.15, 0.94, -0.175));
  bodyGroup.add(scaledMesh(UNIT_BOX, secondaryMat, 0.04, 0.3, 0.02, 0.15, 1.15, -0.17));

  // Class signature back/belt props
  if (employee.id === "junior") {
    bodyGroup.add(scaledMesh(UNIT_BOX, secondaryMat, 0.42, 0.48, 0.18, 0, 1.0, 0.24, castShadows));
    bodyGroup.add(scaledMesh(UNIT_BOX, accentMat, 0.14, 0.12, 0.02, 0.08, 1.06, 0.34));
  } else if (employee.id === "devops") {
    bodyGroup.add(scaledMesh(UNIT_BOX, metalMat, 0.48, 0.16, 0.16, 0, 0.72, 0.2));
    bodyGroup.add(scaledMesh(UNIT_BOX, accentMat, 0.14, 0.08, 0.04, 0, 0.72, 0.29));
  } else if (employee.id === "senior") {
    bodyGroup.add(scaledMesh(UNIT_CYL, metalMat, 0.12, 0.28, 0.12, -0.25, 0.82, 0.18));
    bodyGroup.add(scaledMesh(UNIT_BOX, accentMat, 0.1, 0.36, 0.04, 0, 1.02, -0.175));
  } else {
    bodyGroup.add(scaledMesh(UNIT_BOX, accentMat, 0.36, 0.12, 0.08, 0, 1.24, 0.19));
  }

  // Head + Hair + Facial Details
  const headY = 1.59;
  bodyGroup.add(scaledMesh(UNIT_BOX, skinMat, 0.4, 0.4, 0.4, 0, headY, 0, castShadows));
  const hairStyle: HumanoidHairStyle =
    employee.id === "junior"
      ? "bob"
      : employee.id === "senior"
      ? "slick"
      : employee.id === "qa"
      ? "bun"
      : "fade";
  addHairMesh(bodyGroup, hairStyle, hairMat, headY, castShadows);

  const eyeMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.2 });
  bodyGroup.add(scaledMesh(UNIT_BOX, eyeMat, 0.055, 0.055, 0.03, -0.095, headY + 0.01, -0.205));
  bodyGroup.add(scaledMesh(UNIT_BOX, eyeMat, 0.055, 0.055, 0.03, 0.095, headY + 0.01, -0.205));

  const goldMat = new THREE.MeshStandardMaterial({ color: "#f59e0b", metalness: 0.85, roughness: 0.25 });
  addEyewearMesh(
    bodyGroup,
    employee.id === "junior" || employee.id === "senior" ? "glasses" : "headset",
    accentMat,
    secondaryMat,
    goldMat,
    headY
  );

  // Arms pivoted at shoulder
  const buildArm = (side: number): THREE.Group => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.36, 1.25, 0);
    sh.add(scaledMesh(UNIT_BOX, primaryMat, 0.16, 0.42, 0.18, 0, -0.18, 0, castShadows));
    sh.add(scaledMesh(UNIT_BOX, skinMat, 0.12, 0.12, 0.13, 0, -0.43, 0));
    return sh;
  };
  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  leftArm.rotation.x = 0.55;
  rightArm.rotation.x = 0.55;
  bodyGroup.add(leftArm, rightArm);

  // Held 3D Office Item Weapon
  const gearGroup = new THREE.Group();
  gearGroup.position.set(0, 0.98, -0.44);
  gearGroup.add(buildOfficeWeaponMesh(weaponId, "held", false));
  bodyGroup.add(gearGroup);

  // Meeting-lock visual ring around feet
  const meetingRing = new THREE.Mesh(
    new THREE.RingGeometry(0.88, 1.06, 24),
    new THREE.MeshBasicMaterial({
      color: "#f59e0b",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    })
  );
  meetingRing.rotation.x = -Math.PI / 2;
  meetingRing.position.y = 0.04;
  meetingRing.visible = false;
  root.add(meetingRing);

  return {
    root,
    bodyGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    gearGroup,
    meetingRing,
    materialsToFlash: [primaryMat, accentMat]
  };
}

function attachCorporateProp(
  propStyle: HumanoidPropStyle | undefined,
  rightArm: THREE.Group,
  leftArm: THREE.Group,
  visual: THREE.Group,
  accentMat: THREE.Material,
  darkMat: THREE.Material,
  metalMat: THREE.Material,
  goldMat: THREE.Material,
  paperMat: THREE.Material,
  castShadows: boolean
): THREE.Object3D | undefined {
  let halo: THREE.Object3D | undefined;
  switch (propStyle) {
    case "coffee_tray": {
      const tray = scaledMesh(UNIT_BOX, darkMat, 0.44, 0.04, 0.34, 0, -0.42, -0.16);
      const cupA = scaledMesh(UNIT_CYL, paperMat, 0.12, 0.2, 0.12, -0.1, -0.3, -0.16);
      const cupB = scaledMesh(UNIT_CYL, accentMat, 0.12, 0.2, 0.12, 0.1, -0.3, -0.16);
      rightArm.add(tray, cupA, cupB);
      rightArm.rotation.x = 0.85;
      break;
    }
    case "binders": {
      leftArm.add(scaledMesh(UNIT_BOX, accentMat, 0.14, 0.34, 0.28, -0.05, -0.35, -0.14));
      rightArm.add(scaledMesh(UNIT_BOX, paperMat, 0.12, 0.32, 0.26, 0.05, -0.35, -0.14));
      leftArm.rotation.x = 0.7;
      rightArm.rotation.x = 0.7;
      break;
    }
    case "holo_tablet": {
      const tab = scaledMesh(UNIT_BOX, accentMat, 0.36, 0.28, 0.04, 0, -0.42, -0.18);
      tab.rotation.x = -0.35;
      rightArm.add(tab);
      rightArm.rotation.x = 0.82;
      break;
    }
    case "kanban_board": {
      const board = scaledMesh(UNIT_BOX, paperMat, 0.48, 0.36, 0.04, 0, -0.38, -0.2);
      const stickyA = scaledMesh(UNIT_BOX, accentMat, 0.12, 0.12, 0.05, -0.12, -0.34, -0.21);
      const stickyB = scaledMesh(UNIT_BOX, goldMat, 0.12, 0.12, 0.05, 0.1, -0.42, -0.21);
      rightArm.add(board, stickyA, stickyB);
      rightArm.rotation.x = 0.78;
      break;
    }
    case "clipboard":
    case "pip_dossier": {
      const board = scaledMesh(UNIT_BOX, darkMat, 0.32, 0.42, 0.04, 0, -0.38, -0.16);
      const sheet = scaledMesh(UNIT_BOX, propStyle === "pip_dossier" ? accentMat : paperMat, 0.26, 0.34, 0.05, 0, -0.38, -0.17);
      rightArm.add(board, sheet);
      rightArm.rotation.x = 0.76;
      break;
    }
    case "firewall_shield": {
      // Prominent Glowing Hexagonal Frontal Firewall Buckler on Left Arm!
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.09, 6), accentMat);
      shield.rotation.x = Math.PI / 2;
      shield.position.set(0.18, -0.3, -0.36);
      shield.castShadow = castShadows;
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 6), darkMat);
      core.rotation.x = Math.PI / 2;
      core.position.set(0.18, -0.3, -0.37);
      leftArm.add(shield, core);
      leftArm.rotation.x = 0.9;
      rightArm.add(scaledMesh(UNIT_CYL, metalMat, 0.07, 0.55, 0.07, 0, -0.42, -0.22));
      rightArm.rotation.x = 0.65;
      break;
    }
    case "calendar_slate": {
      rightArm.add(scaledMesh(UNIT_BOX, accentMat, 0.44, 0.34, 0.05, 0, -0.4, -0.2));
      rightArm.rotation.x = 0.72;
      break;
    }
    case "dual_tablets": {
      rightArm.add(scaledMesh(UNIT_BOX, goldMat, 0.38, 0.3, 0.05, 0, -0.4, -0.18));
      leftArm.add(scaledMesh(UNIT_BOX, accentMat, 0.38, 0.3, 0.05, 0, -0.4, -0.18));
      rightArm.rotation.x = 0.78;
      leftArm.rotation.x = 0.78;
      break;
    }
    case "directive_batons": {
      for (const arm of [leftArm, rightArm]) {
        const baton = scaledMesh(UNIT_CYL, accentMat, 0.09, 0.68, 0.09, 0, -0.45, -0.22);
        baton.rotation.x = Math.PI / 2;
        arm.add(baton);
        arm.rotation.x = 0.65;
      }
      break;
    }
    case "server_drones": {
      const orbitGroup = new THREE.Group();
      orbitGroup.position.y = 1.45;
      for (let i = 0; i < 3; i += 1) {
        const a = (i / 3) * Math.PI * 2;
        const blade = scaledMesh(UNIT_BOX, accentMat, 0.24, 0.38, 0.1, Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95);
        orbitGroup.add(blade);
      }
      visual.add(orbitGroup);
      halo = orbitGroup;
      break;
    }
    case "podium_wand": {
      const wand = scaledMesh(UNIT_CYL, accentMat, 0.07, 0.85, 0.07, 0, -0.46, -0.24);
      wand.rotation.x = Math.PI / 2.2;
      rightArm.add(wand);
      leftArm.add(scaledMesh(UNIT_BOX, paperMat, 0.34, 0.42, 0.05, 0, -0.38, -0.18));
      rightArm.rotation.x = 0.78;
      leftArm.rotation.x = 0.72;
      break;
    }
    case "ledger_briefcase": {
      const caseBody = scaledMesh(UNIT_BOX, darkMat, 0.16, 0.38, 0.52, 0, -0.52, -0.04, castShadows);
      const trim = scaledMesh(UNIT_BOX, goldMat, 0.18, 0.06, 0.54, 0, -0.35, -0.04);
      rightArm.add(caseBody, trim);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 8, 24), goldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.9;
      visual.add(ring);
      halo = ring;
      break;
    }
    case "ops_holomap": {
      const holo = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), accentMat);
      holo.position.set(0, -0.44, -0.28);
      rightArm.add(holo);
      rightArm.rotation.x = 0.82;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 8, 24), accentMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.95;
      visual.add(ring);
      halo = ring;
      break;
    }
    case "ceo_scepter": {
      const staff = scaledMesh(UNIT_CYL, goldMat, 0.08, 1.35, 0.08, 0, -0.22, -0.22, castShadows);
      const orb = scaledMesh(UNIT_SPHERE, accentMat, 0.24, 0.24, 0.24, 0, 0.48, -0.22);
      rightArm.add(staff, orb);
      rightArm.rotation.x = 0.62;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.065, 8, 28), goldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 2.02;
      visual.add(ring);
      halo = ring;
      break;
    }
  }
  return halo;
}

function buildHumanoidEnemy(
  def: EnemyArchetypeDef,
  visual: THREE.Group,
  mainMat: THREE.MeshStandardMaterial,
  darkMat: THREE.MeshStandardMaterial,
  accentMat: THREE.MeshStandardMaterial,
  castShadows: boolean
): {
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  halo?: THREE.Object3D;
} {
  const v = def.visual;
  const suitMat = new THREE.MeshStandardMaterial({
    color: v.suitColor || def.color,
    roughness: 0.62,
    metalness: def.rankTier >= 3 ? 0.16 : 0.08
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: v.shirtColor || "#f1f5f9",
    roughness: 0.78
  });
  const tieMat = new THREE.MeshStandardMaterial({
    color: v.tieColor || def.accentColor,
    emissive: def.rankTier >= 3 ? v.tieColor || def.accentColor : "#000000",
    emissiveIntensity: def.rankTier >= 3 ? 0.25 : 0,
    roughness: 0.35
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: v.skinColor || "#e5b899",
    roughness: 0.68
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: v.hairColor || "#1e293b",
    roughness: 0.78
  });
  const metalMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.85, roughness: 0.25 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: "#eab308",
    emissive: "#ca8a04",
    emissiveIntensity: 0.35,
    metalness: 0.88,
    roughness: 0.22
  });
  const paperMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.85 });

  // Apply rank height & shoulder breadth scale on a sub-group so feet always stay cleanly on y=0
  const body = new THREE.Group();
  const s = v.heightScale;
  const breadth = def.boss ? s * 1.08 : def.elite ? s * 1.04 : s;
  body.scale.set(breadth, s, breadth);
  visual.add(body);

  // Legs pivoted at hip (y = 0.6)
  const buildLeg = (side: number): THREE.Group => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.15, 0.6, 0);
    hip.add(scaledMesh(UNIT_BOX, darkMat, 0.18, 0.48, 0.2, 0, -0.24, 0, castShadows));
    hip.add(scaledMesh(UNIT_BOX, new THREE.MeshStandardMaterial({ color: "#0b111c", roughness: 0.5 }), 0.2, 0.13, 0.3, 0, -0.54, -0.04));
    return hip;
  };
  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  body.add(leftLeg, rightLeg);

  // Torso & Suit Silhouette
  const isCoat = v.outfit === "vp_overcoat" || v.outfit === "coo_trench" || v.outfit === "hr_director_coat" || v.outfit === "ceo_executive";
  body.add(scaledMesh(UNIT_BOX, suitMat, 0.58, isCoat ? 0.78 : 0.66, 0.34, 0, isCoat ? 0.94 : 1.0, 0, castShadows));
  body.add(scaledMesh(UNIT_BOX, shirtMat, 0.18, 0.44, 0.35, 0, 1.06, -0.01));
  body.add(scaledMesh(UNIT_BOX, tieMat, 0.085, 0.38, 0.04, 0, 1.01, -0.185));

  // Executive shoulder pads, Tier 2 department epaulettes, gold lapels & rank chevrons
  if (def.rankTier === 2) {
    // Vibrant glowing department shoulder epaulettes & lanyard so Leads pop immediately from Tier 1
    body.add(scaledMesh(UNIT_BOX, accentMat, 0.22, 0.08, 0.24, -0.34, 1.33, 0));
    body.add(scaledMesh(UNIT_BOX, accentMat, 0.22, 0.08, 0.24, 0.34, 1.33, 0));
    body.add(scaledMesh(UNIT_BOX, accentMat, 0.16, 0.18, 0.05, 0.14, 0.96, -0.19));
  }
  if (def.rankTier >= 3) {
    body.add(scaledMesh(UNIT_BOX, suitMat, 0.78, 0.16, 0.38, 0, 1.3, 0, castShadows));
    body.add(scaledMesh(UNIT_BOX, goldMat, 0.24, 0.06, 0.28, -0.36, 1.38, 0));
    body.add(scaledMesh(UNIT_BOX, goldMat, 0.24, 0.06, 0.28, 0.36, 1.38, 0));
    body.add(scaledMesh(UNIT_BOX, goldMat, 0.11, 0.11, 0.04, 0.19, 1.15, -0.185));
  }
  if (v.outfit === "senior_pinstripe" || v.outfit === "cfo_double_breasted" || v.outfit === "ceo_executive") {
    for (const bx of [-0.12, 0.12]) {
      body.add(scaledMesh(UNIT_CYL, goldMat, 0.05, 0.04, 0.05, bx, 0.92, -0.18));
      body.add(scaledMesh(UNIT_CYL, goldMat, 0.05, 0.04, 0.05, bx, 0.8, -0.18));
    }
  }
  if (v.insigniaCount > 0) {
    for (let c = 0; c < v.insigniaCount; c += 1) {
      body.add(scaledMesh(UNIT_BOX, goldMat, 0.12, 0.04, 0.035, -0.19, 1.04 + c * 0.065, -0.185));
    }
  }

  // Neck + Head + Eyes + Hair + Eyewear
  const headY = 1.58;
  body.add(scaledMesh(UNIT_CYL, skinMat, 0.16, 0.14, 0.16, 0, 1.35, 0));
  body.add(scaledMesh(UNIT_BOX, skinMat, 0.4, 0.4, 0.4, 0, headY, 0, castShadows));
  const eyeMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.2 });
  body.add(scaledMesh(UNIT_BOX, eyeMat, 0.055, 0.055, 0.03, -0.095, headY + 0.01, -0.205));
  body.add(scaledMesh(UNIT_BOX, eyeMat, 0.055, 0.055, 0.03, 0.095, headY + 0.01, -0.205));

  addHairMesh(body, v.hair || "neat", hairMat, headY, castShadows);
  addEyewearMesh(body, v.eyewear, accentMat, darkMat, goldMat, headY);

  // Executive C-Suite Crown for Tier 4 Bosses
  if (v.hasCrown) {
    const crownBand = scaledMesh(UNIT_CYL, goldMat, 0.42, 0.1, 0.42, 0, headY + 0.34, 0);
    body.add(crownBand);
    for (let k = 0; k < 4; k += 1) {
      const a = (k / 4) * Math.PI * 2;
      const spike = scaledMesh(UNIT_CONE, goldMat, 0.12, 0.16, 0.12, Math.cos(a) * 0.15, headY + 0.44, Math.sin(a) * 0.15);
      body.add(spike);
    }
  }

  // Articulated Arms pivoted at shoulder
  const buildArm = (side: number): THREE.Group => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.38, 1.24, 0);
    sh.add(scaledMesh(UNIT_BOX, suitMat, 0.16, 0.44, 0.18, 0, -0.18, 0, castShadows));
    sh.add(scaledMesh(UNIT_BOX, skinMat, 0.12, 0.12, 0.13, 0, -0.44, 0));
    return sh;
  };
  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  body.add(leftArm, rightArm);

  const halo = attachCorporateProp(
    v.prop,
    rightArm,
    leftArm,
    body,
    accentMat,
    darkMat,
    metalMat,
    goldMat,
    paperMat,
    castShadows
  );

  // Also include mainMat accent stripe on back so hitFlash lights cleanly
  body.add(scaledMesh(UNIT_BOX, mainMat, 0.24, 0.08, 0.04, 0, 1.26, 0.18));

  return { leftLeg, rightLeg, leftArm, rightArm, halo };
}

export function createEnemyRig(
  typeId: EnemyTypeId,
  shadowTexture: THREE.Texture,
  castShadows: boolean
): EnemyRig {
  const def = ENEMY_ARCHETYPES[typeId];
  const root = new THREE.Group();
  root.add(makeContactShadow(shadowTexture, def.radius * 1.18));

  const visual = new THREE.Group();
  root.add(visual);

  const mainMat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.48,
    metalness: 0.2
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: "#162030",
    roughness: 0.72,
    metalness: 0.25
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: def.accentColor,
    emissive: def.accentColor,
    emissiveIntensity: 0.5,
    roughness: 0.22,
    metalness: 0.5
  });

  const flashMaterials: THREE.MeshStandardMaterial[] = [mainMat, accentMat];
  let leftLeg: THREE.Group | undefined;
  let rightLeg: THREE.Group | undefined;
  let leftArm: THREE.Group | undefined;
  let rightArm: THREE.Group | undefined;
  let wingLeft: THREE.Object3D | undefined;
  let wingRight: THREE.Object3D | undefined;
  let halo: THREE.Object3D | undefined;

  if (typeId === "email") {
    visual.add(scaledMesh(UNIT_BOX, mainMat, 0.84, 0.54, 0.16, 0, 0.95, 0, castShadows));
    const flap = scaledMesh(UNIT_CONE, darkMat, 0.8, 0.34, 0.2, 0, 1.04, -0.09);
    flap.rotation.z = Math.PI;
    visual.add(flap);
    const seal = scaledMesh(UNIT_CYL, accentMat, 0.26, 0.08, 0.26, 0, 0.92, -0.11);
    seal.rotation.x = Math.PI / 2;
    visual.add(seal);

    wingLeft = scaledMesh(UNIT_BOX, accentMat, 0.42, 0.06, 0.28, -0.56, 1.02, 0);
    wingRight = scaledMesh(UNIT_BOX, accentMat, 0.42, 0.06, 0.28, 0.56, 1.02, 0);
    visual.add(wingLeft, wingRight);
  } else if (typeId === "bug") {
    visual.add(scaledMesh(UNIT_BOX, darkMat, 0.84, 0.5, 1.0, 0, 0.52, 0, castShadows));
    const shell = scaledMesh(UNIT_SPHERE, mainMat, 0.95, 0.68, 1.15, 0, 0.72, 0.04, castShadows);
    visual.add(shell);
    visual.add(scaledMesh(UNIT_BOX, accentMat, 0.28, 0.16, 0.62, 0, 0.96, 0.02));
    for (const side of [-1, 1]) {
      const horn = scaledMesh(UNIT_CONE, accentMat, 0.16, 0.38, 0.16, side * 0.24, 0.6, -0.6);
      horn.rotation.x = -Math.PI / 2.3;
      visual.add(horn);
      for (const zOff of [-0.26, 0.28]) {
        const leg = scaledMesh(UNIT_BOX, darkMat, 0.32, 0.12, 0.12, side * 0.56, 0.28, zOff);
        leg.rotation.z = side * -0.45;
        visual.add(leg);
      }
    }
  } else {
    const built = buildHumanoidEnemy(def, visual, mainMat, darkMat, accentMat, castShadows);
    leftLeg = built.leftLeg;
    rightLeg = built.rightLeg;
    leftArm = built.leftArm;
    rightArm = built.rightArm;
    halo = built.halo;
  }

  // Ground Rank Ring for Tier 2 (Leads), Tier 3 (Elites), Tier 4 (C-Suite Bosses)
  let rankRing: THREE.Mesh | undefined;
  if (def.rankTier >= 2) {
    const ringColor =
      def.rankTier === 4 ? "#eab308" : def.rankTier === 3 ? "#f59e0b" : def.accentColor;
    const inner = def.radius * (def.rankTier === 4 ? 0.88 : 0.86);
    const outer = def.radius * (def.rankTier === 4 ? 1.14 : 1.04);
    rankRing = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 24),
      new THREE.MeshBasicMaterial({
        color: ringColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: def.rankTier === 4 ? 0.86 : 0.58,
        depthWrite: false
      })
    );
    rankRing.rotation.x = -Math.PI / 2;
    rankRing.position.y = 0.032;
    root.add(rankRing);
  }

  // Rally aura ring (shown when rallied by Tech Lead / Senior Manager / Boss)
  const rallyHalo = new THREE.Mesh(
    new THREE.RingGeometry(def.radius * 1.05, def.radius * 1.24, 18),
    new THREE.MeshBasicMaterial({
      color: "#38bdf8",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    })
  );
  rallyHalo.rotation.x = -Math.PI / 2;
  rallyHalo.position.y = 0.042;
  rallyHalo.visible = false;
  root.add(rallyHalo);

  // World-space floating HP bar (shown when damaged or engaged)
  const barW = def.boss ? 2.6 : def.elite ? 1.75 : def.rankTier === 2 ? 1.4 : 1.12;
  const barY = def.visual.humanoid ? 2.1 * def.visual.heightScale + 0.25 : 1.75;
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(barW, 0.15),
    new THREE.MeshBasicMaterial({ color: "#0b1120", side: THREE.DoubleSide })
  );
  hpBarBg.position.set(0, barY, 0);
  hpBarBg.visible = false;
  root.add(hpBarBg);

  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(barW - 0.06, 0.095),
    new THREE.MeshBasicMaterial({
      color: def.boss ? "#f97316" : def.elite ? "#fbbf24" : def.rankTier === 2 ? "#38bdf8" : "#4ade80",
      side: THREE.DoubleSide
    })
  );
  hpBarFill.position.set(0, 0, 0.01);
  hpBarBg.add(hpBarFill);

  // Floating 3D Role Nameplate & Tier Badge directly above each enemy
  const plateTex = getEnemyNameplateTexture(def);
  const plateMat = new THREE.SpriteMaterial({
    map: plateTex,
    transparent: true,
    depthTest: true,
    depthWrite: false
  });
  const nameplate = new THREE.Sprite(plateMat);
  const plateW = def.boss ? 3.2 : def.elite ? 2.65 : def.rankTier === 2 ? 2.3 : 1.85;
  const plateH = plateW * (92 / 384);
  nameplate.scale.set(plateW, plateH, 1);
  nameplate.position.set(0, barY + plateH * 0.65 + 0.14, 0);
  nameplate.renderOrder = 10;
  root.add(nameplate);

  // QA Regression Freeze mark ring
  const markRing = new THREE.Mesh(
    new THREE.RingGeometry(def.radius * 0.95, def.radius * 1.18, 20),
    new THREE.MeshBasicMaterial({
      color: "#fde047",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
      depthWrite: false
    })
  );
  markRing.rotation.x = -Math.PI / 2;
  markRing.position.y = 0.048;
  markRing.visible = false;
  root.add(markRing);

  return {
    root,
    visual,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    wingLeft,
    wingRight,
    halo,
    rallyHalo,
    rankRing,
    hpBarBg,
    hpBarFill,
    nameplate,
    markRing,
    flashMaterials,
    baseEmissives: flashMaterials.map((m) => m.emissive.clone())
  };
}

export function createPickupMesh(kind: PickupKind, shadowTexture: THREE.Texture): THREE.Group {
  const root = new THREE.Group();
  root.add(makeContactShadow(shadowTexture, 0.56));

  const glowColor = kind === "coffee" ? "#f59e0b" : kind === "pizza" ? "#fb923c" : "#f472b6";
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.62, 20),
    new THREE.MeshBasicMaterial({
      color: glowColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  root.add(ring);

  const prop = new THREE.Group();
  prop.position.y = 0.52;
  root.add(prop);

  if (kind === "coffee") {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.17, 0.52, 12),
      new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.3 })
    );
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.225, 0.195, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.82 })
    );
    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.25, 0.08, 12),
      new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.45 })
    );
    lid.position.y = 0.28;
    prop.add(cup, sleeve, lid);
  } else if (kind === "pizza") {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.12, 0.76),
      new THREE.MeshStandardMaterial({ color: "#d6b289", roughness: 0.85 })
    );
    const cheese = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.05, 3),
      new THREE.MeshStandardMaterial({ color: "#fbbf24", roughness: 0.4 })
    );
    cheese.position.y = 0.09;
    const pep = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.06, 8),
      new THREE.MeshStandardMaterial({ color: "#dc2626", roughness: 0.5 })
    );
    pep.position.set(0, 0.11, 0.04);
    prop.add(box, cheese, pep);
  } else {
    const dough = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.11, 8, 16),
      new THREE.MeshStandardMaterial({ color: "#e5a967", roughness: 0.75 })
    );
    dough.rotation.x = Math.PI / 2;
    const glaze = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.105, 8, 16),
      new THREE.MeshStandardMaterial({ color: "#f472b6", roughness: 0.22 })
    );
    glaze.rotation.x = Math.PI / 2;
    glaze.position.y = 0.04;
    prop.add(dough, glaze);
  }

  root.userData.prop = prop;
  return root;
}

export function createDroneMesh(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.26, 0),
    new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.3, metalness: 0.75 })
  );
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.04, 8, 18),
    new THREE.MeshStandardMaterial({
      color: "#38bdf8",
      emissive: "#38bdf8",
      emissiveIntensity: 0.9,
      roughness: 0.2
    })
  );
  halo.rotation.x = Math.PI / 2;
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 8, 8),
    new THREE.MeshStandardMaterial({ color: "#e0f2fe", emissive: "#38bdf8", emissiveIntensity: 1.2 })
  );
  eye.position.z = -0.22;
  group.add(body, halo, eye);
  group.position.y = 1.55;
  return group;
}
