import { CLASS_MAP, ENEMY_ARCHETYPES } from "../game/data";
import type { EmployeeClassId, EnemyTypeId, HumanoidHairStyle, OfficeWeaponId } from "../game/types";

interface PortraitSpec {
  bgA: string;
  bgB: string;
  border: string;
  skin: string;
  hair: string;
  hairStyle: HumanoidHairStyle;
  suit: string;
  shirt: string;
  tie: string;
  eyewear: "none" | "glasses" | "visor" | "monocle" | "headset";
  insigniaCount: 0 | 1 | 2 | 3;
  hasCrown?: boolean;
  expression: "focused" | "confident" | "stern" | "smug" | "panicked";
  propBadge?: "coffee" | "shield" | "clipboard" | "briefcase" | "code" | "none";
}

function renderHair(style: HumanoidHairStyle, color: string): string {
  switch (style) {
    case "bun":
      return `
        <circle cx="48" cy="17" r="9" fill="${color}" />
        <path d="M27 36 C27 21 36 16 48 16 C60 16 69 21 69 36 C64 28 57 25 48 25 C39 25 32 28 27 36 Z" fill="${color}" />
      `;
    case "bob":
      return `
        <path d="M24 47 C24 22 33 15 48 15 C63 15 72 22 72 47 L67 52 L65 36 C61 28 55 25 48 25 C41 25 35 28 31 36 L29 52 Z" fill="${color}" />
      `;
    case "slick":
      return `
        <path d="M28 36 C27 22 36 16 49 16 C62 16 69 22 68 35 C63 27 56 24 45 24 C36 24 31 28 28 36 Z" fill="${color}" />
        <path d="M35 20 Q48 17 61 22" stroke="rgba(255,255,255,0.22)" stroke-width="2" fill="none" stroke-linecap="round" />
      `;
    case "silver_exec":
      return `
        <path d="M27 38 C26 21 35 14 48 14 C61 14 70 21 69 38 C64 28 57 24 48 24 C39 24 32 28 27 38 Z" fill="${color}" />
        <path d="M33 21 Q48 16 63 21" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2.2" fill="none" stroke-linecap="round" />
      `;
    case "fade":
      return `
        <path d="M30 33 C30 20 37 16 48 16 C59 16 66 20 66 33 L64 27 C59 24 54 23 48 23 C42 23 37 24 32 27 Z" fill="${color}" />
      `;
    case "messy":
      return `
        <path d="M27 37 C26 22 35 15 48 15 C61 15 70 22 69 37 L64 28 L57 31 L50 24 L42 30 L34 26 Z" fill="${color}" />
      `;
    default: // neat
      return `
        <path d="M28 36 C28 21 36 16 48 16 C60 16 68 21 68 36 C63 29 56 25 48 25 C40 25 33 29 28 36 Z" fill="${color}" />
      `;
  }
}

function renderEyewear(type: PortraitSpec["eyewear"], accent: string): string {
  if (type === "glasses") {
    return `
      <rect x="33" y="38" width="12" height="8" rx="2.5" fill="rgba(255,255,255,0.12)" stroke="${accent}" stroke-width="2" />
      <rect x="51" y="38" width="12" height="8" rx="2.5" fill="rgba(255,255,255,0.12)" stroke="${accent}" stroke-width="2" />
      <line x1="45" y1="42" x2="51" y2="42" stroke="${accent}" stroke-width="2" />
    `;
  }
  if (type === "visor") {
    return `
      <rect x="31" y="37" width="34" height="9" rx="3" fill="${accent}" fill-opacity="0.32" stroke="${accent}" stroke-width="2" />
      <line x1="36" y1="41" x2="58" y2="41" stroke="#ffffff" stroke-opacity="0.7" stroke-width="1.5" />
    `;
  }
  if (type === "monocle") {
    return `
      <circle cx="57" cy="42" r="6" fill="rgba(253,230,138,0.18)" stroke="#eab308" stroke-width="2" />
      <path d="M62 46 Q65 55 61 64" stroke="#eab308" stroke-width="1.4" fill="none" />
    `;
  }
  if (type === "headset") {
    return `
      <path d="M25 42 C25 22 34 15 48 15 C62 15 71 22 71 42" stroke="#1e293b" stroke-width="3.5" fill="none" />
      <rect x="22" y="36" width="6" height="13" rx="2.5" fill="${accent}" />
      <rect x="68" y="36" width="6" height="13" rx="2.5" fill="${accent}" />
      <path d="M26 48 Q33 54 44 53" stroke="#94a3b8" stroke-width="1.8" fill="none" />
    `;
  }
  return "";
}

function renderMouthAndBrows(expr: PortraitSpec["expression"]): string {
  if (expr === "stern") {
    return `
      <line x1="35" y1="36" x2="43" y2="38" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" />
      <line x1="61" y1="36" x2="53" y2="38" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" />
      <path d="M42 53 L54 52" stroke="#5b3428" stroke-width="2.2" stroke-linecap="round" />
    `;
  }
  if (expr === "smug") {
    return `
      <line x1="35" y1="37" x2="43" y2="36" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" />
      <line x1="53" y1="36" x2="61" y2="38" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" />
      <path d="M42 52 Q49 56 56 50" stroke="#5b3428" stroke-width="2.2" fill="none" stroke-linecap="round" />
    `;
  }
  if (expr === "panicked") {
    return `
      <path d="M35 37 Q39 34 43 36" stroke="#1e293b" stroke-width="2" fill="none" stroke-linecap="round" />
      <path d="M53 36 Q57 34 61 37" stroke="#1e293b" stroke-width="2" fill="none" stroke-linecap="round" />
      <ellipse cx="48" cy="53" rx="4" ry="3" fill="#5b3428" />
    `;
  }
  if (expr === "confident") {
    return `
      <line x1="35" y1="36" x2="43" y2="36" stroke="#1e293b" stroke-width="2" stroke-linecap="round" />
      <line x1="53" y1="36" x2="61" y2="36" stroke="#1e293b" stroke-width="2" stroke-linecap="round" />
      <path d="M42 51 Q48 56 54 51" stroke="#5b3428" stroke-width="2.2" fill="none" stroke-linecap="round" />
    `;
  }
  return `
    <line x1="35" y1="36" x2="43" y2="37" stroke="#1e293b" stroke-width="2" stroke-linecap="round" />
    <line x1="53" y1="37" x2="61" y2="36" stroke="#1e293b" stroke-width="2" stroke-linecap="round" />
    <path d="M43 52 Q48 54 53 52" stroke="#5b3428" stroke-width="2.1" fill="none" stroke-linecap="round" />
  `;
}

function renderHumanoidPortrait(spec: PortraitSpec, label: string): string {
  const chevrons =
    spec.insigniaCount > 0
      ? Array.from({ length: spec.insigniaCount }, (_, i) => {
          const y = 84 - i * 5.5;
          return `<path d="M72 ${y} L78 ${y - 4} L84 ${y}" stroke="${spec.border}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
        }).join("")
      : "";

  const crown = spec.hasCrown
    ? `<path d="M35 16 L39 7 L48 12 L57 7 L61 16 Z" fill="#eab308" stroke="#fef08a" stroke-width="1.2" />`
    : "";

  return `<svg viewBox="0 0 96 96" class="portrait-svg" role="img" aria-label="${label}">
    <defs>
      <linearGradient id="pbg-${label.replace(/[^a-z0-9]/gi, "")}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${spec.bgA}" />
        <stop offset="100%" stop-color="${spec.bgB}" />
      </linearGradient>
    </defs>
    <rect x="1.5" y="1.5" width="93" height="93" rx="11" fill="url(#pbg-${label.replace(/[^a-z0-9]/gi, "")})" stroke="${spec.border}" stroke-width="2.5" />
    <path d="M12 94 L18 69 C21 62 32 58 48 58 C64 58 75 62 78 69 L84 94 Z" fill="${spec.suit}" />
    <path d="M38 58 L48 76 L58 58 Z" fill="${spec.shirt}" />
    <path d="M45 64 L51 64 L52 87 L48 92 L44 87 Z" fill="${spec.tie}" />
    <path d="M36 58 L45 73 L40 76 L32 62 Z" fill="rgba(255,255,255,0.12)" />
    <path d="M60 58 L51 73 L56 76 L64 62 Z" fill="rgba(255,255,255,0.12)" />
    <rect x="42" y="52" width="12" height="10" rx="4" fill="${spec.skin}" />
    <rect x="30" y="23" width="36" height="36" rx="14" fill="${spec.skin}" />
    <circle cx="39" cy="42" r="2.4" fill="#0f172a" />
    <circle cx="57" cy="42" r="2.4" fill="#0f172a" />
    ${renderMouthAndBrows(spec.expression)}
    ${renderHair(spec.hairStyle, spec.hair)}
    ${renderEyewear(spec.eyewear, spec.border)}
    ${crown}
    ${chevrons}
  </svg>`;
}

function renderNonHumanoidPortrait(typeId: "email" | "bug", label: string): string {
  if (typeId === "email") {
    return `<svg viewBox="0 0 96 96" class="portrait-svg" role="img" aria-label="${label}">
      <rect x="1.5" y="1.5" width="93" height="93" rx="11" fill="#132238" stroke="#60a5fa" stroke-width="2.5" />
      <polygon points="8,44 26,38 26,56" fill="#93c5fd" opacity="0.85" />
      <polygon points="88,44 70,38 70,56" fill="#93c5fd" opacity="0.85" />
      <rect x="20" y="30" width="56" height="38" rx="5" fill="#3b82f6" stroke="#bfdbfe" stroke-width="2" />
      <path d="M22 33 L48 52 L74 33" fill="none" stroke="#0f172a" stroke-width="3.2" stroke-linejoin="round" />
      <circle cx="48" cy="52" r="9" fill="#ef4444" stroke="#fee2e2" stroke-width="2" />
      <text x="48" y="56" text-anchor="middle" fill="#ffffff" font-family="JetBrains Mono, monospace" font-weight="700" font-size="11">!</text>
    </svg>`;
  }
  return `<svg viewBox="0 0 96 96" class="portrait-svg" role="img" aria-label="${label}">
    <rect x="1.5" y="1.5" width="93" height="93" rx="11" fill="#2a1319" stroke="#ef4444" stroke-width="2.5" />
    <path d="M24 38 L14 30 M24 54 L12 56 M28 68 L18 76 M72 38 L82 30 M72 54 L84 56 M68 68 L78 76" stroke="#fca5a5" stroke-width="3" stroke-linecap="round" />
    <ellipse cx="48" cy="54" rx="22" ry="24" fill="#dc2626" stroke="#fecaca" stroke-width="2" />
    <line x1="48" y1="30" x2="48" y2="78" stroke="#450a0a" stroke-width="3" />
    <circle cx="40" cy="40" r="3.2" fill="#fef08a" />
    <circle cx="56" cy="40" r="3.2" fill="#fef08a" />
    <path d="M38 28 L33 18 M58 28 L63 18" stroke="#fca5a5" stroke-width="3" stroke-linecap="round" />
  </svg>`;
}

const employeePortraitCache = new Map<EmployeeClassId, string>();
const enemyPortraitCache = new Map<EnemyTypeId, string>();

export function getEmployeePortraitSvg(id: EmployeeClassId): string {
  const cached = employeePortraitCache.get(id);
  if (cached) return cached;
  const emp = CLASS_MAP[id];
  const specMap: Record<EmployeeClassId, PortraitSpec> = {
    junior: {
      bgA: "#0f2d2c",
      bgB: "#111b2a",
      border: emp.palette.primary,
      skin: emp.palette.skin,
      hair: emp.palette.hair,
      hairStyle: "bob",
      suit: emp.palette.primary,
      shirt: "#0f172a",
      tie: emp.palette.accent,
      eyewear: "glasses",
      insigniaCount: 0,
      expression: "confident"
    },
    senior: {
      bgA: "#242936",
      bgB: "#111622",
      border: emp.palette.accent,
      skin: emp.palette.skin,
      hair: emp.palette.hair,
      hairStyle: "slick",
      suit: emp.palette.primary,
      shirt: "#e2e8f0",
      tie: emp.palette.accent,
      eyewear: "glasses",
      insigniaCount: 1,
      expression: "focused"
    },
    qa: {
      bgA: "#302112",
      bgB: "#141822",
      border: emp.palette.primary,
      skin: emp.palette.skin,
      hair: emp.palette.hair,
      hairStyle: "bun",
      suit: emp.palette.primary,
      shirt: "#1f2937",
      tie: emp.palette.accent,
      eyewear: "headset",
      insigniaCount: 1,
      expression: "confident"
    },
    devops: {
      bgA: "#102536",
      bgB: "#0f1724",
      border: emp.palette.accent,
      skin: emp.palette.skin,
      hair: emp.palette.hair,
      hairStyle: "fade",
      suit: emp.palette.primary,
      shirt: "#0f172a",
      tie: emp.palette.accent,
      eyewear: "headset",
      insigniaCount: 1,
      expression: "focused"
    }
  };
  const svg = renderHumanoidPortrait(specMap[id], emp.characterName);
  employeePortraitCache.set(id, svg);
  return svg;
}

export function getEnemyPortraitSvg(typeId: EnemyTypeId): string {
  const cached = enemyPortraitCache.get(typeId);
  if (cached) return cached;
  const def = ENEMY_ARCHETYPES[typeId];
  let svg: string;
  if (!def.visual.humanoid) {
    svg = renderNonHumanoidPortrait(typeId === "email" ? "email" : "bug", def.name);
  } else {
    const expr: PortraitSpec["expression"] =
      typeId === "intern"
        ? "panicked"
        : def.rankTier === 4
        ? "smug"
        : def.rankTier === 3
        ? "stern"
        : "focused";
    svg = renderHumanoidPortrait(
      {
        bgA: def.rankTier === 4 ? "#261d14" : def.rankTier === 3 ? "#221d2b" : "#152132",
        bgB: "#0d131d",
        border: def.color,
        skin: def.visual.skinColor || "#e6b898",
        hair: def.visual.hairColor || "#1f2937",
        hairStyle: def.visual.hair || "neat",
        suit: def.visual.suitColor || "#1e293b",
        shirt: def.visual.shirtColor || "#f8fafc",
        tie: def.visual.tieColor || def.color,
        eyewear: def.visual.eyewear || "none",
        insigniaCount: def.visual.insigniaCount,
        hasCrown: def.visual.hasCrown,
        expression: expr
      },
      def.name
    );
  }
  enemyPortraitCache.set(typeId, svg);
  return svg;
}

export function getPortraitForId(id?: EmployeeClassId | EnemyTypeId): string | null {
  if (!id) return null;
  if (id in CLASS_MAP) return getEmployeePortraitSvg(id as EmployeeClassId);
  if (id in ENEMY_ARCHETYPES) return getEnemyPortraitSvg(id as EnemyTypeId);
  return null;
}

const weaponIconCache = new Map<OfficeWeaponId, string>();

export function getWeaponIconSvg(id: OfficeWeaponId): string {
  const cached = weaponIconCache.get(id);
  if (cached) return cached;

  let body = "";
  let accent = "#38bdf8";

  switch (id) {
    case "stapler":
      accent = "#ef4444";
      body = `
        <rect x="10" y="42" width="44" height="8" rx="3" fill="#1e293b" stroke="#64748b" stroke-width="1.6" />
        <path d="M12 36 L48 22 C52 21 55 24 54 28 L50 38 L14 40 Z" fill="#ef4444" stroke="#fca5a5" stroke-width="1.5" />
        <rect x="44" y="37" width="8" height="4" rx="1" fill="#e2e8f0" />
        <line x1="18" y1="30" x2="42" y2="23" stroke="rgba(255,255,255,0.45)" stroke-width="2" stroke-linecap="round" />
      `;
      break;
    case "mouse":
      accent = "#38bdf8";
      body = `
        <rect x="19" y="11" width="26" height="42" rx="13" fill="#e2e8f0" stroke="#38bdf8" stroke-width="2" />
        <line x1="32" y1="12" x2="32" y2="29" stroke="#64748b" stroke-width="1.8" />
        <line x1="19" y1="29" x2="45" y2="29" stroke="#94a3b8" stroke-width="1.5" />
        <rect x="29.5" y="17" width="5" height="9" rx="2.5" fill="#28b89d" />
        <path d="M32 6 Q40 4 44 10" stroke="#38bdf8" stroke-width="2" fill="none" stroke-linecap="round" />
      `;
      break;
    case "keyboard":
      accent = "#a855f7";
      body = `
        <rect x="7" y="18" width="50" height="28" rx="5" fill="#1e293b" stroke="#a855f7" stroke-width="2" />
        <rect x="12" y="23" width="6" height="5" rx="1.2" fill="#38bdf8" />
        <rect x="20" y="23" width="6" height="5" rx="1.2" fill="#a855f7" />
        <rect x="28" y="23" width="6" height="5" rx="1.2" fill="#f59e0b" />
        <rect x="36" y="23" width="6" height="5" rx="1.2" fill="#34d399" />
        <rect x="44" y="23" width="8" height="5" rx="1.2" fill="#f43f5e" />
        <rect x="12" y="30" width="8" height="5" rx="1.2" fill="#64748b" />
        <rect x="22" y="30" width="6" height="5" rx="1.2" fill="#64748b" />
        <rect x="30" y="30" width="6" height="5" rx="1.2" fill="#64748b" />
        <rect x="38" y="30" width="14" height="5" rx="1.2" fill="#38bdf8" />
        <rect x="18" y="37" width="28" height="4.5" rx="1.5" fill="#c084fc" />
      `;
      break;
    case "phone":
      accent = "#60a5fa";
      body = `
        <rect x="18" y="8" width="28" height="48" rx="6" fill="#0f172a" stroke="#60a5fa" stroke-width="2" />
        <rect x="22" y="14" width="20" height="34" rx="2.5" fill="#1e3a5f" />
        <rect x="27" y="10.5" width="10" height="2" rx="1" fill="#475569" />
        <circle cx="32" cy="51.5" r="2" fill="#64748b" />
        <rect x="24" y="18" width="16" height="7" rx="2" fill="#fbbf24" />
        <rect x="24" y="28" width="12" height="5" rx="1.5" fill="#38bdf8" />
        <circle cx="44" cy="14" r="5" fill="#ef4444" stroke="#0f172a" stroke-width="1.5" />
      `;
      break;
    case "bottle":
      accent = "#06b6d4";
      body = `
        <path d="M25 11 H39 V16 H25 Z" fill="#1e293b" stroke="#67e8f9" stroke-width="1.5" />
        <path d="M27 7 Q32 4 37 7" stroke="#67e8f9" stroke-width="2" fill="none" stroke-linecap="round" />
        <rect x="21" y="16" width="22" height="39" rx="6" fill="#0891b2" stroke="#67e8f9" stroke-width="2" />
        <rect x="21" y="29" width="22" height="10" fill="#e2e8f0" fill-opacity="0.22" />
        <line x1="26" y1="20" x2="26" y2="50" stroke="rgba(255,255,255,0.4)" stroke-width="2.2" stroke-linecap="round" />
      `;
      break;
    case "tablet":
      accent = "#28b89d";
      body = `
        <rect x="10" y="13" width="40" height="38" rx="5" fill="#1e293b" stroke="#28b89d" stroke-width="2" />
        <rect x="14" y="17" width="32" height="30" rx="2" fill="#0f2933" />
        <path d="M18 39 Q26 22 36 33 T43 21" stroke="#5eead4" stroke-width="2.4" fill="none" stroke-linecap="round" />
        <line x1="40" y1="36" x2="55" y2="16" stroke="#f8fafc" stroke-width="3.2" stroke-linecap="round" />
        <polygon points="39,37 42,35 37,40" fill="#28b89d" />
      `;
      break;
    case "monitor":
      accent = "#3b82f6";
      body = `
        <rect x="7" y="11" width="50" height="32" rx="4" fill="#0f172a" stroke="#60a5fa" stroke-width="2.2" />
        <rect x="11" y="15" width="42" height="24" rx="1.5" fill="#1d4ed8" />
        <path d="M14 33 L24 23 L32 29 L46 18" stroke="#93c5fd" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        <rect x="28" y="43" width="8" height="7" fill="#94a3b8" />
        <rect x="20" y="49" width="24" height="4" rx="2" fill="#cbd5e1" />
      `;
      break;
    case "mug":
      accent = "#f59e0b";
      body = `
        <path d="M43 25 C52 25 53 41 43 41" stroke="#fde68a" stroke-width="3.5" fill="none" stroke-linecap="round" />
        <rect x="14" y="21" width="30" height="31" rx="5" fill="#f59e0b" stroke="#fde68a" stroke-width="2" />
        <ellipse cx="29" cy="22" rx="13" ry="3.2" fill="#451a03" />
        <path d="M23 15 Q21 11 24 8" stroke="#fde68a" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M31 14 Q29 10 32 7" stroke="#fde68a" stroke-width="2" fill="none" stroke-linecap="round" />
        <rect x="20" y="31" width="18" height="10" rx="2" fill="#fffbeb" fill-opacity="0.25" />
      `;
      break;
    case "scissors":
      accent = "#fb923c";
      body = `
        <line x1="25" y1="36" x2="50" y2="12" stroke="#e2e8f0" stroke-width="4.2" stroke-linecap="round" />
        <line x1="39" y1="36" x2="14" y2="12" stroke="#cbd5e1" stroke-width="4.2" stroke-linecap="round" />
        <circle cx="32" cy="29" r="2.6" fill="#0f172a" stroke="#fb923c" stroke-width="1.5" />
        <circle cx="20" cy="45" r="8" fill="none" stroke="#fb923c" stroke-width="3.6" />
        <circle cx="44" cy="45" r="8" fill="none" stroke="#fb923c" stroke-width="3.6" />
      `;
      break;
    case "tape":
      accent = "#eab308";
      body = `
        <path d="M12 46 L14 28 C16 20 26 16 34 22 L44 34 L54 34 L54 46 Z" fill="#1e293b" stroke="#eab308" stroke-width="2" stroke-linejoin="round" />
        <circle cx="27" cy="31" r="11" fill="#facc15" fill-opacity="0.88" stroke="#fef08a" stroke-width="2" />
        <circle cx="27" cy="31" r="5" fill="#0f172a" />
        <line x1="36" y1="24" x2="52" y2="34" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round" />
        <rect x="51" y="32" width="4" height="5" fill="#cbd5e1" />
      `;
      break;
  }

  const svg = `<svg viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-label="${id}"><rect x="1" y="1" width="62" height="62" rx="11" fill="#0d1724" stroke="${accent}" stroke-opacity="0.45" stroke-width="1.6" />${body}</svg>`;
  weaponIconCache.set(id, svg);
  return svg;
}

