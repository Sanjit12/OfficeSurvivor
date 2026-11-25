import {
  ALL_STATIONS,
  CAMPUS_BOUNDS,
  CAMPUS_DOORWAYS,
  CAMPUS_FURNITURE,
  CAMPUS_OBSTACLES,
  CAMPUS_WALLS,
  CFO_TERMINAL_STATION,
  ESPRESSO_STATION,
  getDoorwaySteerTarget,
  getRoomAtPosition,
  getRoomById,
  getRoomCenter,
  HR_SHREDDER_STATION,
  LOUNGE_STATION,
  OFFICE_ROOMS,
  PRINTER_STATION,
  ROOM_MAP,
  SERVER_STATION,
  STATION_MAP,
  WASHROOM_STATION,
  WHITEBOARD_STATION
} from "./campus";
import type {
  DifficultyDef,
  DifficultyId,
  EmployeeClassDef,
  EmployeeClassId,
  EnemyArchetypeDef,
  EnemyTypeId,
  OfficeWeaponDef,
  OfficeWeaponId,
  PerkDef,
  SaveData,
  ShopItemDef,
  StoryChapter
} from "./types";

export {
  ALL_STATIONS,
  CAMPUS_BOUNDS as WORLD_BOUNDS,
  CAMPUS_DOORWAYS,
  CAMPUS_FURNITURE,
  CAMPUS_OBSTACLES as OFFICE_OBSTACLES,
  CAMPUS_WALLS,
  CFO_TERMINAL_STATION,
  ESPRESSO_STATION,
  getDoorwaySteerTarget,
  getRoomAtPosition,
  getRoomById,
  getRoomCenter,
  HR_SHREDDER_STATION,
  LOUNGE_STATION,
  OFFICE_ROOMS,
  PRINTER_STATION,
  ROOM_MAP,
  SERVER_STATION,
  STATION_MAP,
  WASHROOM_STATION,
  WHITEBOARD_STATION
};

export const DAY_LENGTH_SECONDS = 210; // 3.5-minute punchy, high-energy 8-hour workday arc
export const MAX_CONCURRENT_TELEGRAPHS = 4;
export const SAVE_KEY = "office-survivor-3d-save-v3";
export const LEGACY_SAVE_KEY = "office-survivor-3d-save-v2";

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: "intern",
    label: "Intern",
    shortLabel: "Intern",
    tagline: "Forgiving pace · 0.78× threat · 0.85× salary",
    enemyHpMult: 0.78,
    enemySpeedMult: 0.88,
    enemyDamageMult: 0.75,
    spawnRateMult: 0.84,
    salaryMult: 0.85,
    bossPhaseThreshold: 0.45,
    hazardDurationMult: 0.85
  },
  {
    id: "standard",
    label: "Standard",
    shortLabel: "Standard",
    tagline: "Intended corporate chaos · 1.0× salary",
    enemyHpMult: 1.0,
    enemySpeedMult: 1.0,
    enemyDamageMult: 1.0,
    spawnRateMult: 1.0,
    salaryMult: 1.0,
    bossPhaseThreshold: 0.5,
    hazardDurationMult: 1.0
  },
  {
    id: "crunch",
    label: "Crunch Time",
    shortLabel: "Crunch",
    tagline: "Aggressive Lead & Manager squads · 1.4× salary",
    enemyHpMult: 1.32,
    enemySpeedMult: 1.12,
    enemyDamageMult: 1.28,
    spawnRateMult: 1.22,
    salaryMult: 1.4,
    bossPhaseThreshold: 0.55,
    hazardDurationMult: 1.18
  },
  {
    id: "nightmare",
    label: "Boardroom Nightmare",
    shortLabel: "Nightmare",
    tagline: "Relentless C-Suite assault · +70% threat · 2.0× salary",
    enemyHpMult: 1.7,
    enemySpeedMult: 1.22,
    enemyDamageMult: 1.6,
    spawnRateMult: 1.4,
    salaryMult: 2.0,
    bossPhaseThreshold: 0.6,
    hazardDurationMult: 1.35
  }
];

export const DIFFICULTY_MAP: Record<DifficultyId, DifficultyDef> = {
  intern: DIFFICULTIES[0],
  standard: DIFFICULTIES[1],
  crunch: DIFFICULTIES[2],
  nightmare: DIFFICULTIES[3]
};

export const DIFFICULTY_RANK: Record<DifficultyId, number> = {
  intern: 1,
  standard: 2,
  crunch: 3,
  nightmare: 4
};

export const EMPLOYEE_CLASSES: EmployeeClassDef[] = [
  {
    id: "junior",
    characterName: "Maya Lin",
    roleTitle: "Junior Developer",
    tagline: "Day 14 at Apex Corp. Powered by oat lattes and pure optimism.",
    bio: "Learns frighteningly fast, carries a sticker-armored company laptop, and somehow shipped the only working endpoint in the tower.",
    passiveLabel: "+25% XP Gain · Nimble Step",
    skillName: "Stack Overflow Surge",
    skillDescription: "Dash forward with brief invulnerability and unleash 6 radial hotfix commits.",
    skillCooldown: 6.5,
    weapon: {
      name: "Hotfix Twin-Burst",
      summary: "Rapid dual-shot commit pulses with crisp spread.",
      evolvedName: "Canary Tri-Burst",
      evolvedSummary: "Fires 3 piercing emerald hotfix bolts per volley.",
      evolutionPerkId: "fast_ci",
      evolutionMinLevel: 3
    },
    palette: {
      primary: "#28b89d",
      secondary: "#1e293b",
      accent: "#7dd3fc",
      hair: "#1f1924",
      skin: "#f1c7a4"
    },
    stats: {
      productivity: 11,
      maxEnergy: 105,
      focus: 100,
      happiness: 110,
      speed: 9.0,
      xpRate: 1.25,
      meetingResist: 1.0,
      bugBonus: 1.0,
      outageResist: 0.05,
      crit: 0.08,
      pierce: 0
    }
  },
  {
    id: "senior",
    characterName: "Marcus Vance",
    roleTitle: "Senior Developer",
    tagline: "Survived three pivots, two acquisitions, and a rewrite in Rust.",
    bio: "Writes terrifyingly clean code, pierces through IT Auditor shields in one commit, and keeps an espresso thermos inside his blazer.",
    passiveLabel: "+35% Productivity · +1 Pierce",
    skillName: "Refactor Nova",
    skillDescription: "Blast a shockwave that damages, shoves back nearby threats, and breaks Meeting Lock.",
    skillCooldown: 7.5,
    weapon: {
      name: "Monolith Rail Commit",
      summary: "Heavy piercing slugs that bypass frontal shields.",
      evolvedName: "Zero-Copy Railgun",
      evolvedSummary: "Massive amber rails with +2 extra pierce and +30% impact.",
      evolutionPerkId: "extra_ram",
      evolutionMinLevel: 3
    },
    palette: {
      primary: "#475569",
      secondary: "#0f172a",
      accent: "#f59e0b",
      hair: "#2d2622",
      skin: "#b97f59"
    },
    stats: {
      productivity: 15,
      maxEnergy: 102,
      focus: 105,
      happiness: 88,
      speed: 8.3,
      xpRate: 1.0,
      meetingResist: 1.12,
      bugBonus: 1.1,
      outageResist: 0.1,
      crit: 0.12,
      pierce: 1
    }
  },
  {
    id: "qa",
    characterName: "Priya Nair",
    roleTitle: "QA Engineer",
    tagline: "Finds edge cases in reality itself, then logs them as P0.",
    bio: "Armed with an illuminated test-suite scanner. Urgent Bugs pay out huge bounties when Priya closes them with critical precision.",
    passiveLabel: "+22% Crit · +40% Bug Bounties",
    skillName: "Regression Freeze",
    skillDescription: "Deploy a 5s stasis field around you that slows threats 65% and guarantees critical hits.",
    skillCooldown: 8.0,
    weapon: {
      name: "Precision Test Probe",
      summary: "High-crit laser probes tuned for Urgent Bugs.",
      evolvedName: "Zero-Day Ricochet",
      evolvedSummary: "Probes chain-ricochet to 2 nearby threats with guaranteed bonus crit.",
      evolutionPerkId: "rubber_duck",
      evolutionMinLevel: 3
    },
    palette: {
      primary: "#d97706",
      secondary: "#27272a",
      accent: "#fde68a",
      hair: "#17141d",
      skin: "#a66c49"
    },
    stats: {
      productivity: 12,
      maxEnergy: 110,
      focus: 108,
      happiness: 102,
      speed: 8.7,
      xpRate: 1.08,
      meetingResist: 1.05,
      bugBonus: 1.4,
      outageResist: 0.15,
      crit: 0.22,
      pierce: 0
    }
  },
  {
    id: "devops",
    characterName: "Devon Brooks",
    roleTitle: "DevOps Engineer",
    tagline: "The pager never sleeps, and neither does Apex Tower's cluster.",
    bio: "Strolls calmly through production fires wearing studio ANC headphones. Deploys autonomous CI/CD drones and shrugs off server outages.",
    passiveLabel: "+20 Energy · 55% Outage Resist",
    skillName: "Hot-Swap Drone",
    skillDescription: "Dash out of trouble, restore 18 Energy, and deploy an autonomous CI/CD turret for 9s.",
    skillCooldown: 8.5,
    weapon: {
      name: "Dual Packet Stream",
      summary: "Parallel twin packet bolts with steady suppression.",
      evolvedName: "Cluster Mesh Barrage",
      evolvedSummary: "Twin overloaded beams + orbiting drones fire 35% faster.",
      evolutionPerkId: "wingman_drone",
      evolutionMinLevel: 3
    },
    palette: {
      primary: "#334155",
      secondary: "#0f172a",
      accent: "#38bdf8",
      hair: "#221b18",
      skin: "#7c4e36"
    },
    stats: {
      productivity: 12.5,
      maxEnergy: 125,
      focus: 100,
      happiness: 98,
      speed: 8.5,
      xpRate: 1.0,
      meetingResist: 1.1,
      bugBonus: 1.05,
      outageResist: 0.55,
      crit: 0.1,
      pierce: 0
    }
  }
];

export const CLASS_MAP: Record<EmployeeClassId, EmployeeClassDef> = {
  junior: EMPLOYEE_CLASSES[0],
  senior: EMPLOYEE_CLASSES[1],
  qa: EMPLOYEE_CLASSES[2],
  devops: EMPLOYEE_CLASSES[3]
};

/**
 * 10 Playable Office-Supply Weapons — any employee can equip any weapon in the Arsenal!
 */
export const OFFICE_WEAPONS: OfficeWeaponDef[] = [
  {
    id: "stapler",
    name: "Red Stapler",
    shortName: "Stapler",
    roleTag: "TWIN BURST",
    pattern: "burst",
    summary: "Iconic red Swingline firing snappy dual staple bursts at high tempo.",
    evolvedName: "Jam-Proof Heavy Stapler",
    evolvedSummary: "3-staple fan volley with built-in armor pierce.",
    color: "#ef4444",
    accentColor: "#e2e8f0",
    damageMult: 0.72,
    fireRateMult: 1.32,
    speedMult: 1.12,
    rangeMult: 1.0,
    critBonus: 0.04,
    pierceBonus: 0,
    ricochetBonus: 0,
    projectileRadius: 0.24,
    projectileCount: 2,
    evolvedCount: 3,
    spreadRad: 0.12,
    splashRadius: 0,
    slowDuration: 0,
    markDuration: 0,
    knockScale: 2.6
  },
  {
    id: "mouse",
    name: "Wireless Mouse",
    shortName: "Mouse",
    roleTag: "RICOCHET",
    pattern: "ricochet",
    summary: "High-DPI optical mouse that zips rapidly and ricochets between targets.",
    evolvedName: "8000-DPI Macro Mouse",
    evolvedSummary: "Twin laser-guided mice that chain-bounce across rooms.",
    color: "#38bdf8",
    accentColor: "#28b89d",
    damageMult: 0.96,
    fireRateMult: 1.2,
    speedMult: 1.24,
    rangeMult: 1.06,
    critBonus: 0.06,
    pierceBonus: 0,
    ricochetBonus: 1,
    projectileRadius: 0.25,
    projectileCount: 1,
    evolvedCount: 2,
    spreadRad: 0.14,
    splashRadius: 0,
    slowDuration: 0,
    markDuration: 0,
    knockScale: 2.8
  },
  {
    id: "keyboard",
    name: "Mech Keyboard",
    shortName: "Keyboard",
    roleTag: "SHOTGUN",
    pattern: "spread",
    summary: "Tactile clicky board blasting a 4-keycap RGB scatter fan with heavy knockback.",
    evolvedName: "Hot-Swap RGB 100% Board",
    evolvedSummary: "6-keycap shockwave spread that shreds crowds and pierces.",
    color: "#a855f7",
    accentColor: "#38bdf8",
    damageMult: 0.56,
    fireRateMult: 0.82,
    speedMult: 0.96,
    rangeMult: 0.86,
    critBonus: 0.03,
    pierceBonus: 0,
    ricochetBonus: 0,
    projectileRadius: 0.25,
    projectileCount: 4,
    evolvedCount: 6,
    spreadRad: 0.44,
    splashRadius: 0,
    slowDuration: 0,
    markDuration: 0,
    knockScale: 4.5
  },
  {
    id: "phone",
    name: "Company Phone",
    shortName: "Phone",
    roleTag: "MARK + BOUNCE",
    pattern: "ricochet",
    summary: "Long-range notification alerts that bounce to nearby foes and mark them for crits.",
    evolvedName: "On-Call Pager Storm",
    evolvedSummary: "Dual bouncing alerts with extended crit-mark duration.",
    color: "#60a5fa",
    accentColor: "#fbbf24",
    damageMult: 0.94,
    fireRateMult: 1.08,
    speedMult: 1.18,
    rangeMult: 1.18,
    critBonus: 0.08,
    pierceBonus: 0,
    ricochetBonus: 1,
    projectileRadius: 0.24,
    projectileCount: 1,
    evolvedCount: 2,
    spreadRad: 0.16,
    splashRadius: 0,
    slowDuration: 0,
    markDuration: 3.2,
    knockScale: 2.4
  },
  {
    id: "bottle",
    name: "Hydro Water Bottle",
    shortName: "Water Bottle",
    roleTag: "SPLASH SLOW",
    pattern: "splash",
    summary: "Insulated steel flask that bursts in a chilly 2.6m splash, slowing nearby enemies.",
    evolvedName: "64oz Cryo Jug",
    evolvedSummary: "Massive 3.5m icy splash radius with heavy freeze slow.",
    color: "#06b6d4",
    accentColor: "#67e8f9",
    damageMult: 1.36,
    fireRateMult: 0.78,
    speedMult: 0.88,
    rangeMult: 0.98,
    critBonus: 0.02,
    pierceBonus: 0,
    ricochetBonus: 0,
    projectileRadius: 0.34,
    projectileCount: 1,
    evolvedCount: 1,
    spreadRad: 0,
    splashRadius: 2.6,
    slowDuration: 2.2,
    markDuration: 0,
    knockScale: 4.6
  },
  {
    id: "tablet",
    name: "Drawing Tablet",
    shortName: "Tablet",
    roleTag: "PIERCE DISC",
    pattern: "pierce",
    summary: "Wide spinning stylus slate that slices cleanly straight through 3 enemies in a row.",
    evolvedName: "Pro Vector Slate",
    evolvedSummary: "Twin piercing discs that carve through entire hallways.",
    color: "#28b89d",
    accentColor: "#5eead4",
    damageMult: 1.14,
    fireRateMult: 0.96,
    speedMult: 1.15,
    rangeMult: 1.12,
    critBonus: 0.05,
    pierceBonus: 2,
    ricochetBonus: 0,
    projectileRadius: 0.34,
    projectileCount: 1,
    evolvedCount: 2,
    spreadRad: 0.16,
    splashRadius: 0,
    slowDuration: 0,
    markDuration: 0,
    knockScale: 3.0
  },
  {
    id: "monitor",
    name: "27\" 4K Monitor",
    shortName: "Monitor",
    roleTag: "HEAVY SIEGE",
    pattern: "cannon",
    summary: "Thunderous ultrawide display cannon with massive damage, pierce, and shatter AoE.",
    evolvedName: "Dual-4K Curved Wall",
    evolvedSummary: "Devastating 3.2m pixel-shatter blast with unstoppable knockback.",
    color: "#3b82f6",
    accentColor: "#93c5fd",
    damageMult: 2.15,
    fireRateMult: 0.56,
    speedMult: 0.82,
    rangeMult: 1.04,
    critBonus: 0.05,
    pierceBonus: 1,
    ricochetBonus: 0,
    projectileRadius: 0.48,
    projectileCount: 1,
    evolvedCount: 1,
    spreadRad: 0,
    splashRadius: 2.3,
    slowDuration: 0,
    markDuration: 0,
    knockScale: 6.2
  },
  {
    id: "mug",
    name: "Hot Coffee Mug",
    shortName: "Coffee Mug",
    roleTag: "HOT SPLASH",
    pattern: "splash",
    summary: "Scalding ceramic espresso mug with high crit rate and a 2.2m caffeine splash.",
    evolvedName: "Triple-Shot Carafe",
    evolvedSummary: "Launches twin scalding mugs with wider espresso splash zones.",
    color: "#f59e0b",
    accentColor: "#fde68a",
    damageMult: 1.16,
    fireRateMult: 0.94,
    speedMult: 0.96,
    rangeMult: 0.96,
    critBonus: 0.1,
    pierceBonus: 0,
    ricochetBonus: 0,
    projectileRadius: 0.3,
    projectileCount: 1,
    evolvedCount: 2,
    spreadRad: 0.18,
    splashRadius: 2.2,
    slowDuration: 0,
    markDuration: 0,
    knockScale: 3.4
  },
  {
    id: "scissors",
    name: "Office Scissors",
    shortName: "Scissors",
    roleTag: "CRIT PIERCE",
    pattern: "pierce",
    summary: "Razor-sharp budget-cutting shears with +14% crit chance and twin piercing blades.",
    evolvedName: "Executive Red-Tape Shears",
    evolvedSummary: "Triple spinning blades with lethal critical strikes against Managers.",
    color: "#fb923c",
    accentColor: "#e2e8f0",
    damageMult: 0.82,
    fireRateMult: 1.12,
    speedMult: 1.22,
    rangeMult: 1.02,
    critBonus: 0.14,
    pierceBonus: 1,
    ricochetBonus: 0,
    projectileRadius: 0.25,
    projectileCount: 2,
    evolvedCount: 3,
    spreadRad: 0.15,
    splashRadius: 0,
    slowDuration: 0,
    markDuration: 0,
    knockScale: 2.5
  },
  {
    id: "tape",
    name: "Tape Dispenser",
    shortName: "Tape Roll",
    roleTag: "SNARE SLOW",
    pattern: "snare",
    summary: "Weighted desk tape rolls that bounce between foes and sticky-slow them for 2.8s.",
    evolvedName: "Industrial Duct-Tape Rig",
    evolvedSummary: "Twin sticky rolls with a 2.4m snare burst that halts chargers.",
    color: "#eab308",
    accentColor: "#fef08a",
    damageMult: 1.04,
    fireRateMult: 0.98,
    speedMult: 0.98,
    rangeMult: 1.0,
    critBonus: 0.03,
    pierceBonus: 0,
    ricochetBonus: 1,
    projectileRadius: 0.3,
    projectileCount: 1,
    evolvedCount: 2,
    spreadRad: 0.18,
    splashRadius: 0,
    slowDuration: 2.8,
    markDuration: 0,
    knockScale: 3.0
  }
];

export const OFFICE_WEAPON_MAP: Record<OfficeWeaponId, OfficeWeaponDef> = Object.fromEntries(
  OFFICE_WEAPONS.map((w) => [w.id, w])
) as Record<OfficeWeaponId, OfficeWeaponDef>;

export const SHOP_ITEMS: ShopItemDef[] = [
  {
    id: "laptop",
    name: "M-Series Workstation",
    baseCost: 75,
    maxLevel: 5,
    description: "Compiles before the fan even remembers how to scream.",
    effectLabel: "+1.8 Productivity / lvl"
  },
  {
    id: "chair",
    name: "Ergonomic Mesh Chair",
    baseCost: 70,
    maxLevel: 5,
    description: "Lumbar support that adds real hours to your stamina bar.",
    effectLabel: "+10 Max Energy / lvl"
  },
  {
    id: "coffee",
    name: "Single-Origin Espresso",
    baseCost: 90,
    maxLevel: 4,
    description: "Cafeteria cups heal harder and taste less like copier toner.",
    effectLabel: "+15% Coffee Heal / lvl"
  },
  {
    id: "internet",
    name: "Redundant Fiber Uplink",
    baseCost: 85,
    maxLevel: 4,
    description: "Keeps commits flowing even when IT trips over the core switch.",
    effectLabel: "+10% Outage Resist / lvl"
  },
  {
    id: "monitor",
    name: "Ultrawide Monitor Array",
    baseCost: 105,
    maxLevel: 4,
    description: "Wider targeting reach across connected offices and corridors.",
    effectLabel: "+1.4m Reach / lvl"
  },
  {
    id: "assistant",
    name: "Automated CI/CD Runner",
    baseCost: 140,
    maxLevel: 3,
    description: "Accelerates task throughput and shaves skill cooldowns.",
    effectLabel: "+12% Fire Rate / lvl"
  }
];

export const PERK_POOL: PerkDef[] = [
  {
    id: "mech_keyboard",
    name: "Tactile Mechanical Switches",
    category: "Hardware",
    rarity: "Common",
    description: "Productivity +20%. Every keystroke echoes across the bullpen."
  },
  {
    id: "fast_ci",
    name: "Parallel Build Pipeline",
    category: "Automation",
    rarity: "Common",
    synergyFor: "junior",
    description: "Attack speed +22%. Unlocks Maya's Canary Tri-Burst evolution at Level 3+."
  },
  {
    id: "ultrawide",
    name: "Curved Dual Display",
    category: "Hardware",
    rarity: "Common",
    description: "Work reach +22% and projectile velocity +20%."
  },
  {
    id: "anc_headphones",
    name: "Studio ANC Headphones",
    category: "Wellness",
    rarity: "Rare",
    description: "Meeting damage -28% and cuts Meeting Lock & HR Policy Silence."
  },
  {
    id: "standing_desk",
    name: "Motorized Standing Desk",
    category: "Wellness",
    rarity: "Common",
    description: "Max Energy +28 and immediately restore 28 Energy."
  },
  {
    id: "rubber_duck",
    name: "Golden Rubber Duck",
    category: "Workflow",
    rarity: "Rare",
    synergyFor: "qa",
    description: "Critical chance +16%. Unlocks Priya's Zero-Day Ricochet evolution at Level 3+."
  },
  {
    id: "extra_ram",
    name: "128GB Unified Memory",
    category: "Hardware",
    rarity: "Rare",
    synergyFor: "senior",
    description: "Commits pierce +1 extra threat & bypass IT Auditor shields. Unlocks Marcus's Railgun at Lvl 3+."
  },
  {
    id: "espresso_iv",
    name: "Double-Shot Pour Over",
    category: "Wellness",
    rarity: "Common",
    description: "Cafeteria & Coffee heal +35% more and recharge faster."
  },
  {
    id: "sticky_flow",
    name: "Deep-Work Calendar Block",
    category: "Workflow",
    rarity: "Common",
    description: "Move speed +12%, Dodge cooldown -15%, and Focus recovers faster."
  },
  {
    id: "desk_monstera",
    name: "Desk Monstera Plant",
    category: "Wellness",
    rarity: "Common",
    description: "Passive Energy regeneration whenever Focus is above 65%."
  },
  {
    id: "wingman_drone",
    name: "Autonomous Lint Drone",
    category: "Automation",
    rarity: "Executive",
    synergyFor: "devops",
    description: "Deploys a 25s defense drone & -15% skill CD. Unlocks Devon's Cluster Mesh at Lvl 3+."
  },
  {
    id: "dark_mode",
    name: "High-Contrast Dark Theme",
    category: "Workflow",
    rarity: "Common",
    description: "Happiness +18% (boosts end-of-shift Salary bonus) and +10% Productivity."
  }
];

/**
 * Full 17-Rank Corporate Hierarchy Registry
 * Every rank has distinct 3D silhouette/scale/attire/prop, custom SVG portrait, and combat behavior.
 */
export const ENEMY_ARCHETYPES: Record<EnemyTypeId, EnemyArchetypeDef> = {
  // === TIER 1: FRONTLINE CHAOS & JUNIOR STAFF ===
  email: {
    id: "email",
    name: "Unread Email",
    titleBadge: "Tier 1 · Inbox Swarm",
    shortLabel: "MAIL",
    rankTier: 1,
    department: "All-Hands Inbox",
    traitSummary: "Fast darting inbox spam that swarms corridors in packs.",
    policy: "swarmer",
    color: "#60a5fa",
    accentColor: "#ef4444",
    hp: 20,
    speed: 4.5,
    radius: 0.56,
    damage: 5,
    focusDamage: 5,
    xp: 9,
    salary: 4,
    visual: { humanoid: false, heightScale: 0.9, insigniaCount: 0 }
  },
  bug: {
    id: "bug",
    name: "Urgent P0 Bug",
    titleBadge: "Tier 1 · Production Fault",
    shortLabel: "BUG",
    rankTier: 1,
    department: "Production",
    traitSummary: "Telegraphs a red crimson line, then lunges straight across rooms.",
    policy: "charger",
    color: "#ef4444",
    accentColor: "#fca5a5",
    hp: 58,
    speed: 3.15,
    radius: 0.72,
    damage: 13,
    focusDamage: 5,
    xp: 24,
    salary: 14,
    visual: { humanoid: false, heightScale: 0.95, insigniaCount: 0 }
  },
  intern: {
    id: "intern",
    name: "Overeager Intern",
    titleBadge: "Tier 1 · Junior Staff",
    shortLabel: "INTERN",
    rankTier: 1,
    department: "Operations",
    traitSummary: "Sprints carrying overflowing coffee trays; spills slowing puddles if unstopped.",
    policy: "swarmer",
    color: "#38bdf8",
    accentColor: "#f59e0b",
    hp: 34,
    speed: 4.65,
    radius: 0.58,
    damage: 7,
    focusDamage: 6,
    xp: 14,
    salary: 7,
    visual: {
      humanoid: true,
      heightScale: 0.92,
      outfit: "intern_shirt",
      prop: "coffee_tray",
      hair: "messy",
      eyewear: "none",
      insigniaCount: 0,
      skinColor: "#e8be9e",
      hairColor: "#4a3325",
      suitColor: "#cbd5e1",
      shirtColor: "#f8fafc",
      tieColor: "#38bdf8"
    }
  },
  analyst: {
    id: "analyst",
    name: "Junior Analyst",
    titleBadge: "Tier 1 · Reporting Staff",
    shortLabel: "ANALYST",
    rankTier: 1,
    department: "Finance & Data",
    traitSummary: "Maintains range behind stacked binders and fires crisp spreadsheet memos.",
    policy: "ranged",
    color: "#818cf8",
    accentColor: "#c7d2fe",
    hp: 46,
    speed: 3.25,
    radius: 0.62,
    damage: 9,
    focusDamage: 8,
    xp: 20,
    salary: 10,
    visual: {
      humanoid: true,
      heightScale: 0.96,
      outfit: "analyst_tie",
      prop: "binders",
      hair: "neat",
      eyewear: "glasses",
      insigniaCount: 0,
      skinColor: "#d39c78",
      hairColor: "#1f1b24",
      suitColor: "#334155",
      shirtColor: "#e2e8f0",
      tieColor: "#6366f1"
    }
  },

  // === TIER 2: FUNCTIONAL LEADS & SPECIALISTS ===
  tech_lead: {
    id: "tech_lead",
    name: "Tech Lead",
    titleBadge: "Tier 2 · Functional Lead",
    shortLabel: "T-LEAD",
    rankTier: 2,
    department: "Engineering",
    traitSummary: "Projects an Architecture Rally aura boosting nearby staff speed + fires cyan bolts.",
    policy: "lead_buffer",
    color: "#14b8a6",
    accentColor: "#5eead4",
    hp: 82,
    speed: 3.35,
    radius: 0.72,
    damage: 12,
    focusDamage: 9,
    xp: 36,
    salary: 18,
    visual: {
      humanoid: true,
      heightScale: 1.13,
      outfit: "tech_blazer",
      prop: "holo_tablet",
      hair: "fade",
      eyewear: "visor",
      insigniaCount: 1,
      skinColor: "#c98e68",
      hairColor: "#1a1820",
      suitColor: "#1e293b",
      shirtColor: "#0f766e",
      tieColor: "#2dd4bf"
    }
  },
  product_lead: {
    id: "product_lead",
    name: "Product Lead",
    titleBadge: "Tier 2 · Roadmap Lead",
    shortLabel: "P-LEAD",
    rankTier: 2,
    department: "Product",
    traitSummary: "Deploys Scope Creep reinforcements and fires priority Kanban cards.",
    policy: "lead_spawner",
    color: "#f59e0b",
    accentColor: "#fde68a",
    hp: 78,
    speed: 3.2,
    radius: 0.72,
    damage: 11,
    focusDamage: 10,
    xp: 38,
    salary: 20,
    visual: {
      humanoid: true,
      heightScale: 1.12,
      outfit: "product_vest",
      prop: "kanban_board",
      hair: "bob",
      eyewear: "glasses",
      insigniaCount: 1,
      skinColor: "#f0c2a2",
      hairColor: "#5b3222",
      suitColor: "#1e3a5f",
      shirtColor: "#f8fafc",
      tieColor: "#f59e0b"
    }
  },
  hr_specialist: {
    id: "hr_specialist",
    name: "HR Specialist",
    titleBadge: "Tier 2 · People Ops",
    shortLabel: "HR",
    rankTier: 2,
    department: "Human Resources",
    traitSummary: "Drops plum Policy Silence zones that slow weapon tempo (cleanse in Washrooms or HR Shredder).",
    policy: "hr_silencer",
    color: "#a855f7",
    accentColor: "#e9d5ff",
    hp: 74,
    speed: 3.15,
    radius: 0.7,
    damage: 11,
    focusDamage: 12,
    xp: 34,
    salary: 17,
    meeting: true,
    visual: {
      humanoid: true,
      heightScale: 1.11,
      outfit: "hr_blazer",
      prop: "clipboard",
      hair: "bun",
      eyewear: "glasses",
      insigniaCount: 1,
      skinColor: "#e3b290",
      hairColor: "#281b2d",
      suitColor: "#6b21a8",
      shirtColor: "#faf5ff",
      tieColor: "#d8b4fe"
    }
  },
  it_auditor: {
    id: "it_auditor",
    name: "IT Security Auditor",
    titleBadge: "Tier 2 · InfoSec Shield",
    shortLabel: "INFOSEC",
    rankTier: 2,
    department: "IT Security",
    traitSummary: "Carries a directional Firewall Shield (-65% frontal damage; flank or use piercing rails!).",
    policy: "shield_auditor",
    color: "#38bdf8",
    accentColor: "#bae6fd",
    hp: 96,
    speed: 2.6,
    radius: 0.78,
    damage: 13,
    focusDamage: 8,
    xp: 40,
    salary: 22,
    shielded: true,
    visual: {
      humanoid: true,
      heightScale: 1.16,
      outfit: "security_jacket",
      prop: "firewall_shield",
      hair: "neat",
      eyewear: "headset",
      insigniaCount: 1,
      skinColor: "#9c6747",
      hairColor: "#14161c",
      suitColor: "#0f172a",
      shirtColor: "#334155",
      tieColor: "#38bdf8"
    }
  },

  // === TIER 3: MIDDLE & SENIOR MANAGEMENT (ELITES) ===
  manager: {
    id: "manager",
    name: "Middle Manager",
    titleBadge: "Tier 3 · Management",
    shortLabel: "MGR",
    rankTier: 3,
    department: "Operations",
    traitSummary: "Casts golden Mandatory Sync rings that lock movement unless dodged.",
    policy: "manager",
    color: "#f59e0b",
    accentColor: "#fef08a",
    hp: 108,
    speed: 2.85,
    radius: 0.8,
    damage: 15,
    focusDamage: 12,
    xp: 46,
    salary: 24,
    elite: true,
    meeting: true,
    visual: {
      humanoid: true,
      heightScale: 1.25,
      outfit: "manager_suit",
      prop: "calendar_slate",
      hair: "slick",
      eyewear: "none",
      insigniaCount: 2,
      skinColor: "#e6b898",
      hairColor: "#262120",
      suitColor: "#1e293b",
      shirtColor: "#f8fafc",
      tieColor: "#dc2626"
    }
  },
  senior_manager: {
    id: "senior_manager",
    name: "Senior Manager",
    titleBadge: "Tier 3 · Senior Management",
    shortLabel: "SR MGR",
    rankTier: 3,
    department: "Executive Ops",
    traitSummary: "Pinstripe elite with golden lapel. Rallies nearby staff & casts staggered double Sync Rings.",
    policy: "senior_manager",
    color: "#eab308",
    accentColor: "#fef08a",
    hp: 162,
    speed: 2.75,
    radius: 0.9,
    damage: 17,
    focusDamage: 14,
    xp: 68,
    salary: 38,
    elite: true,
    meeting: true,
    visual: {
      humanoid: true,
      heightScale: 1.35,
      outfit: "senior_pinstripe",
      prop: "dual_tablets",
      hair: "slick",
      eyewear: "glasses",
      insigniaCount: 3,
      skinColor: "#cfa080",
      hairColor: "#3f3a36",
      suitColor: "#182235",
      shirtColor: "#f1f5f9",
      tieColor: "#eab308"
    }
  },
  hr_director: {
    id: "hr_director",
    name: "HR Director",
    titleBadge: "Tier 3 · People Leadership",
    shortLabel: "HR DIR",
    rankTier: 3,
    department: "Human Resources",
    traitSummary: "Crimson executive blazer. Deploys wide PIP Silence Zones and fires compliance volleys.",
    policy: "hr_director",
    color: "#e11d48",
    accentColor: "#fda4af",
    hp: 152,
    speed: 2.8,
    radius: 0.88,
    damage: 16,
    focusDamage: 16,
    xp: 66,
    salary: 36,
    elite: true,
    meeting: true,
    visual: {
      humanoid: true,
      heightScale: 1.32,
      outfit: "hr_director_coat",
      prop: "pip_dossier",
      hair: "bob",
      eyewear: "glasses",
      insigniaCount: 3,
      skinColor: "#e8be9e",
      hairColor: "#2d1a22",
      suitColor: "#881337",
      shirtColor: "#fff1f2",
      tieColor: "#f43f5e"
    }
  },
  vp_ops: {
    id: "vp_ops",
    name: "VP of Operations",
    titleBadge: "Tier 3 · Vice President",
    shortLabel: "VP OPS",
    rankTier: 3,
    department: "Executive Wing",
    traitSummary: "Tall armored navy overcoat. Performs Restructuring Charges and ground-slam shockwaves.",
    policy: "vp_bruiser",
    color: "#f97316",
    accentColor: "#fed7aa",
    hp: 196,
    speed: 2.55,
    radius: 0.96,
    damage: 20,
    focusDamage: 14,
    xp: 82,
    salary: 48,
    elite: true,
    visual: {
      humanoid: true,
      heightScale: 1.44,
      outfit: "vp_overcoat",
      prop: "directive_batons",
      hair: "fade",
      eyewear: "visor",
      insigniaCount: 3,
      skinColor: "#8c5b3f",
      hairColor: "#171717",
      suitColor: "#0f1e36",
      shirtColor: "#cbd5e1",
      tieColor: "#f97316"
    }
  },

  // === TIER 4: C-SUITE FLOOR BOSSES (UNIQUE 2-PHASE ENCOUNTERS) ===
  boss_cto: {
    id: "boss_cto",
    name: "CTO Chad Sterling",
    titleBadge: "C-Suite · Chief Tech Officer",
    shortLabel: "CTO",
    rankTier: 4,
    department: "Floor 12 · Engineering",
    traitSummary: "Hoodie-under-blazer tech titan with orbiting server blades. Phase II triggers Friday Rewrite surges.",
    policy: "boss",
    color: "#06b6d4",
    accentColor: "#a5f3fc",
    hp: 430,
    speed: 2.85,
    radius: 1.24,
    damage: 20,
    focusDamage: 14,
    xp: 145,
    salary: 95,
    boss: true,
    visual: {
      humanoid: true,
      heightScale: 1.72,
      outfit: "cto_hoodie_blazer",
      prop: "server_drones",
      hair: "messy",
      eyewear: "visor",
      insigniaCount: 3,
      hasCrown: true,
      skinColor: "#e8be9e",
      hairColor: "#2d241e",
      suitColor: "#162436",
      shirtColor: "#0891b2",
      tieColor: "#22d3ee"
    }
  },
  boss_hr: {
    id: "boss_hr",
    name: "Head of HR Diane Vance",
    titleBadge: "C-Suite · Chief People Officer",
    shortLabel: "CPO / HR",
    rankTier: 4,
    department: "Floor 24 · People Ops",
    traitSummary: "Burgundy-ivory power suit. Unleashes Policy Silence rings & HR escorts; Phase II starts Performance Review.",
    policy: "boss",
    color: "#c026d3",
    accentColor: "#f5d0fe",
    hp: 510,
    speed: 2.75,
    radius: 1.26,
    damage: 22,
    focusDamage: 16,
    xp: 175,
    salary: 120,
    boss: true,
    meeting: true,
    visual: {
      humanoid: true,
      heightScale: 1.74,
      outfit: "cpo_power_suit",
      prop: "podium_wand",
      hair: "bun",
      eyewear: "glasses",
      insigniaCount: 3,
      hasCrown: true,
      skinColor: "#ddb092",
      hairColor: "#291824",
      suitColor: "#701a75",
      shirtColor: "#fdf4ff",
      tieColor: "#e879f9"
    }
  },
  boss_cfo: {
    id: "boss_cfo",
    name: "CFO Victor Sterling-Hayes",
    titleBadge: "C-Suite · Chief Financial Officer",
    shortLabel: "CFO",
    rankTier: 4,
    department: "Floor 32 · Finance",
    traitSummary: "Double-breasted charcoal pinstripe & gilded Ledger Briefcase. Drops Audit Tax Rings & Q4 Budget Cut slams.",
    policy: "boss",
    color: "#10b981",
    accentColor: "#fde68a",
    hp: 600,
    speed: 2.68,
    radius: 1.32,
    damage: 24,
    focusDamage: 15,
    xp: 205,
    salary: 155,
    boss: true,
    visual: {
      humanoid: true,
      heightScale: 1.78,
      outfit: "cfo_double_breasted",
      prop: "ledger_briefcase",
      hair: "silver_exec",
      eyewear: "monocle",
      insigniaCount: 3,
      hasCrown: true,
      skinColor: "#e3ba9b",
      hairColor: "#cbd5e1",
      suitColor: "#142620",
      shirtColor: "#f8fafc",
      tieColor: "#eab308"
    }
  },
  boss_coo: {
    id: "boss_coo",
    name: "COO Elena Cross",
    titleBadge: "C-Suite · Chief Operating Officer",
    shortLabel: "COO",
    rankTier: 4,
    department: "Floor 42 · Operations",
    traitSummary: "Slate-gold executive trench & Ops Holomap. Rapid directives & Manager squad reinforcement drops.",
    policy: "boss",
    color: "#f97316",
    accentColor: "#fed7aa",
    hp: 690,
    speed: 2.95,
    radius: 1.34,
    damage: 25,
    focusDamage: 16,
    xp: 235,
    salary: 185,
    boss: true,
    meeting: true,
    visual: {
      humanoid: true,
      heightScale: 1.8,
      outfit: "coo_trench",
      prop: "ops_holomap",
      hair: "bob",
      eyewear: "visor",
      insigniaCount: 3,
      hasCrown: true,
      skinColor: "#c88d68",
      hairColor: "#1c1917",
      suitColor: "#27272a",
      shirtColor: "#f8fafc",
      tieColor: "#f97316"
    }
  },
  boss_ceo: {
    id: "boss_ceo",
    name: "CEO Arthur Pendelton",
    titleBadge: "C-Suite · Chief Executive Officer",
    shortLabel: "CEO",
    rankTier: 4,
    department: "Floor 50 · Penthouse",
    traitSummary: "Towering midnight-navy & gold suit with radiant Executive Crown & Scepter. Commands multi-rank escorts and Hostile Takeover beams.",
    policy: "boss",
    color: "#eab308",
    accentColor: "#fef08a",
    hp: 840,
    speed: 2.88,
    radius: 1.44,
    damage: 28,
    focusDamage: 18,
    xp: 310,
    salary: 260,
    boss: true,
    meeting: true,
    visual: {
      humanoid: true,
      heightScale: 1.92,
      outfit: "ceo_executive",
      prop: "ceo_scepter",
      hair: "silver_exec",
      eyewear: "none",
      insigniaCount: 3,
      hasCrown: true,
      skinColor: "#e6be9e",
      hairColor: "#e2e8f0",
      suitColor: "#0c1528",
      shirtColor: "#ffffff",
      tieColor: "#eab308"
    }
  }
};

export const HIERARCHY_LIST: EnemyArchetypeDef[] = Object.values(ENEMY_ARCHETYPES);

/**
 * 5 Progressive Corporate Tower Floors (Levels 1–5)
 */
export const STORY_CHAPTERS: StoryChapter[] = [
  {
    day: 1,
    floorNumber: 12,
    department: "Engineering Wing",
    weekday: "Monday",
    title: "The Friday Rewrite",
    subtitle: "CTO Chad just moved launch up by six weeks.",
    briefing:
      "Clear Floor 12's Engineering Bullpen and IT Server Room. Watch for Tech Leads rallying junior staff before CTO Chad Sterling enters from the Executive Wing.",
    modifierLabel: "Floor 12 · Engineering: Cafeteria Espresso ready at clock-in; IT Server surges active.",
    themeColor: "#06b6d4",
    focusRoomId: "bullpen",
    allowedEnemies: ["email", "bug", "intern", "analyst", "tech_lead", "manager"],
    midBoss: "senior_manager",
    finalBoss: "boss_cto",
    comms: [
      {
        minute: 4,
        speaker: "CTO Chad Sterling",
        role: "Chief Technology Officer",
        portraitId: "boss_cto",
        avatarColor: "#06b6d4",
        text: "Morning rockstars! Quick pivot: we promised the board a full rewrite by 5 PM. Stay agile across all 10 rooms!",
        classReply: {
          junior: "I literally just learned where the washrooms and cafeteria are!",
          senior: "Updating my resume in a separate terminal tab.",
          qa: "Staging currently returns HTTP 418. Good luck with that.",
          devops: "Nobody touch the IT Server Room until I finish this espresso."
        }
      },
      {
        minute: 140,
        speaker: "Senior Manager",
        role: "Engineering Ops",
        portraitId: "senior_manager",
        avatarColor: "#eab308",
        text: "Escalation alert! I'm rallying the Bullpen staff for a mandatory mid-day architecture sync."
      },
      {
        minute: 360,
        speaker: "CTO Chad Sterling",
        role: "Chief Technology Officer",
        portraitId: "boss_cto",
        avatarColor: "#06b6d4",
        text: "Stepping out of my suite with the server blade array. Show me 10x velocity!"
      }
    ],
    dilemma: {
      title: "12:30 PM · The Cafeteria Reply-All",
      sender: "All-Tower Mailing List",
      prompt:
        "An overeager intern emailed all 50 floors asking if the Cafeteria oat milk expired. Sixty managers just replied 'Please remove me from this thread.'",
      choices: [
        {
          id: "mute-thread",
          label: "Deploy Auto-Filter Rule",
          sublabel: "+20% Focus · +1.8 Productivity · Clean inbox",
          outcomeText: "Silence returns to Floor 12. Your commit velocity spikes.",
          effects: { focus: 20, productivityBonus: 1.8 }
        },
        {
          id: "reply-meme",
          label: "Reply-All with a Dry Joke",
          sublabel: "+22% Happiness · +$65 Bonus · -12 Energy",
          outcomeText: "The Engineering Bullpen erupts in applause; HR opens a folder.",
          effects: { happiness: 22, salary: 65, energy: -12, achievement: "Reply-All Legend" }
        }
      ]
    }
  },
  {
    day: 2,
    floorNumber: 24,
    department: "People & Operations",
    weekday: "Tuesday",
    title: "Mandatory Synergy Audit",
    subtitle: "HR Specialists & Product Leads patrol every corridor.",
    briefing:
      "HR Policy Silence rings slow your tempo—duck into the Washrooms Vanity or HR Office Policy Shredder to cleanse debuffs before facing Head of HR Diane Vance.",
    modifierLabel: "Floor 24 · People Ops: Active HR Specialists & Product Leads; Washroom cleanse ready.",
    themeColor: "#c026d3",
    focusRoomId: "hr_office",
    allowedEnemies: ["email", "intern", "analyst", "product_lead", "hr_specialist", "manager", "hr_director"],
    midBoss: "hr_director",
    finalBoss: "boss_hr",
    comms: [
      {
        minute: 5,
        speaker: "Diane Vance",
        role: "Chief People Officer",
        portraitId: "boss_hr",
        avatarColor: "#c026d3",
        text: "Welcome to Floor 24! Your mandatory 45-minute Culture Alignment quiz is overdue. My HR Specialists are fanning out now.",
        classReply: {
          junior: "Heading straight to the HR Policy Shredder!",
          senior: "A cold splash in the Washrooms beats a compliance lecture.",
          qa: "Found three contradictions in Section 4 of the handbook.",
          devops: "Setting my Slack status to 'In a Tunnel'."
        }
      },
      {
        minute: 350,
        speaker: "Diane Vance",
        role: "Chief People Officer",
        portraitId: "boss_hr",
        avatarColor: "#c026d3",
        text: "Enough dodging! Step into the Atrium for your live Performance Review!"
      }
    ],
    dilemma: {
      title: "12:30 PM · Surprise Culture Survey",
      sender: "HR Office Intercom",
      prompt:
        "HR dropped an 'anonymous' survey requiring your badge ID. Meanwhile, the Casual Lounge Nap Pod just opened up.",
      choices: [
        {
          id: "nap-lounge",
          label: "Slip Into the Casual Lounge",
          sublabel: "+30 Energy · +16% Happiness · Zero guilt",
          outcomeText: "Ten quiet minutes by the ping-pong table restores your soul.",
          effects: { energy: 30, happiness: 16 }
        },
        {
          id: "radical-feedback",
          label: "Submit Brutally Honest Notes",
          sublabel: "+$95 Salary · +2.4 Productivity · -15 Energy",
          outcomeText: "Leadership calls it 'bold ownership.' You get a spot bonus.",
          effects: { salary: 95, productivityBonus: 2.4, energy: -15, achievement: "Culture Rebel" }
        }
      ]
    }
  },
  {
    day: 3,
    floorNumber: 32,
    department: "Finance & Audit",
    weekday: "Wednesday",
    title: "Q4 Budget Cuts",
    subtitle: "IT Security Auditors & Senior Managers lock down the wing.",
    briefing:
      "Flank shielded IT Security Auditors (or pierce straight through them), hit the CFO Suite Audit Terminal for 2× Salary surges, and outlast CFO Victor Sterling-Hayes.",
    modifierLabel: "Floor 32 · Finance: +15% Salary payout; IT Auditors & Senior Managers deployed.",
    themeColor: "#10b981",
    focusRoomId: "cfo_suite",
    allowedEnemies: ["bug", "analyst", "tech_lead", "it_auditor", "manager", "senior_manager"],
    midBoss: "senior_manager",
    finalBoss: "boss_cfo",
    comms: [
      {
        minute: 5,
        speaker: "Victor Sterling-Hayes",
        role: "Chief Financial Officer",
        portraitId: "boss_cfo",
        avatarColor: "#10b981",
        text: "Expense reports on Floor 32 are under audit! My InfoSec shields and Senior Managers will inspect every single commit.",
        classReply: {
          junior: "Did they really put a firewall shield on an accountant?!",
          senior: "Piercing rails laugh at frontal shields.",
          qa: "I'm flanking right around their blind spot.",
          devops: "Let's hijack their CFO Audit Terminal for double salary."
        }
      },
      {
        minute: 350,
        speaker: "Victor Sterling-Hayes",
        role: "Chief Financial Officer",
        portraitId: "boss_cfo",
        avatarColor: "#10b981",
        text: "Time to trim headcount! Watch out for my gilded Ledger Briefcase!"
      }
    ],
    dilemma: {
      title: "12:30 PM · The Unapproved Cloud Bill",
      sender: "CFO Suite Vault",
      prompt:
        "Someone left a 64-GPU cluster running over the weekend. The invoice just landed on Victor's mahogany desk.",
      choices: [
        {
          id: "optimize-cluster",
          label: "Auto-Scale Down & Save $40k",
          sublabel: "+26 Energy · +22% Focus",
          outcomeText: "Finance nods respectfully. Zero escalation emails all afternoon.",
          effects: { energy: 26, focus: 22 }
        },
        {
          id: "rebrand-ai",
          label: "Label It 'Executive R&D'",
          sublabel: "+$125 Salary · +2.8 Productivity · -14 Energy",
          outcomeText: "The CFO doubles your budget instead. Legendary paperwork.",
          effects: { salary: 125, productivityBonus: 2.8, energy: -14, achievement: "Budget Wizard" }
        }
      ]
    }
  },
  {
    day: 4,
    floorNumber: 42,
    department: "Strategy & Product",
    weekday: "Thursday",
    title: "All-Hands War Room",
    subtitle: "VPs of Operations coordinate multi-room squad pushes.",
    briefing:
      "Every department converges on Floor 42. Rotate between the Boardroom Whiteboard, Cafeteria Espresso, and Washrooms before COO Elena Cross launches Mandatory Crunch.",
    modifierLabel: "Floor 42 · Strategy: VP of Operations elites & rapid cross-room squads.",
    themeColor: "#f97316",
    focusRoomId: "boardroom",
    allowedEnemies: ["bug", "intern", "tech_lead", "product_lead", "hr_specialist", "it_auditor", "senior_manager", "vp_ops"],
    midBoss: "vp_ops",
    finalBoss: "boss_coo",
    comms: [
      {
        minute: 5,
        speaker: "COO Elena Cross",
        role: "Chief Operating Officer",
        portraitId: "boss_coo",
        avatarColor: "#f97316",
        text: "Floor 42 is now an active War Room! VPs of Operations are coordinating multi-room sweeps across every doorway.",
        classReply: {
          junior: "Good thing our tactical minimap tracks every room!",
          senior: "Let's rotate from Boardroom to Cafeteria and pick them apart.",
          qa: "Marking every VP for guaranteed crits.",
          devops: "IT Server EMP is charged and waiting."
        }
      },
      {
        minute: 350,
        speaker: "COO Elena Cross",
        role: "Chief Operating Officer",
        portraitId: "boss_coo",
        avatarColor: "#f97316",
        text: "Operations override engaged! Entering the floor personally!"
      }
    ],
    dilemma: {
      title: "12:30 PM · Executive Boardroom Demo",
      sender: "Boardroom Intercom",
      prompt:
        "Investors just stepped off the elevator into the Boardroom and want a live walkthrough of your architecture.",
      choices: [
        {
          id: "real-demo",
          label: "Run the Live Production Build",
          sublabel: "+25% Focus · +$95 Salary · +15% Happiness",
          outcomeText: "Zero crashes. The investors clap while management looks stunned.",
          effects: { focus: 25, salary: 95, happiness: 15, achievement: "Radical Candor" }
        },
        {
          id: "synergy-deck",
          label: "Deploy Buzzword Slide Deck",
          sublabel: "+$140 Salary · +2.8 Productivity · -14% Focus",
          outcomeText: "'Hyper-scale synergy' buys you an uninterrupted afternoon.",
          effects: { salary: 140, productivityBonus: 2.8, focus: -14 }
        }
      ]
    }
  },
  {
    day: 5,
    floorNumber: 50,
    department: "Executive Penthouse",
    weekday: "Friday",
    title: "Hostile Takeover",
    subtitle: "The full corporate ladder defends the CEO Corner Suite.",
    briefing:
      "The summit of Apex Tower. Every corporate rank patrols the 10-room penthouse while CEO Arthur Pendelton awaits in the CEO Corner Suite. Survive to 5:00 PM and defeat the CEO!",
    modifierLabel: "Floor 50 · Penthouse: Full Hierarchy Roster, Bonus Pizza Drops & CEO Climax.",
    themeColor: "#eab308",
    focusRoomId: "ceo_suite",
    allowedEnemies: ["bug", "analyst", "tech_lead", "product_lead", "hr_specialist", "it_auditor", "manager", "senior_manager", "hr_director", "vp_ops"],
    midBoss: "vp_ops",
    finalBoss: "boss_ceo",
    comms: [
      {
        minute: 4,
        speaker: "CEO Arthur Pendelton",
        role: "Chief Executive Officer",
        portraitId: "boss_ceo",
        avatarColor: "#eab308",
        text: "So you climbed all the way to Floor 50. Impressive. Let's see how you handle the entire Executive Leadership Team!",
        classReply: {
          junior: "From Day 1 Intern coffee runs to the 50th floor penthouse—let's finish this!",
          senior: "One final commit and I'm taking a two-week vacation.",
          qa: "All tests green. Time to close the biggest ticket in the building.",
          devops: "Penthouse cluster locked. Bring on the C-Suite."
        }
      },
      {
        minute: 350,
        speaker: "CEO Arthur Pendelton",
        role: "Chief Executive Officer",
        portraitId: "boss_ceo",
        avatarColor: "#eab308",
        text: "Stepping out of the CEO Corner Suite! Prepare for a Hostile Takeover!"
      }
    ],
    dilemma: {
      title: "12:30 PM · The Golden Parachute Offer",
      sender: "CEO Corner Suite",
      prompt:
        "Arthur slides an executive contract across the mahogany desk—or you can split Friday penthouse pizza with the crew in the Casual Lounge.",
      choices: [
        {
          id: "lounge-pizza",
          label: "Rally the Crew & Eat Pizza",
          sublabel: "+38 Energy · +24% Happiness · Team morale peak",
          outcomeText: "Your crew cheers from the Casual Lounge. You feel unstoppable.",
          effects: { energy: 38, happiness: 24, achievement: "Penthouse Legend" }
        },
        {
          id: "counter-offer",
          label: "Counter-Offer for Equity",
          sublabel: "+3.8 Productivity · +$160 Salary · -15 Energy",
          outcomeText: "You negotiate 2× equity on the spot. Pure executive presence.",
          effects: { productivityBonus: 3.8, salary: 160, energy: -15 }
        }
      ]
    }
  }
];

export function getChapterForDay(day: number): StoryChapter {
  const idx = ((day - 1) % STORY_CHAPTERS.length + STORY_CHAPTERS.length) % STORY_CHAPTERS.length;
  return STORY_CHAPTERS[idx];
}

export function getShopItemCost(item: ShopItemDef, level: number): number {
  return Math.floor(item.baseCost * Math.pow(1.68, level));
}

export function getMaxUnlockedDay(save: SaveData): number {
  return Math.min(STORY_CHAPTERS.length, Math.max(1, save.highestDayCleared + 1, save.day));
}

export function computeEffectiveStartingStats(save: SaveData): {
  energy: number;
  productivity: number;
  critPct: number;
  speed: number;
  range: number;
} {
  const emp = CLASS_MAP[save.selectedClass] || CLASS_MAP.junior;
  const wpn = OFFICE_WEAPON_MAP[save.selectedWeapon] || OFFICE_WEAPON_MAP.stapler;
  const laptopLvl = save.upgrades.laptop || 0;
  const chairLvl = save.upgrades.chair || 0;
  const monitorLvl = save.upgrades.monitor || 0;
  return {
    energy: Math.round(emp.stats.maxEnergy + chairLvl * 10),
    productivity: Number(((emp.stats.productivity + laptopLvl * 1.8) * wpn.damageMult).toFixed(1)),
    critPct: Math.round(Math.min(0.95, emp.stats.crit + wpn.critBonus) * 100),
    speed: Number(emp.stats.speed.toFixed(1)),
    range: Number(((12.0 + monitorLvl * 1.4) * wpn.rangeMult).toFixed(1))
  };
}
