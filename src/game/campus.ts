import type {
  InteractiveStation,
  OfficeObstacle,
  OfficeRoomDef,
  RoomDoorway,
  RoomId,
  StationId
} from "./types";

/**
 * Full Connected 10-Room Corporate Campus Layout (76m x 58m)
 *
 * Grid Architecture:
 *   X bands: West [-38, -14] | Center [-14, 14] | East [14, 38]
 *   Z bands: North [-29, -11] | Middle [-11, 11] | South [11, 29]
 *   Note: Southeast [14..38, 11..29] splits cleanly into:
 *     - Cafeteria & Espresso Bar (East-South-West: X [14..26], Z [11..29]) -> Actually better:
 *       Let's split East-Middle + East-South cleanly so ALL 10 rooms have spacious footprints!
 *
 * Clean 10-Room Partition (zero overlap, 100% coverage of [-38..38] x [-29..29]):
 *   NORTH WING (Z: -29 to -11):
 *     1. CEO Corner Suite      : X [-38, -14], Z [-29, -11]  (24m x 18m)
 *     2. Executive Boardroom   : X [-14,  14], Z [-29, -11]  (28m x 18m)
 *     3. CFO & Finance Suite   : X [ 14,  38], Z [-29, -11]  (24m x 18m)
 *
 *   MIDDLE WING (Z: -11 to 11):
 *     4. HR Office             : X [-38, -14], Z [-11,  11]  (24m x 22m)
 *     5. Central Atrium        : X [-14,  14], Z [-11,  11]  (28m x 22m) -- Player Spawn (0, 0)
 *     6. IT & Core Server Room : X [ 14,  38], Z [-11,  11]  (24m x 22m)
 *
 *   SOUTH WING (Z: 11 to 29):
 *     7. Washrooms / Restrooms : X [-38, -14], Z [ 11,  29]  (24m x 18m)
 *     8. Engineering Bullpen   : X [-14,  10], Z [ 11,  29]  (24m x 18m)
 *     9. Cafeteria & Espresso  : X [ 10,  24], Z [ 11,  29]  (14m x 18m)
 *    10. Casual Lounge & Nap   : X [ 24,  38], Z [ 11,  29]  (14m x 18m)
 */

export const CAMPUS_BOUNDS = {
  halfW: 38,
  halfD: 29
} as const;

export const OFFICE_ROOMS: OfficeRoomDef[] = [
  {
    id: "atrium",
    name: "Central Atrium & Reception",
    shortLabel: "ATRIUM",
    department: "Main Concourse",
    minX: -14,
    maxX: 14,
    minZ: -11,
    maxZ: 11,
    floorColor: "#253143",
    accentColor: "#28b89d",
    floorPattern: "marble",
    tacticalSummary: "Open crossroads hub linking every wing of the tower."
  },
  {
    id: "ceo_suite",
    name: "CEO Corner Suite",
    shortLabel: "CEO SUITE",
    department: "Executive Office",
    minX: -38,
    maxX: -14,
    minZ: -29,
    maxZ: -11,
    floorColor: "#3d2c20",
    accentColor: "#eab308",
    floorPattern: "parquet",
    tacticalSummary: "Panoramic executive suite. C-Suite showdowns and wide flanking sightlines."
  },
  {
    id: "boardroom",
    name: "Executive Boardroom",
    shortLabel: "BOARDROOM",
    department: "Strategy",
    minX: -14,
    maxX: 14,
    minZ: -29,
    maxZ: -11,
    floorColor: "#1d2a40",
    accentColor: "#38bdf8",
    floorPattern: "carpet",
    stationId: "whiteboard",
    tacticalSummary: "Sprint Whiteboard grants +28% Fire Rate and +25% XP for 12s."
  },
  {
    id: "cfo_suite",
    name: "CFO & Finance Suite",
    shortLabel: "CFO SUITE",
    department: "Finance & Audit",
    minX: 14,
    maxX: 38,
    minZ: -29,
    maxZ: -11,
    floorColor: "#1e2e2a",
    accentColor: "#34d399",
    floorPattern: "pinstripe",
    stationId: "cfo_terminal",
    tacticalSummary: "Audit Terminal activates 2x Salary Surge and vacuums all XP orbs."
  },
  {
    id: "hr_office",
    name: "HR & People Ops Office",
    shortLabel: "HR OFFICE",
    department: "Human Resources",
    minX: -38,
    maxX: -14,
    minZ: -11,
    maxZ: 11,
    floorColor: "#2e2338",
    accentColor: "#c084fc",
    floorPattern: "carpet",
    stationId: "hr_shredder",
    tacticalSummary: "Policy Shredder clears HR debuffs and resets Signature Skill cooldown."
  },
  {
    id: "it_room",
    name: "IT & Core Server Room",
    shortLabel: "IT SERVERS",
    department: "Infrastructure",
    minX: 14,
    maxX: 38,
    minZ: -11,
    maxZ: 11,
    floorColor: "#172230",
    accentColor: "#38bdf8",
    floorPattern: "antistatic",
    stationId: "server",
    tacticalSummary: "Core Server Console reboots Outages for +$55 or pulses an EMP stun."
  },
  {
    id: "washrooms",
    name: "Washrooms & Restrooms",
    shortLabel: "WASHROOMS",
    department: "Facilities",
    minX: -38,
    maxX: -14,
    minZ: 11,
    maxZ: 29,
    floorColor: "#334354",
    accentColor: "#67e8f9",
    floorPattern: "ceramic",
    stationId: "washroom",
    tacticalSummary: "Freshen-Up Vanity restores Focus, cleanses debuffs, and boosts speed."
  },
  {
    id: "bullpen",
    name: "Engineering Bullpen",
    shortLabel: "BULLPEN",
    department: "Product Engineering",
    minX: -14,
    maxX: 10,
    minZ: 11,
    maxZ: 29,
    floorColor: "#263140",
    accentColor: "#a78bfa",
    floorPattern: "carpet",
    stationId: "printer",
    tacticalSummary: "Turbo Printer Hub blasts nearby threats with a Paper-Jam shockwave (+$35)."
  },
  {
    id: "cafeteria",
    name: "Cafeteria & Espresso Bar",
    shortLabel: "CAFETERIA",
    department: "Dining",
    minX: 10,
    maxX: 24,
    minZ: 11,
    maxZ: 29,
    floorColor: "#463529",
    accentColor: "#f59e0b",
    floorPattern: "oak",
    stationId: "espresso",
    tacticalSummary: "Commercial Espresso Bar restores Energy, Focus, and grants Haste."
  },
  {
    id: "lounge",
    name: "Casual Lounge & Nap Room",
    shortLabel: "LOUNGE",
    department: "Wellness & Games",
    minX: 24,
    maxX: 38,
    minZ: 11,
    maxZ: 29,
    floorColor: "#263632",
    accentColor: "#4ade80",
    floorPattern: "lounge",
    stationId: "lounge",
    tacticalSummary: "Nap Pod & Game Lounge boosts Happiness and grants a Morale Shield."
  }
];

export const ROOM_MAP: Record<RoomId, OfficeRoomDef> = Object.fromEntries(
  OFFICE_ROOMS.map((r) => [r.id, r])
) as Record<RoomId, OfficeRoomDef>;

/**
 * Wide architectural doorways (>= 5.2m) connecting every room seamlessly.
 * Used both for generating glass partition wall gaps and doorway-aware enemy steering!
 */
export const CAMPUS_DOORWAYS: RoomDoorway[] = [
  // North horizontal wall (Z = -11)
  { x: -24, z: -11, width: 5.6, orientation: "horizontal", rooms: ["ceo_suite", "hr_office"] },
  { x: 0, z: -11, width: 6.4, orientation: "horizontal", rooms: ["boardroom", "atrium"] },
  { x: 26, z: -11, width: 5.6, orientation: "horizontal", rooms: ["cfo_suite", "it_room"] },

  // South horizontal wall (Z = 11)
  { x: -24, z: 11, width: 5.6, orientation: "horizontal", rooms: ["hr_office", "washrooms"] },
  { x: -2, z: 11, width: 6.4, orientation: "horizontal", rooms: ["atrium", "bullpen"] },
  { x: 17, z: 11, width: 5.2, orientation: "horizontal", rooms: ["it_room", "cafeteria"] },
  { x: 31, z: 11, width: 5.2, orientation: "horizontal", rooms: ["it_room", "lounge"] },

  // West vertical wall (X = -14)
  { x: -14, z: -20, width: 5.4, orientation: "vertical", rooms: ["ceo_suite", "boardroom"] },
  { x: -14, z: 0, width: 6.4, orientation: "vertical", rooms: ["hr_office", "atrium"] },
  { x: -14, z: 20, width: 5.4, orientation: "vertical", rooms: ["washrooms", "bullpen"] },

  // East vertical wall (X = 14) for North & Middle wings
  { x: 14, z: -20, width: 5.4, orientation: "vertical", rooms: ["boardroom", "cfo_suite"] },
  { x: 14, z: 0, width: 6.4, orientation: "vertical", rooms: ["atrium", "it_room"] },

  // South Wing sub-dividers (X = 10 between Bullpen & Cafeteria; X = 24 between Cafeteria & Lounge)
  { x: 10, z: 20, width: 5.4, orientation: "vertical", rooms: ["bullpen", "cafeteria"] },
  { x: 24, z: 20, width: 5.4, orientation: "vertical", rooms: ["cafeteria", "lounge"] }
];

// Helper to create horizontal/vertical glass partition segments around doorway gaps
function buildPartitionWalls(): OfficeObstacle[] {
  const walls: OfficeObstacle[] = [];
  const T = 0.24; // half-thickness (0.48m sleek architectural partition wall)
  let idx = 1;

  const addH = (x1: number, x2: number, z: number, accentColor: string) => {
    const w = x2 - x1;
    if (w < 0.8) return;
    walls.push({
      id: `wall-h-${idx++}`,
      kind: "wall",
      x: (x1 + x2) / 2,
      z,
      halfW: w / 2,
      halfD: T,
      blocksProjectiles: true,
      accentColor
    });
  };

  const addV = (x: number, z1: number, z2: number, accentColor: string) => {
    const d = z2 - z1;
    if (d < 0.8) return;
    walls.push({
      id: `wall-v-${idx++}`,
      kind: "wall",
      x,
      z: (z1 + z2) / 2,
      halfW: T,
      halfD: d / 2,
      blocksProjectiles: true,
      accentColor
    });
  };

  // North horizontal divider at Z = -11 (gaps at x=-24 w=5.6, x=0 w=6.4, x=26 w=5.6)
  addH(-38, -26.8, -11, "#eab308");
  addH(-21.2, -3.2, -11, "#38bdf8");
  addH(3.2, 23.2, -11, "#38bdf8");
  addH(28.8, 38, -11, "#34d399");

  // South horizontal divider at Z = 11 (gaps at x=-24 w=5.6, x=-2 w=6.4, x=17 w=5.2, x=31 w=5.2)
  addH(-38, -26.8, 11, "#67e8f9");
  addH(-21.2, -5.2, 11, "#a78bfa");
  addH(1.2, 14.4, 11, "#f59e0b");
  addH(19.6, 28.4, 11, "#4ade80");
  addH(33.6, 38, 11, "#4ade80");

  // West vertical divider at X = -14 (gaps at z=-20 w=5.4, z=0 w=6.4, z=20 w=5.4)
  addV(-14, -29, -22.7, "#eab308");
  addV(-14, -17.3, -3.2, "#c084fc");
  addV(-14, 3.2, 17.3, "#67e8f9");
  addV(-14, 22.7, 29, "#67e8f9");

  // East vertical divider at X = 14 (North & Middle only; Z = -29 to 11; gaps at z=-20 w=5.4, z=0 w=6.4)
  addV(14, -29, -22.7, "#34d399");
  addV(14, -17.3, -3.2, "#38bdf8");
  addV(14, 3.2, 11, "#38bdf8");

  // South Wing sub-dividers: X = 10 (Bullpen/Cafeteria, gap z=20 w=5.4) & X = 24 (Cafeteria/Lounge, gap z=20 w=5.4)
  addV(10, 11, 17.3, "#f59e0b");
  addV(10, 22.7, 29, "#f59e0b");
  addV(24, 11, 17.3, "#4ade80");
  addV(24, 22.7, 29, "#4ade80");

  return walls;
}

export const CAMPUS_WALLS: OfficeObstacle[] = buildPartitionWalls();

// 8 Room-Anchored Interactive Stations (every key facility gives a distinct tactical edge!)
export const ESPRESSO_STATION: InteractiveStation = {
  id: "espresso",
  roomId: "cafeteria",
  label: "Espresso Bar",
  shortLabel: "CAFE",
  color: "#f59e0b",
  x: 17.0,
  z: 24.4,
  radius: 2.5,
  cooldown: 22,
  description: "Restores Energy, Focus, and grants 6s Haste."
};

export const SERVER_STATION: InteractiveStation = {
  id: "server",
  roomId: "it_room",
  label: "Core Server Console",
  shortLabel: "IT",
  color: "#38bdf8",
  x: 26.0,
  z: 0.0,
  radius: 2.7,
  cooldown: 26,
  description: "Reboots Server Outages (+$55) or unleashes an EMP Stun pulse."
};

export const WHITEBOARD_STATION: InteractiveStation = {
  id: "whiteboard",
  roomId: "boardroom",
  label: "Sprint Whiteboard",
  shortLabel: "BOARD",
  color: "#38bdf8",
  x: 0.0,
  z: -24.5,
  radius: 2.5,
  cooldown: 28,
  description: "+28% Fire Rate & +25% XP Gain for 12s."
};

export const PRINTER_STATION: InteractiveStation = {
  id: "printer",
  roomId: "bullpen",
  label: "Turbo Printer Hub",
  shortLabel: "PRINT",
  color: "#a78bfa",
  x: -2.0,
  z: 25.0,
  radius: 2.5,
  cooldown: 26,
  description: "Unleashes a Paper-Jam shockwave & prints +$35."
};

export const WASHROOM_STATION: InteractiveStation = {
  id: "washroom",
  roomId: "washrooms",
  label: "Freshen-Up Vanity",
  shortLabel: "WC",
  color: "#67e8f9",
  x: -25.5,
  z: 15.6,
  radius: 2.5,
  cooldown: 20,
  description: "Restores +32% Focus, cleanses HR/Meeting debuffs & grants 5s Haste."
};

export const LOUNGE_STATION: InteractiveStation = {
  id: "lounge",
  roomId: "lounge",
  label: "Nap Pod & Morale Lounge",
  shortLabel: "NAP",
  color: "#4ade80",
  x: 31.0,
  z: 23.8,
  radius: 2.5,
  cooldown: 30,
  description: "+20% Happiness, +24 Morale Shield & +18 Energy."
};

export const HR_SHREDDER_STATION: InteractiveStation = {
  id: "hr_shredder",
  roomId: "hr_office",
  label: "Policy Shredder",
  shortLabel: "HR",
  color: "#c084fc",
  x: -26.0,
  z: 0.0,
  radius: 2.5,
  cooldown: 26,
  description: "Shreds Policy Silence & resets Signature Skill cooldown."
};

export const CFO_TERMINAL_STATION: InteractiveStation = {
  id: "cfo_terminal",
  roomId: "cfo_suite",
  label: "CFO Audit Terminal",
  shortLabel: "CFO",
  color: "#34d399",
  x: 26.0,
  z: -16.5,
  radius: 2.5,
  cooldown: 32,
  description: "2x Salary Surge for 14s and vacuums all XP orbs on the floor."
};

export const ALL_STATIONS: InteractiveStation[] = [
  ESPRESSO_STATION,
  WHITEBOARD_STATION,
  PRINTER_STATION,
  SERVER_STATION,
  WASHROOM_STATION,
  LOUNGE_STATION,
  HR_SHREDDER_STATION,
  CFO_TERMINAL_STATION
];

export const STATION_MAP: Record<StationId, InteractiveStation> = Object.fromEntries(
  ALL_STATIONS.map((s) => [s.id, s])
) as Record<StationId, InteractiveStation>;

// Room-authentic 3D furniture obstacles (every doorway and station remains >= 2.8m clear!)
export const CAMPUS_FURNITURE: OfficeObstacle[] = [
  // 1. Central Atrium (Spawn at 0,0 is wide open)
  { id: "atrium-col-nw", kind: "column", x: -8.2, z: -6.8, halfW: 0.55, halfD: 0.55, roomId: "atrium" },
  { id: "atrium-col-ne", kind: "column", x: 8.2, z: -6.8, halfW: 0.55, halfD: 0.55, roomId: "atrium" },
  { id: "atrium-col-sw", kind: "column", x: -8.2, z: 6.8, halfW: 0.55, halfD: 0.55, roomId: "atrium" },
  { id: "atrium-col-se", kind: "column", x: 8.2, z: 6.8, halfW: 0.55, halfD: 0.55, roomId: "atrium" },
  { id: "atrium-recep", kind: "reception", x: 0, z: 6.4, halfW: 2.5, halfD: 0.78, roomId: "atrium" },

  // 2. CEO Corner Suite (X: -38..-14, Z: -29..-11)
  { id: "ceo-desk-main", kind: "ceo_desk", x: -28.5, z: -22.8, halfW: 2.8, halfD: 1.2, roomId: "ceo_suite" },
  { id: "ceo-couch", kind: "couch", x: -20.0, z: -24.5, halfW: 2.1, halfD: 0.9, roomId: "ceo_suite" },
  { id: "ceo-plant", kind: "plant", x: -35.5, z: -26.5, halfW: 0.65, halfD: 0.65, roomId: "ceo_suite" },
  { id: "ceo-plant-2", kind: "plant", x: -35.5, z: -13.5, halfW: 0.65, halfD: 0.65, roomId: "ceo_suite" },

  // 3. Executive Boardroom (X: -14..14, Z: -29..-11; Whiteboard station at 0, -24.5)
  { id: "board-table", kind: "table", x: 0, z: -18.5, halfW: 4.4, halfD: 1.35, roomId: "boardroom" },
  { id: "board-plant-w", kind: "plant", x: -11.4, z: -26.4, halfW: 0.65, halfD: 0.65, roomId: "boardroom" },
  { id: "board-plant-e", kind: "plant", x: 11.4, z: -26.4, halfW: 0.65, halfD: 0.65, roomId: "boardroom" },

  // 4. CFO & Finance Suite (X: 14..38, Z: -29..-11; CFO Terminal at 26, -16.5)
  { id: "cfo-vault", kind: "vault", x: 34.4, z: -25.0, halfW: 1.4, halfD: 1.1, roomId: "cfo_suite" },
  { id: "cfo-desk", kind: "desk", x: 25.5, z: -23.6, halfW: 2.2, halfD: 1.0, roomId: "cfo_suite" },
  { id: "cfo-filing", kind: "filing", x: 18.2, z: -25.8, halfW: 1.5, halfD: 0.75, roomId: "cfo_suite" },

  // 5. HR Office (X: -38..-14, Z: -11..11; Shredder station at -26, 0)
  { id: "hr-desk-n", kind: "desk", x: -32.2, z: -5.4, halfW: 1.8, halfD: 0.95, roomId: "hr_office" },
  { id: "hr-desk-s", kind: "desk", x: -32.2, z: 5.4, halfW: 1.8, halfD: 0.95, roomId: "hr_office" },
  { id: "hr-table", kind: "table", x: -19.8, z: -5.6, halfW: 1.9, halfD: 1.0, roomId: "hr_office" },
  { id: "hr-filing", kind: "filing", x: -35.6, z: 0.0, halfW: 0.85, halfD: 2.2, roomId: "hr_office" },
  { id: "hr-shredder-prop", kind: "shredder", x: -26.0, z: -3.2, halfW: 0.85, halfD: 0.75, roomId: "hr_office" },

  // 6. IT & Core Server Room (X: 14..38, Z: -11..11; Server station at 26, 0)
  { id: "it-rack-nw", kind: "server", x: 21.0, z: -5.8, halfW: 2.2, halfD: 0.85, roomId: "it_room" },
  { id: "it-rack-ne", kind: "server", x: 31.8, z: -5.8, halfW: 2.2, halfD: 0.85, roomId: "it_room" },
  { id: "it-rack-sw", kind: "server", x: 21.0, z: 5.8, halfW: 2.2, halfD: 0.85, roomId: "it_room" },
  { id: "it-rack-se", kind: "server", x: 31.8, z: 5.8, halfW: 2.2, halfD: 0.85, roomId: "it_room" },

  // 7. Washrooms / Restrooms (X: -38..-14, Z: 11..29; Freshen-Up Vanity station at -25.5, 15.6)
  { id: "wc-vanity", kind: "vanity", x: -25.5, z: 12.9, halfW: 3.1, halfD: 0.75, roomId: "washrooms" },
  { id: "wc-stall-1", kind: "stall", x: -34.2, z: 25.4, halfW: 1.5, halfD: 1.55, roomId: "washrooms" },
  { id: "wc-stall-2", kind: "stall", x: -29.2, z: 25.4, halfW: 1.5, halfD: 1.55, roomId: "washrooms" },
  { id: "wc-stall-3", kind: "stall", x: -24.2, z: 25.4, halfW: 1.5, halfD: 1.55, roomId: "washrooms" },

  // 8. Engineering Bullpen (X: -14..10, Z: 11..29; Printer station at -2, 25.0)
  { id: "eng-desk-1", kind: "desk", x: -8.6, z: 16.5, halfW: 1.8, halfD: 0.95, roomId: "bullpen" },
  { id: "eng-desk-2", kind: "desk", x: 4.4, z: 16.5, halfW: 1.8, halfD: 0.95, roomId: "bullpen" },
  { id: "eng-desk-3", kind: "desk", x: -8.6, z: 23.2, halfW: 1.8, halfD: 0.95, roomId: "bullpen" },
  { id: "eng-desk-4", kind: "desk", x: 4.4, z: 23.2, halfW: 1.8, halfD: 0.95, roomId: "bullpen" },
  { id: "eng-printer", kind: "printer", x: -2.0, z: 27.3, halfW: 1.3, halfD: 0.85, roomId: "bullpen" },

  // 9. Cafeteria & Espresso Bar (X: 10..24, Z: 11..29; Espresso station at 17, 24.4)
  { id: "cafe-counter", kind: "counter", x: 17.0, z: 27.1, halfW: 2.6, halfD: 0.85, roomId: "cafeteria" },
  { id: "cafe-vending", kind: "vending", x: 12.0, z: 26.8, halfW: 0.9, halfD: 0.8, roomId: "cafeteria" },
  { id: "cafe-bistro-1", kind: "bistro", x: 14.6, z: 16.8, halfW: 1.05, halfD: 1.05, roomId: "cafeteria" },
  { id: "cafe-bistro-2", kind: "bistro", x: 19.6, z: 16.8, halfW: 1.05, halfD: 1.05, roomId: "cafeteria" },

  // 10. Casual Lounge & Nap Room (X: 24..38, Z: 11..29; Nap station at 31, 23.8)
  { id: "lounge-pingpong", kind: "pingpong", x: 31.0, z: 17.4, halfW: 2.1, halfD: 1.15, roomId: "lounge" },
  { id: "lounge-nap-pod", kind: "nap_pod", x: 35.4, z: 25.8, halfW: 1.35, halfD: 1.05, roomId: "lounge" },
  { id: "lounge-arcade", kind: "arcade", x: 26.8, z: 26.8, halfW: 0.85, halfD: 0.8, roomId: "lounge" },
  { id: "lounge-couch", kind: "couch", x: 35.8, z: 14.8, halfW: 0.95, halfD: 2.0, roomId: "lounge" }
];

export const CAMPUS_OBSTACLES: OfficeObstacle[] = [
  ...CAMPUS_WALLS,
  ...CAMPUS_FURNITURE
];

export function getRoomAtPosition(x: number, z: number): OfficeRoomDef {
  for (const room of OFFICE_ROOMS) {
    if (x >= room.minX && x <= room.maxX && z >= room.minZ && z <= room.maxZ) {
      return room;
    }
  }
  return ROOM_MAP.atrium;
}

export function getRoomById(id: RoomId): OfficeRoomDef {
  return ROOM_MAP[id] || ROOM_MAP.atrium;
}

export function getRoomCenter(id: RoomId): { x: number; z: number } {
  const r = getRoomById(id);
  return { x: (r.minX + r.maxX) / 2, z: (r.minZ + r.maxZ) / 2 };
}

/**
 * Lightweight doorway-aware steering: when an enemy and target are in different rooms,
 * steers smoothly toward the shared doorway (or best doorway leading toward the Atrium/target)
 * so enemies navigate across all 10 rooms without getting snagged on interior glass partitions.
 */
export function getDoorwaySteerTarget(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number
): { x: number; z: number } {
  const fromRoom = getRoomAtPosition(fromX, fromZ);
  const toRoom = getRoomAtPosition(toX, toZ);
  if (fromRoom.id === toRoom.id) {
    return { x: toX, z: toZ };
  }

  // 1. Direct doorway connecting fromRoom and toRoom
  for (const door of CAMPUS_DOORWAYS) {
    if (
      (door.rooms[0] === fromRoom.id && door.rooms[1] === toRoom.id) ||
      (door.rooms[1] === fromRoom.id && door.rooms[0] === toRoom.id)
    ) {
      const distToDoor = Math.hypot(door.x - fromX, door.z - fromZ);
      if (distToDoor > 1.8) {
        return { x: door.x, z: door.z };
      }
      return { x: toX, z: toZ };
    }
  }

  // 2. Otherwise pick the doorway out of fromRoom closest to the target
  let bestDoor: RoomDoorway | null = null;
  let bestScore = Infinity;
  for (const door of CAMPUS_DOORWAYS) {
    if (door.rooms[0] !== fromRoom.id && door.rooms[1] !== fromRoom.id) continue;
    const score =
      Math.hypot(door.x - toX, door.z - toZ) +
      Math.hypot(door.x - fromX, door.z - fromZ) * 0.28;
    if (score < bestScore) {
      bestScore = score;
      bestDoor = door;
    }
  }

  if (bestDoor && Math.hypot(bestDoor.x - fromX, bestDoor.z - fromZ) > 1.6) {
    return { x: bestDoor.x, z: bestDoor.z };
  }
  return { x: toX, z: toZ };
}
