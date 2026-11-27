export type EmployeeClassId = "junior" | "senior" | "qa" | "devops";

export type OfficeWeaponId =
  | "stapler"
  | "mouse"
  | "keyboard"
  | "phone"
  | "bottle"
  | "tablet"
  | "monitor"
  | "mug"
  | "scissors"
  | "tape";

export type OfficeWeaponPattern =
  | "burst"
  | "ricochet"
  | "spread"
  | "splash"
  | "pierce"
  | "cannon"
  | "snare";

export type EnemyProjectileKind =
  | "spreadsheet"
  | "kanban_card"
  | "code_review"
  | "coffee_cup"
  | "policy_memo"
  | "calendar_invite"
  | "firewall_disc"
  | "server_blade"
  | "audit_ledger"
  | "exec_directive";

export type DifficultyId = "intern" | "standard" | "crunch" | "nightmare";

export type GameScreenState =
  | "title"
  | "playing"
  | "paused"
  | "upgrade"
  | "dilemma"
  | "gameover";

export type GraphicsQuality = "low" | "medium" | "high";
export type CameraViewMode = "third" | "fps";
export type CameraZoomPreset = "close" | "standard" | "wide";
export type CameraTiltPreset = "tactical" | "isometric" | "cinematic";
export type AimMode = "auto" | "manual";

export type KeyAction =
  | "moveUp"
  | "moveDown"
  | "moveLeft"
  | "moveRight"
  | "dodge"
  | "skill"
  | "claimPerk"
  | "toggleView"
  | "pause"
  | "mute";

export type KeyBindings = Record<KeyAction, string>;

export interface AudioSettings {
  masterVolume: number; // 0..1
  sfxVolume: number; // 0..1
  uiVolume: number; // 0..1
  muted: boolean;
}

export interface VideoSettings {
  quality: GraphicsQuality;
  shadows: boolean;
  fpsCap: 0 | 30 | 60;
}

export interface CameraSettings {
  viewMode: CameraViewMode;
  zoom: CameraZoomPreset;
  tilt: CameraTiltPreset;
  mouseSensitivity: number; // 0.3..2.0
}

export interface GameplaySettings {
  aimMode: AimMode;
  screenShake: boolean;
  hitstop: boolean;
  damageNumbers: boolean;
}

export interface GameSettings {
  audio: AudioSettings;
  video: VideoSettings;
  camera: CameraSettings;
  gameplay: GameplaySettings;
  bindings: KeyBindings;
}

export interface DifficultyDef {
  id: DifficultyId;
  label: string;
  shortLabel: string;
  tagline: string;
  enemyHpMult: number;
  enemySpeedMult: number;
  enemyDamageMult: number;
  spawnRateMult: number;
  salaryMult: number;
  bossPhaseThreshold: number;
  hazardDurationMult: number;
}

export type CorporateRankTier = 1 | 2 | 3 | 4;

export type EnemyTypeId =
  // Tier 1: Frontline Chaos & Junior Staff
  | "email"
  | "bug"
  | "intern"
  | "analyst"
  // Tier 2: Functional Leads & Specialists
  | "tech_lead"
  | "product_lead"
  | "hr_specialist"
  | "it_auditor"
  // Tier 3: Middle & Senior Management (Elites)
  | "manager"
  | "senior_manager"
  | "hr_director"
  | "vp_ops"
  // Tier 4: C-Suite Floor Bosses
  | "boss_cto"
  | "boss_hr"
  | "boss_cfo"
  | "boss_coo"
  | "boss_ceo";

export type EnemyPolicy =
  | "swarmer"
  | "charger"
  | "ranged"
  | "lead_buffer"
  | "lead_spawner"
  | "hr_silencer"
  | "shield_auditor"
  | "manager"
  | "senior_manager"
  | "hr_director"
  | "vp_bruiser"
  | "boss";

export type HumanoidOutfitStyle =
  | "intern_shirt"
  | "analyst_tie"
  | "tech_blazer"
  | "product_vest"
  | "hr_blazer"
  | "security_jacket"
  | "manager_suit"
  | "senior_pinstripe"
  | "hr_director_coat"
  | "vp_overcoat"
  | "cto_hoodie_blazer"
  | "cpo_power_suit"
  | "cfo_double_breasted"
  | "coo_trench"
  | "ceo_executive";

export type HumanoidPropStyle =
  | "coffee_tray"
  | "binders"
  | "holo_tablet"
  | "kanban_board"
  | "clipboard"
  | "firewall_shield"
  | "calendar_slate"
  | "dual_tablets"
  | "pip_dossier"
  | "directive_batons"
  | "server_drones"
  | "podium_wand"
  | "ledger_briefcase"
  | "ops_holomap"
  | "ceo_scepter";

export type HumanoidHairStyle =
  | "messy"
  | "neat"
  | "bun"
  | "slick"
  | "bob"
  | "fade"
  | "silver_exec";

export interface EnemyVisualSpec {
  humanoid: boolean;
  heightScale: number;
  outfit?: HumanoidOutfitStyle;
  prop?: HumanoidPropStyle;
  hair?: HumanoidHairStyle;
  eyewear?: "none" | "glasses" | "visor" | "monocle" | "headset";
  insigniaCount: 0 | 1 | 2 | 3;
  hasCrown?: boolean;
  skinColor?: string;
  hairColor?: string;
  suitColor?: string;
  shirtColor?: string;
  tieColor?: string;
}

export type RoomId =
  | "atrium"
  | "ceo_suite"
  | "boardroom"
  | "cfo_suite"
  | "hr_office"
  | "it_room"
  | "washrooms"
  | "bullpen"
  | "cafeteria"
  | "lounge";

export type StationId =
  | "espresso"
  | "server"
  | "whiteboard"
  | "printer"
  | "washroom"
  | "lounge"
  | "hr_shredder"
  | "cfo_terminal";

export interface OfficeRoomDef {
  id: RoomId;
  name: string;
  shortLabel: string;
  department: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floorColor: string;
  accentColor: string;
  floorPattern: "marble" | "parquet" | "carpet" | "pinstripe" | "ceramic" | "antistatic" | "oak" | "lounge";
  stationId?: StationId;
  tacticalSummary: string;
}

export interface RoomDoorway {
  x: number;
  z: number;
  width: number;
  orientation: "horizontal" | "vertical";
  rooms: [RoomId, RoomId];
}

export type PickupKind = "coffee" | "pizza" | "donut";

export type TelegraphKind =
  | "lunge_line"
  | "meeting_ring"
  | "shockwave"
  | "stasis_field"
  | "policy_ring"
  | "tax_ring";

export type FloorHazardKind = "coffee_spill" | "heat_vent" | "runaway_chair";

export type ObstacleKind =
  | "wall"
  | "desk"
  | "table"
  | "counter"
  | "server"
  | "printer"
  | "column"
  | "plant"
  | "ceo_desk"
  | "couch"
  | "pingpong"
  | "arcade"
  | "nap_pod"
  | "stall"
  | "vanity"
  | "vault"
  | "vending"
  | "reception"
  | "filing"
  | "shredder"
  | "bistro";

export interface OfficeObstacle {
  id: string;
  kind: ObstacleKind;
  x: number;
  z: number;
  halfW: number;
  halfD: number;
  rotation?: number;
  roomId?: RoomId;
  blocksProjectiles?: boolean;
  accentColor?: string;
}

export interface InteractiveStation {
  id: StationId;
  roomId: RoomId;
  label: string;
  shortLabel: string;
  color: string;
  x: number;
  z: number;
  radius: number;
  cooldown: number;
  description: string;
}

export interface EmployeeWeaponDef {
  name: string;
  summary: string;
  evolvedName: string;
  evolvedSummary: string;
  evolutionPerkId: string;
  evolutionMinLevel: number;
}

export interface OfficeWeaponDef {
  id: OfficeWeaponId;
  name: string;
  shortName: string;
  roleTag: string;
  pattern: OfficeWeaponPattern;
  summary: string;
  evolvedName: string;
  evolvedSummary: string;
  color: string;
  accentColor: string;
  damageMult: number;
  fireRateMult: number;
  speedMult: number;
  rangeMult: number;
  critBonus: number;
  pierceBonus: number;
  ricochetBonus: number;
  projectileRadius: number;
  projectileCount: number;
  evolvedCount: number;
  spreadRad: number;
  splashRadius: number;
  slowDuration: number;
  markDuration: number;
  knockScale: number;
}

export interface EmployeeClassDef {
  id: EmployeeClassId;
  characterName: string;
  roleTitle: string;
  tagline: string;
  bio: string;
  passiveLabel: string;
  skillName: string;
  skillDescription: string;
  skillCooldown: number;
  weapon: EmployeeWeaponDef;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    hair: string;
    skin: string;
  };
  stats: {
    productivity: number;
    maxEnergy: number;
    focus: number;
    happiness: number;
    speed: number;
    xpRate: number;
    meetingResist: number;
    bugBonus: number;
    outageResist: number;
    crit: number;
    pierce: number;
  };
}

export interface ShopItemDef {
  id: string;
  name: string;
  baseCost: number;
  maxLevel: number;
  description: string;
  effectLabel: string;
}

export interface PerkDef {
  id: string;
  name: string;
  category: "Hardware" | "Workflow" | "Wellness" | "Automation";
  description: string;
  rarity: "Common" | "Rare" | "Executive";
  synergyFor?: EmployeeClassId;
}

export interface CommsBeat {
  minute: number;
  speaker: string;
  role: string;
  portraitId?: EmployeeClassId | EnemyTypeId;
  avatarColor: string;
  text: string;
  classReply?: Partial<Record<EmployeeClassId, string>>;
}

export interface DilemmaChoice {
  id: string;
  label: string;
  sublabel: string;
  outcomeText: string;
  effects: {
    energy?: number;
    focus?: number;
    happiness?: number;
    salary?: number;
    productivityBonus?: number;
    achievement?: string;
  };
}

export interface StoryDilemma {
  title: string;
  sender: string;
  prompt: string;
  choices: [DilemmaChoice, DilemmaChoice];
}

export interface StoryChapter {
  day: number; // 1..5 (Tower Level index)
  floorNumber: number; // 12, 24, 32, 42, 50
  department: string;
  weekday: string;
  title: string;
  subtitle: string;
  briefing: string;
  modifierLabel: string;
  themeColor: string;
  focusRoomId: RoomId;
  allowedEnemies: EnemyTypeId[];
  midBoss: EnemyTypeId;
  finalBoss: EnemyTypeId;
  comms: CommsBeat[];
  dilemma: StoryDilemma;
}

export interface EnemyArchetypeDef {
  id: EnemyTypeId;
  name: string;
  titleBadge: string;
  shortLabel: string;
  rankTier: CorporateRankTier;
  department: string;
  traitSummary: string;
  policy: EnemyPolicy;
  color: string;
  accentColor: string;
  hp: number;
  speed: number;
  radius: number;
  damage: number;
  focusDamage: number;
  xp: number;
  salary: number;
  spawnWeight: number;
  spawnCooldown: number;
  boss?: boolean;
  elite?: boolean;
  meeting?: boolean;
  shielded?: boolean;
  visual: EnemyVisualSpec;
}

export interface SaveData {
  bank: number;
  day: number;
  selectedDay: number;
  highestDayCleared: number;
  floorBestDifficulty: Record<number, DifficultyId>;
  selectedClass: EmployeeClassId;
  selectedWeapon: OfficeWeaponId;
  selectedDifficulty: DifficultyId;
  upgrades: Record<string, number>;
  achievements: Record<string, boolean>;
  bestSalaryRun: number;
}

export interface PlayerState {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  speed: number;
  facingX: number;
  facingZ: number;
  strideDistance: number;
  moving: boolean;
  productivity: number;
  maxEnergy: number;
  energy: number;
  ghostEnergy: number;
  moraleShield: number;
  focus: number;
  maxFocus: number;
  happiness: number;
  xpRate: number;
  meetingResist: number;
  bugBonus: number;
  outageResist: number;
  coffeeBoost: number;
  range: number;
  fireRate: number;
  projectileSpeed: number;
  focusRecovery: number;
  regen: number;
  crit: number;
  pierce: number;
  ricochet: number;
  weaponEvolved: boolean;
  shootTimer: number;
  skillCooldown: number;
  skillMaxCooldown: number;
  dodgeCooldown: number;
  dodgeMaxCooldown: number;
  dodgeTimer: number;
  dodgeDirX: number;
  dodgeDirZ: number;
  dashTimer: number;
  dashDirX: number;
  dashDirZ: number;
  invuln: number;
  attackFlash: number;
  hitFlash: number;
  squashY: number;
}

export interface EnemyEntity {
  id: string;
  typeId: EnemyTypeId;
  policy: EnemyPolicy;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facingX: number;
  facingZ: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  boss: boolean;
  elite: boolean;
  bossPhase: 1 | 2;
  contactCooldown: number;
  abilityCooldown: number;
  aiPhase: "move" | "windup" | "active" | "recover" | "dying";
  aiTimer: number;
  lungeDirX: number;
  lungeDirZ: number;
  orbitSign: number;
  hitFlash: number;
  slowTimer: number;
  markedTimer: number;
  rallyTimer: number;
  deathTimer: number;
  knockX: number;
  knockZ: number;
  walkPhase: number;
  castTimer: number;
  volleyStep: number;
}

export interface ProjectileEntity {
  id: string;
  fromEnemy: boolean;
  weaponId?: OfficeWeaponId;
  enemyKind?: EnemyProjectileKind;
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  damage: number;
  color: string;
  pierce: number;
  ricochet: number;
  hitIds: Set<string>;
  ttl: number;
  maxTtl?: number;
  crit: boolean;
  evolved?: boolean;
  splashRadius?: number;
  slowDuration?: number;
  markDuration?: number;
  knockScale?: number;
  curveRate?: number;
  arcHeight?: number;
  wallBounces?: number;
  spawnsHazard?: FloorHazardKind;
  appliesSilence?: number;
  appliesFocusDrain?: number;
  appliesTax?: number;
  callout?: string;
}

export interface TelegraphEntity {
  id: string;
  kind: TelegraphKind;
  ownerId: string;
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  radius: number;
  length: number;
  elapsed: number;
  duration: number;
  resolved: boolean;
  color: string;
}

export interface FloorHazardEntity {
  id: string;
  kind: FloorHazardKind;
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  elapsed: number;
  duration: number;
  tickCooldown: number;
}

export interface XpOrbEntity {
  id: string;
  x: number;
  z: number;
  xp: number;
  salary: number;
  ttl: number;
  bob: number;
  color: string;
}

export interface PickupEntity {
  id: string;
  kind: PickupKind;
  x: number;
  z: number;
  radius: number;
  ttl: number;
  bob: number;
}

export interface DroneEntity {
  id: string;
  x: number;
  z: number;
  orbitAngle: number;
  ttl: number;
  shootTimer: number;
}

export interface FloaterEvent {
  id: string;
  text: string;
  x: number;
  y: number;
  z: number;
  color: string;
  life: number;
  ttl: number;
  isDamage?: boolean;
}

export interface SimEvent {
  type:
    | "shoot"
    | "hit"
    | "crit"
    | "kill"
    | "player_hit"
    | "dodge"
    | "skill"
    | "pickup"
    | "orb"
    | "level_up"
    | "evolve"
    | "station_buff"
    | "telegraph"
    | "boss_spawn"
    | "boss_phase"
    | "outage_start"
    | "outage_clear"
    | "comms"
    | "toast"
    | "dilemma"
    | "room_change"
    | "victory"
    | "defeat";
  x?: number;
  z?: number;
  color?: string;
  weight?: number;
  speaker?: string;
  role?: string;
  portraitId?: EmployeeClassId | EnemyTypeId;
  avatarColor?: string;
  message?: string;
  roomId?: RoomId;
}

export interface InputSnapshot {
  moveX: number;
  moveZ: number;
  dodgePressed: boolean;
  skillPressed: boolean;
  aimMode: AimMode;
  aimActive: boolean;
  aimWorldX: number;
  aimWorldZ: number;
}

export interface SimOptions {
  hitstopEnabled?: boolean;
}

export interface RunSummary {
  won: boolean;
  day: number;
  floorNumber: number;
  department: string;
  difficulty: DifficultyId;
  chapterTitle: string;
  weekday: string;
  employeeName: string;
  roleTitle: string;
  weaponName: string;
  weaponEvolved: boolean;
  salaryEarned: number;
  kills: number;
  levelReached: number;
  maxCombo: number;
  bossesDefeated: number;
  elapsedSeconds: number;
  achievementsUnlocked: string[];
  epilogue: string;
}

export interface GameState {
  screen: GameScreenState;
  day: number; // Tower Level 1..5
  difficulty: DifficultyDef;
  chapter: StoryChapter;
  employee: EmployeeClassDef;
  weapon: OfficeWeaponDef;
  currentRoomId: RoomId;
  elapsed: number;
  dayLength: number;
  spawnTimer: number;
  enemySpawnCooldowns: Partial<Record<EnemyTypeId, number>>;
  squadTimer: number;
  hazardTimer: number;
  coffeeTimer: number;
  eventTimer: number;
  stationCooldowns: Record<StationId, number>;
  espressoCooldown: number;
  whiteboardCooldown: number;
  whiteboardBuffTimer: number;
  printerCooldown: number;
  hasteTimer: number;
  salaryBoostTimer: number;
  policySilenceTimer: number;
  serverRebootProgress: number;
  salary: number;
  level: number;
  xp: number;
  xpNeeded: number;
  pendingLevelUps: number;
  rerollCost: number;
  claimedPerks: Record<string, number>;
  kills: number;
  meetingsEndured: number;
  combo: number;
  comboTimer: number;
  maxCombo: number;
  hitstop: number;
  trauma: number;
  outage: number;
  meetingLock: number;
  dilemmaTriggered: boolean;
  triggeredComms: Set<number>;
  spawnedBosses: Set<EnemyTypeId>;
  defeatedBosses: Set<EnemyTypeId>;
  pendingPerks: PerkDef[];
  activeDilemma: StoryDilemma | null;
  runAchievements: string[];
  summary: RunSummary | null;
  player: PlayerState;
  enemies: EnemyEntity[];
  projectiles: ProjectileEntity[];
  telegraphs: TelegraphEntity[];
  hazards: FloorHazardEntity[];
  xpOrbs: XpOrbEntity[];
  pickups: PickupEntity[];
  drones: DroneEntity[];
  floaters: FloaterEvent[];
  nextEntityId: number;
}
