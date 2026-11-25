import * as THREE from "three";
import {
  ALL_STATIONS,
  CAMPUS_DOORWAYS,
  CAMPUS_FURNITURE,
  CAMPUS_WALLS,
  OFFICE_ROOMS,
  WORLD_BOUNDS
} from "../game/data";
import type { StationId } from "../game/types";
import type { ProceduralTextureSet } from "./textures";

export interface OfficeEnvironmentRefs {
  group: THREE.Group;
  fpsCeilingGroup: THREE.Group;
  stationRings: Record<StationId, THREE.Mesh>;
  serverLedMat: THREE.MeshStandardMaterial;
  overheadLightMat: THREE.MeshStandardMaterial;
  skylineMat: THREE.MeshStandardMaterial;
  setFloorTheme: (hexColor: string) => void;
}

function createRoomSignTexture(title: string, subtitle: string, accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 0, 14, 128);
  ctx.fillRect(498, 0, 14, 128);
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "800 42px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, 256, 62);

  ctx.fillStyle = accentHex;
  ctx.font = "700 22px monospace";
  ctx.fillText(subtitle.toUpperCase(), 256, 100);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildOfficeEnvironment(
  textures: ProceduralTextureSet,
  castShadows: boolean
): OfficeEnvironmentRefs {
  const group = new THREE.Group();

  // Shared PBR Materials
  const floorBaseMat = new THREE.MeshStandardMaterial({
    color: "#1a2230",
    map: textures.floorColor,
    bumpMap: textures.floorBump,
    bumpScale: 0.03,
    roughness: 0.78,
    metalness: 0.08
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodColor,
    bumpMap: textures.woodBump,
    bumpScale: 0.02,
    roughness: 0.54,
    metalness: 0.06
  });

  const mahoganyMat = new THREE.MeshStandardMaterial({
    color: "#5b2c1a",
    map: textures.woodColor,
    roughness: 0.42,
    metalness: 0.1
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: "#94a3b8",
    roughness: 0.28,
    metalness: 0.84
  });

  const darkFrameMat = new THREE.MeshStandardMaterial({
    color: "#18212f",
    roughness: 0.52,
    metalness: 0.45
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: "#d4a853",
    roughness: 0.24,
    metalness: 0.88
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: "#222c3c",
    roughness: 0.8,
    metalness: 0.08
  });

  const partitionGlassMat = new THREE.MeshStandardMaterial({
    color: "#a5d8ff",
    roughness: 0.12,
    metalness: 0.14,
    transparent: true,
    opacity: 0.2,
    depthWrite: false
  });

  const perimeterGlassMat = new THREE.MeshStandardMaterial({
    color: "#93c5fd",
    roughness: 0.12,
    metalness: 0.15,
    transparent: true,
    opacity: 0.26,
    depthWrite: false
  });

  const ceramicMat = new THREE.MeshStandardMaterial({
    color: "#e2e8f0",
    roughness: 0.28,
    metalness: 0.08
  });

  const mirrorMat = new THREE.MeshStandardMaterial({
    color: "#bae6fd",
    emissive: "#38bdf8",
    emissiveIntensity: 0.35,
    roughness: 0.08,
    metalness: 0.92
  });

  const screenCodeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.monitorCode,
    emissive: "#38bdf8",
    emissiveMap: textures.monitorCode,
    emissiveIntensity: 0.65,
    roughness: 0.2
  });

  const screenKanbanMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.monitorKanban,
    emissive: "#60a5fa",
    emissiveMap: textures.monitorKanban,
    emissiveIntensity: 0.6,
    roughness: 0.2
  });

  const overheadLightMat = new THREE.MeshStandardMaterial({
    color: "#f8fafc",
    emissive: "#fff4e0",
    emissiveIntensity: 1.1,
    roughness: 0.2
  });

  const serverLedMat = new THREE.MeshStandardMaterial({
    color: "#38bdf8",
    emissive: "#38bdf8",
    emissiveIntensity: 1.35,
    roughness: 0.2
  });

  const floorThemeMat = new THREE.MeshStandardMaterial({
    color: "#28b89d",
    emissive: "#28b89d",
    emissiveIntensity: 0.7,
    roughness: 0.25,
    metalness: 0.5
  });

  // 1. Main Structural Floor Slab (76m x 58m + perimeter lip)
  const floorW = WORLD_BOUNDS.halfW * 2 + 2;
  const floorD = WORLD_BOUNDS.halfD * 2 + 2;
  const baseFloor = new THREE.Mesh(new THREE.BoxGeometry(floorW, 0.4, floorD), floorBaseMat);
  baseFloor.position.y = -0.2;
  baseFloor.receiveShadow = true;
  group.add(baseFloor);

  // 2. Distinct Room Flooring & Subtle Border Trim for all 10 Rooms
  for (const room of OFFICE_ROOMS) {
    const rw = room.maxX - room.minX - 0.16;
    const rd = room.maxZ - room.minZ - 0.16;
    const cx = (room.minX + room.maxX) / 2;
    const cz = (room.minZ + room.maxZ) / 2;

    const useWood = room.floorPattern === "parquet" || room.floorPattern === "oak";
    const useCeramic = room.floorPattern === "ceramic";
    const useTile = room.floorPattern === "marble" || room.floorPattern === "antistatic";
    const matOpts: THREE.MeshStandardMaterialParameters = {
      color: useCeramic ? "#dbeafe" : room.floorColor,
      roughness: useCeramic || room.floorPattern === "marble" ? 0.34 : 0.78,
      metalness: room.floorPattern === "marble" ? 0.14 : 0.05
    };
    if (useCeramic) matOpts.map = textures.checkeredTile;
    else if (useWood) matOpts.map = textures.woodColor;
    else if (useTile) matOpts.map = textures.floorColor;

    const rMat = new THREE.MeshStandardMaterial(matOpts);
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(rw, rd), rMat);
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(cx, 0.014, cz);
    slab.receiveShadow = true;
    group.add(slab);
  }

  // Central Atrium Brass Inlay, Floor Theme Accent Ring & Directional Compass Decal
  const atriumRing = new THREE.Mesh(new THREE.RingGeometry(4.5, 4.82, 40), brassMat);
  atriumRing.rotation.x = -Math.PI / 2;
  atriumRing.position.set(0, 0.024, 0);
  group.add(atriumRing);

  const atriumThemeRing = new THREE.Mesh(new THREE.RingGeometry(3.85, 4.02, 40), floorThemeMat);
  atriumThemeRing.rotation.x = -Math.PI / 2;
  atriumThemeRing.position.set(0, 0.024, 0);
  group.add(atriumThemeRing);

  const compassMat = new THREE.MeshBasicMaterial({
    map: textures.atriumCompass,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  const compassPlane = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 7.2), compassMat);
  compassPlane.rotation.x = -Math.PI / 2;
  compassPlane.position.set(0, 0.026, 0);
  group.add(compassPlane);

  // Doorway Threshold Strips (visual breadcrumb showing every open corridor)
  const thresholdMat = new THREE.MeshStandardMaterial({
    color: "#475569",
    metalness: 0.75,
    roughness: 0.32
  });
  for (const door of CAMPUS_DOORWAYS) {
    const w = door.orientation === "horizontal" ? door.width : 0.56;
    const d = door.orientation === "horizontal" ? 0.56 : door.width;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), thresholdMat);
    strip.position.set(door.x, 0.018, door.z);
    group.add(strip);
  }

  // 3. Sightline-Friendly Interior Glass Partition Walls (Aligned 1:1 with CAMPUS_WALLS)
  for (const wall of CAMPUS_WALLS) {
    const w = wall.halfW * 2;
    const d = wall.halfD * 2;
    // Waist-high solid wainscoting (0.82m) + slim translucent glass pane (1.85m) + aluminum top header
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.82, d), wallMat);
    base.position.set(wall.x, 0.41, wall.z);
    base.castShadow = castShadows;
    base.receiveShadow = true;
    group.add(base);

    const glassW = w > d ? w : 0.08;
    const glassD = d >= w ? d : 0.08;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(glassW, 1.85, glassD), partitionGlassMat);
    glass.position.set(wall.x, 1.745, wall.z);
    group.add(glass);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.09, d + 0.04), darkFrameMat);
    cap.position.set(wall.x, 2.71, wall.z);
    group.add(cap);

    // Subtle colored architectural stripe along waist trim identifying the adjacent wing
    const stripeMat = new THREE.MeshStandardMaterial({
      color: wall.accentColor || "#28b89d",
      emissive: wall.accentColor || "#28b89d",
      emissiveIntensity: 0.42,
      roughness: 0.3
    });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.06, d + 0.03), stripeMat);
    stripe.position.set(wall.x, 0.83, wall.z);
    group.add(stripe);
  }

  // 4. Perimeter Architectural Curtain Walls & Apex Corp Feature Wall
  const wallH = 5.4;
  const northCenterWall = new THREE.Mesh(new THREE.BoxGeometry(12.4, wallH, 0.45), wallMat);
  northCenterWall.position.set(0, wallH / 2, -WORLD_BOUNDS.halfD - 0.3);
  northCenterWall.receiveShadow = true;
  group.add(northCenterWall);

  const signMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.floorSign,
    emissive: "#28b89d",
    emissiveMap: textures.floorSign,
    emissiveIntensity: 0.55,
    roughness: 0.3
  });
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.15, 0.14), signMat);
  signMesh.position.set(0, 4.55, -WORLD_BOUNDS.halfD + 0.02);
  group.add(signMesh);

  // Executive Boardroom Rear Whiteboard mounted cleanly below the Apex Corp crest
  const whiteboard = new THREE.Mesh(
    new THREE.BoxGeometry(6.0, 2.15, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.whiteboard, roughness: 0.35 })
  );
  whiteboard.position.set(0, 2.45, -WORLD_BOUNDS.halfD + 0.04);
  group.add(whiteboard);

  // Flanking North Glass Curtain Wall
  for (const side of [-1, 1]) {
    const paneW = 31.8;
    const cx = side * (6.2 + paneW / 2);
    const glassPane = new THREE.Mesh(new THREE.BoxGeometry(paneW, wallH - 0.6, 0.1), perimeterGlassMat);
    glassPane.position.set(cx, wallH / 2, -WORLD_BOUNDS.halfD - 0.25);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(paneW + 0.4, 0.55, 0.42), darkFrameMat);
    sill.position.set(cx, 0.275, -WORLD_BOUNDS.halfD - 0.25);
    const header = new THREE.Mesh(new THREE.BoxGeometry(paneW + 0.4, 0.4, 0.42), darkFrameMat);
    header.position.set(cx, wallH - 0.2, -WORLD_BOUNDS.halfD - 0.25);
    group.add(glassPane, sill, header);

    for (let m = 0; m <= 5; m += 1) {
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.2, wallH, 0.26), darkFrameMat);
      mullion.position.set(side * (6.4 + m * 6.2), wallH / 2, -WORLD_BOUNDS.halfD - 0.25);
      group.add(mullion);
    }
  }

  // West & East Side Glass Curtain Walls
  for (const side of [-1, 1]) {
    const lowWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.25, floorD), wallMat);
    lowWall.position.set(side * (WORLD_BOUNDS.halfW + 0.3), 0.625, 0);
    const glassSide = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.7, floorD), perimeterGlassMat);
    glassSide.position.set(side * (WORLD_BOUNDS.halfW + 0.3), 3.1, 0);
    group.add(lowWall, glassSide);

    for (let z = -24; z <= 24; z += 8) {
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.24, 5.0, 0.24), darkFrameMat);
      mullion.position.set(side * (WORLD_BOUNDS.halfW + 0.3), 2.5, z);
      group.add(mullion);
    }
  }

  // South low architectural curb (keeps 3P overhead camera unobstructed)
  const southCurb = new THREE.Mesh(new THREE.BoxGeometry(floorW, 0.6, 0.4), darkFrameMat);
  southCurb.position.set(0, 0.3, WORLD_BOUNDS.halfD + 0.3);
  group.add(southCurb);

  // 5. Distant City Skyline Surrounding the Tower (360-degree horizon depth)
  const skylineMat = new THREE.MeshStandardMaterial({
    color: "#1a2538",
    emissive: "#1e3a5f",
    emissiveIntensity: 0.4,
    roughness: 0.6,
    metalness: 0.3
  });
  const windowBandMat = new THREE.MeshStandardMaterial({
    color: "#fef08a",
    emissive: "#f59e0b",
    emissiveIntensity: 0.72,
    roughness: 0.2
  });

  const towerSpecs = [
    [-44, -46, 9, 32, 9],
    [-26, -50, 10, 42, 9],
    [-8, -48, 8, 28, 8],
    [10, -52, 11, 46, 9],
    [28, -48, 9, 36, 9],
    [46, -44, 10, 34, 9],
    [-54, -22, 9, 32, 9],
    [-56, 2, 10, 38, 9],
    [-54, 24, 9, 30, 9],
    [54, -20, 9, 36, 9],
    [56, 4, 10, 34, 9],
    [54, 24, 9, 29, 9],
    [-38, 46, 10, 36, 9],
    [-16, 50, 9, 30, 9],
    [6, 48, 11, 42, 9],
    [28, 50, 9, 34, 9],
    [46, 45, 9, 36, 9]
  ];
  for (const [tx, tz, tw, th, td] of towerSpecs) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(tw, th, td), skylineMat);
    tower.position.set(tx, th / 2 - 16, tz);
    group.add(tower);
    for (let row = 0; row < 4; row += 1) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.14, 0.34, td + 0.14), windowBandMat);
      strip.position.set(tx, -4 + row * 3.8, tz);
      group.add(strip);
    }
  }

  // 6. FPS-Only Architectural Ceiling, Overhead Illuminated Room Signs & South Curtain Wall
  const fpsCeilingGroup = new THREE.Group();
  fpsCeilingGroup.visible = false;

  const ceilingSlabMat = new THREE.MeshStandardMaterial({
    color: "#131c29",
    roughness: 0.9,
    metalness: 0.08
  });
  const ceilingSlab = new THREE.Mesh(new THREE.BoxGeometry(floorW + 0.6, 0.22, floorD + 0.6), ceilingSlabMat);
  ceilingSlab.position.set(0, wallH + 0.12, 0);
  fpsCeilingGroup.add(ceilingSlab);

  for (let z = -22; z <= 22; z += 11) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(floorW, 0.22, 0.34), darkFrameMat);
    beam.position.set(0, wallH - 0.12, z);
    fpsCeilingGroup.add(beam);
  }
  for (const x of [-26, 0, 26]) {
    for (const z of [-20, 0, 20]) {
      const fixture = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.08, 0.38), overheadLightMat);
      fixture.position.set(x, wallH - 0.04, z);
      fpsCeilingGroup.add(fixture);
    }
  }

  const southGlass = new THREE.Mesh(new THREE.BoxGeometry(floorW, wallH - 0.6, 0.1), perimeterGlassMat);
  southGlass.position.set(0, wallH / 2 + 0.2, WORLD_BOUNDS.halfD + 0.3);
  const southHeader = new THREE.Mesh(new THREE.BoxGeometry(floorW, 0.38, 0.38), darkFrameMat);
  southHeader.position.set(0, wallH - 0.19, WORLD_BOUNDS.halfD + 0.3);
  fpsCeilingGroup.add(southGlass, southHeader);
  for (let x = -34; x <= 34; x += 8.5) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.22, wallH, 0.24), darkFrameMat);
    mullion.position.set(x, wallH / 2, WORLD_BOUNDS.halfD + 0.3);
    fpsCeilingGroup.add(mullion);
  }
  group.add(fpsCeilingGroup);

  // 7. Build Room-Authentic 3D Props Aligned 1:1 with CAMPUS_FURNITURE
  let deskIndex = 0;
  for (const obs of CAMPUS_FURNITURE) {
    const w = obs.halfW * 2;
    const d = obs.halfD * 2;
    switch (obs.kind) {
      case "desk":
        group.add(
          buildWorkstationDesk(
            obs.x,
            obs.z,
            w,
            d,
            woodMat,
            steelMat,
            darkFrameMat,
            deskIndex % 2 === 0 ? screenCodeMat : screenKanbanMat,
            deskIndex % 2 === 0 ? screenKanbanMat : screenCodeMat,
            castShadows
          )
        );
        deskIndex += 1;
        break;
      case "ceo_desk":
        group.add(buildCeoDesk(obs.x, obs.z, w, d, mahoganyMat, brassMat, darkFrameMat, screenKanbanMat, castShadows));
        break;
      case "reception":
        group.add(buildReceptionDesk(obs.x, obs.z, w, d, darkFrameMat, woodMat, floorThemeMat, castShadows));
        break;
      case "table":
        group.add(buildConferenceTable(obs.x, obs.z, w, d, woodMat, steelMat, darkFrameMat, castShadows));
        break;
      case "counter":
        group.add(buildEspressoCounter(obs.x, obs.z, woodMat, steelMat, brassMat, darkFrameMat, castShadows));
        break;
      case "server":
        group.add(buildServerRackBank(obs.x, obs.z, darkFrameMat, steelMat, serverLedMat, castShadows));
        break;
      case "printer":
        group.add(buildPrinterHub(obs.x, obs.z, darkFrameMat, steelMat, castShadows));
        break;
      case "column":
        group.add(buildColumn(obs.x, obs.z, wallMat, brassMat, castShadows));
        break;
      case "plant":
        group.add(buildPlanter(obs.x, obs.z, castShadows));
        break;
      case "couch":
        group.add(buildLoungeCouch(obs.x, obs.z, w, d, obs.roomId === "ceo_suite" ? "#451a03" : "#1e3a5f", brassMat, castShadows));
        break;
      case "pingpong":
        group.add(buildPingPongTable(obs.x, obs.z, w, d, steelMat, castShadows));
        break;
      case "arcade":
        group.add(buildArcadeCabinet(obs.x, obs.z, darkFrameMat, textures.arcadeScreen, castShadows));
        break;
      case "nap_pod":
        group.add(buildNapPod(obs.x, obs.z, darkFrameMat, castShadows));
        break;
      case "stall":
        group.add(buildWashroomStall(obs.x, obs.z, w, d, steelMat, ceramicMat, castShadows));
        break;
      case "vanity":
        group.add(buildWashroomVanity(obs.x, obs.z, w, d, darkFrameMat, ceramicMat, steelMat, mirrorMat, castShadows));
        break;
      case "vault":
        group.add(buildCfoVault(obs.x, obs.z, w, d, darkFrameMat, brassMat, steelMat, castShadows));
        break;
      case "vending":
        group.add(buildVendingMachine(obs.x, obs.z, darkFrameMat, glassPaneMat(), castShadows));
        break;
      case "filing":
        group.add(buildFilingCabinet(obs.x, obs.z, w, d, steelMat, darkFrameMat, brassMat, castShadows));
        break;
      case "shredder":
        group.add(buildHrShredder(obs.x, obs.z, darkFrameMat, steelMat, castShadows));
        break;
      case "bistro":
        group.add(buildBistroTable(obs.x, obs.z, woodMat, darkFrameMat, steelMat, castShadows));
        break;
    }
  }

  // 7b. Rich Architectural & Storytelling Decorations Across All 10 Rooms (zero obstacle collisions)
  addAllRoomDecorations(group, textures, darkFrameMat, brassMat, steelMat, serverLedMat);

  // 8. Interactive Station Ground Rings for ALL 8 Rooms
  const stationRings = {} as Record<StationId, THREE.Mesh>;
  for (const st of ALL_STATIONS) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.55, 1.9, 28),
      new THREE.MeshBasicMaterial({
        color: st.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.78,
        depthWrite: false
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(st.x, 0.036, st.z);
    group.add(ring);
    stationRings[st.id] = ring;
  }

  const setFloorTheme = (hexColor: string) => {
    floorThemeMat.color.set(hexColor);
    floorThemeMat.emissive.set(hexColor);
    signMat.emissive.set(hexColor);
  };

  return {
    group,
    fpsCeilingGroup,
    stationRings,
    serverLedMat,
    overheadLightMat,
    skylineMat,
    setFloorTheme
  };
}

function glassPaneMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#38bdf8",
    emissive: "#0ea5e9",
    emissiveIntensity: 0.45,
    roughness: 0.15,
    metalness: 0.2
  });
}

function buildWorkstationDesk(
  x: number,
  z: number,
  w: number,
  d: number,
  woodMat: THREE.Material,
  steelMat: THREE.Material,
  darkMat: THREE.Material,
  screenMatA: THREE.Material,
  screenMatB: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const top = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.1, d - 0.14), woodMat);
  top.position.y = 0.86;
  top.castShadow = castShadows;
  top.receiveShadow = true;
  g.add(top);

  const legGeo = new THREE.BoxGeometry(0.1, 0.84, 0.1);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, steelMat);
      leg.position.set(sx * (w / 2 - 0.22), 0.42, sz * (d / 2 - 0.22));
      g.add(leg);
    }
  }

  for (const [mx, rotY, sMat] of [
    [-0.58, 0.18, screenMatA],
    [0.58, -0.18, screenMatB]
  ] as const) {
    const mon = new THREE.Group();
    mon.position.set(mx, 0.91, -0.22);
    mon.rotation.y = rotY;
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.08), steelMat);
    stand.position.y = 0.17;
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.54, 0.06), darkMat);
    bezel.position.y = 0.48;
    const display = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.46), sMat);
    display.position.set(0, 0.48, 0.036);
    mon.add(stand, bezel, display);
    g.add(mon);
  }

  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.22), darkMat);
  kb.position.set(-0.08, 0.93, 0.22);
  g.add(kb);

  // Desk storytelling details: glowing coffee mug, sticky-note pad & compact desk lamp
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.07, 0.16, 8),
    new THREE.MeshStandardMaterial({ color: "#f59e0b", roughness: 0.35 })
  );
  mug.position.set(w * 0.34, 0.99, 0.16);
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.03, 0.18),
    new THREE.MeshStandardMaterial({ color: "#fde047", roughness: 0.85 })
  );
  pad.position.set(-w * 0.34, 0.93, 0.2);
  const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.42, 6), steelMat);
  lampPost.position.set(-w * 0.36, 1.12, -0.24);
  const lampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.14, 8),
    new THREE.MeshStandardMaterial({ color: "#e2e8f0", emissive: "#fde68a", emissiveIntensity: 0.75 })
  );
  lampShade.position.set(-w * 0.32, 1.32, -0.2);
  g.add(mug, pad, lampPost, lampShade);

  const chair = new THREE.Group();
  chair.position.set(0, 0, 0.56);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.58), darkMat);
  seat.position.y = 0.5;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.48, 8), steelMat);
  stem.position.y = 0.24;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.58, 0.1), darkMat);
  back.position.set(0, 0.82, 0.26);
  chair.add(seat, stem, back);
  g.add(chair);

  return g;
}

function buildCeoDesk(
  x: number,
  z: number,
  w: number,
  d: number,
  mahoganyMat: THREE.Material,
  brassMat: THREE.Material,
  darkMat: THREE.Material,
  screenMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const base = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 0.9, d - 0.25), mahoganyMat);
  base.position.y = 0.45;
  base.castShadow = castShadows;
  base.receiveShadow = true;
  g.add(base);

  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), mahoganyMat);
  top.position.y = 0.94;
  top.castShadow = castShadows;
  g.add(top);

  const goldInlay = new THREE.Mesh(new THREE.BoxGeometry(w - 0.16, 0.06, 0.06), brassMat);
  goldInlay.position.set(0, 0.62, d / 2 - 0.1);
  g.add(goldInlay);

  // Executive Ultrawide Screen, Brass Nameplate, Desktop Globe, Leather Blotter & Gold Trophy
  const blotter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.025, 0.72), darkMat);
  blotter.position.set(0, 1.01, 0.12);
  const mon = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.64, 0.08), darkMat);
  mon.position.set(0, 1.38, -0.22);
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.54), screenMat);
  disp.position.set(0, 1.38, -0.17);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.14), brassMat);
  plate.position.set(1.45, 1.08, 0.44);
  const globeStand = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.14, 8), brassMat);
  globeStand.position.set(-1.85, 1.07, 0.16);
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 10, 8),
    new THREE.MeshStandardMaterial({ color: "#0ea5e9", roughness: 0.3, metalness: 0.2 })
  );
  globe.position.set(-1.85, 1.34, 0.16);
  const trophy = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.08, 0.36, 8), brassMat);
  trophy.position.set(1.92, 1.18, -0.22);
  const bankersLamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.16, 0.18),
    new THREE.MeshStandardMaterial({ color: "#10b981", emissive: "#10b981", emissiveIntensity: 0.9 })
  );
  bankersLamp.position.set(-1.15, 1.34, -0.26);
  g.add(blotter, mon, disp, plate, globeStand, globe, trophy, bankersLamp);

  // High-Back Leather Executive Chair
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.25, 0.18), darkMat);
  chairBack.position.set(0, 1.12, -1.15);
  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.16, 0.78), darkMat);
  chairSeat.position.set(0, 0.56, -0.82);
  g.add(chairBack, chairSeat);

  return g;
}

function buildReceptionDesk(
  x: number,
  z: number,
  w: number,
  d: number,
  darkMat: THREE.Material,
  woodMat: THREE.Material,
  accentMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, 1.06, d), darkMat);
  body.position.y = 0.53;
  body.castShadow = castShadows;
  const counter = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.12, d + 0.12), woodMat);
  counter.position.y = 1.1;
  const led = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.1, 0.08), accentMat);
  led.position.set(0, 0.66, -d / 2 - 0.02);

  // Visitor check-in tablet, reception monitor & mini welcome planter
  const monL = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.46, 0.06), darkMat);
  monL.position.set(-0.9, 1.4, 0.12);
  const screenL = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.38, 0.07), accentMat);
  screenL.position.set(-0.9, 1.4, 0.12);
  const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.04), accentMat);
  tablet.position.set(0.75, 1.28, -0.18);
  tablet.rotation.x = -0.5;
  const vase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.11, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.3 })
  );
  vase.position.set(1.75, 1.27, -0.1);
  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshStandardMaterial({ color: "#22c55e", roughness: 0.6 })
  );
  leaves.position.set(1.75, 1.48, -0.1);

  g.add(body, counter, led, monL, screenL, tablet, vase, leaves);
  return g;
}

function buildEspressoCounter(
  x: number,
  z: number,
  woodMat: THREE.Material,
  steelMat: THREE.Material,
  brassMat: THREE.Material,
  darkMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.02, 1.5), darkMat);
  cabinet.position.y = 0.51;
  cabinet.castShadow = castShadows;
  g.add(cabinet);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 1.7), woodMat);
  counterTop.position.y = 1.06;
  g.add(counterTop);

  const machine = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.82, 0.88), steelMat);
  machine.position.set(-0.7, 1.52, -0.1);
  const brassTrim = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.14, 0.92), brassMat);
  brassTrim.position.set(-0.7, 1.88, -0.1);
  const grinder = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.66, 10), darkMat);
  grinder.position.set(0.45, 1.44, -0.1);
  const warmGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.12, 0.12),
    new THREE.MeshStandardMaterial({ color: "#fbbf24", emissive: "#f59e0b", emissiveIntensity: 1.4 })
  );
  warmGlow.position.set(-0.7, 1.38, -0.56);

  // Glass pastry display case with donuts + stacked white espresso cups!
  const pastryCase = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.56, 0.72),
    new THREE.MeshStandardMaterial({ color: "#bae6fd", transparent: true, opacity: 0.32, roughness: 0.1 })
  );
  pastryCase.position.set(1.65, 1.4, -0.1);
  const donutA = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.055, 6, 12),
    new THREE.MeshStandardMaterial({ color: "#f472b6", roughness: 0.45 })
  );
  donutA.rotation.x = Math.PI / 2;
  donutA.position.set(1.42, 1.22, -0.1);
  const donutB = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.055, 6, 12),
    new THREE.MeshStandardMaterial({ color: "#f59e0b", roughness: 0.45 })
  );
  donutB.rotation.x = Math.PI / 2;
  donutB.position.set(1.88, 1.22, -0.1);

  const cupMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.25 });
  for (let c = 0; c < 3; c += 1) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.14, 8), cupMat);
    cup.position.set(-1.85 + c * 0.2, 1.19, 0.16);
    g.add(cup);
  }

  g.add(machine, brassTrim, grinder, warmGlow, pastryCase, donutA, donutB);
  return g;
}

function buildConferenceTable(
  x: number,
  z: number,
  w: number,
  d: number,
  woodMat: THREE.Material,
  steelMat: THREE.Material,
  darkMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.12, d - 0.1), woodMat);
  top.position.y = 0.88;
  top.castShadow = castShadows;
  top.receiveShadow = true;
  g.add(top);

  for (const px of [-w * 0.32, w * 0.32]) {
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.84, d * 0.55), darkMat);
    pedestal.position.set(px, 0.42, 0);
    g.add(pedestal);
  }
  const trough = new THREE.Mesh(new THREE.BoxGeometry(Math.min(3.2, w * 0.48), 0.04, 0.32), steelMat);
  trough.position.set(0, 0.95, 0);
  const phone = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.1, 6), darkMat);
  phone.position.set(0, 0.99, 0);
  const phoneLed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: "#38bdf8", emissive: "#38bdf8", emissiveIntensity: 1.2 })
  );
  phoneLed.position.set(0, 1.0, 0);
  g.add(trough, phone, phoneLed);

  // Open laptops, legal pads & tucked conference chairs along long tables
  const seats = w > 5 ? [-3.1, -1.05, 1.05, 3.1] : [-0.95, 0.95];
  const screenGlow = new THREE.MeshStandardMaterial({ color: "#7dd3fc", emissive: "#38bdf8", emissiveIntensity: 0.7 });
  const padMat = new THREE.MeshStandardMaterial({ color: "#fef08a", roughness: 0.85 });
  for (const sx of seats) {
    for (const side of [-1, 1]) {
      // Laptop on table
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.32), steelMat);
      base.position.set(sx, 0.96, side * (d * 0.28));
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.03), screenGlow);
      lid.position.set(sx, 1.09, side * (d * 0.28 - 0.14 * side));
      lid.rotation.x = side * 0.22;
      g.add(base, lid);

      if (sx > 0) {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.3), padMat);
        pad.position.set(sx + 0.42, 0.95, side * (d * 0.28));
        g.add(pad);
      }

      // Tucked conference chair (inside visual table overhang so zero collision issue)
      const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.5), darkMat);
      cSeat.position.set(sx, 0.48, side * (d * 0.48));
      const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.56, 0.09), darkMat);
      cBack.position.set(sx, 0.78, side * (d * 0.48 + 0.22 * side));
      g.add(cSeat, cBack);
    }
  }
  return g;
}

function buildServerRackBank(
  x: number,
  z: number,
  darkMat: THREE.Material,
  steelMat: THREE.Material,
  ledMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const greenLed = new THREE.MeshStandardMaterial({ color: "#4ade80", emissive: "#22c55e", emissiveIntensity: 1.4 });
  for (let i = -1; i <= 1; i += 1) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.36, 2.75, 1.45), darkMat);
    rack.position.set(i * 1.44, 1.375, 0);
    rack.castShadow = castShadows;
    g.add(rack);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.24, 2.55, 0.08), steelMat);
    frame.position.set(i * 1.44, 1.375, -0.73);
    g.add(frame);
    for (let row = 0; row < 4; row += 1) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.06), row === 1 ? greenLed : ledMat);
      strip.position.set(i * 1.44, 0.56 + row * 0.52, -0.76);
      g.add(strip);
    }
  }
  // Overhead fiber-optic cable tray bridging across the 3 racks
  const cableTray = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.14, 0.56), steelMat);
  cableTray.position.set(0, 2.86, 0);
  const fiberBundle = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 0.22), ledMat);
  fiberBundle.position.set(0, 2.94, 0);
  g.add(cableTray, fiberBundle);
  return g;
}

function buildPrinterHub(
  x: number,
  z: number,
  darkMat: THREE.Material,
  steelMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const copierMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.42, metalness: 0.2 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.25, 1.35), copierMat);
  body.position.y = 0.625;
  body.castShadow = castShadows;
  const scanner = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.16, 1.2), darkMat);
  scanner.position.y = 1.33;
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.6), steelMat);
  tray.position.set(-1.2, 0.96, 0);
  const paperStack = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.12, 0.44),
    new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.85 })
  );
  paperStack.position.set(-1.2, 1.06, 0);
  const statusLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.12, 0.06),
    new THREE.MeshStandardMaterial({ color: "#c084fc", emissive: "#a78bfa", emissiveIntensity: 1.4 })
  );
  statusLed.position.set(0.7, 1.16, -0.69);
  g.add(body, scanner, tray, paperStack, statusLed);
  return g;
}

function buildLoungeCouch(
  x: number,
  z: number,
  w: number,
  d: number,
  fabricColor: string,
  brassMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const fabricMat = new THREE.MeshStandardMaterial({ color: fabricColor, roughness: 0.85 });
  const cushionMatA = new THREE.MeshStandardMaterial({ color: "#28b89d", roughness: 0.78 });
  const cushionMatB = new THREE.MeshStandardMaterial({ color: "#f59e0b", roughness: 0.78 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.46, d), fabricMat);
  base.position.y = 0.3;
  base.castShadow = castShadows;
  g.add(base);

  const horizontal = w >= d;
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(horizontal ? w : 0.28, 0.62, horizontal ? 0.28 : d),
    fabricMat
  );
  back.position.set(horizontal ? 0 : w / 2 - 0.14, 0.72, horizontal ? -d / 2 + 0.14 : 0);
  g.add(back);

  const pillowA = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.36, 0.24), cushionMatA);
  pillowA.position.set(horizontal ? -w * 0.25 : 0, 0.68, horizontal ? -d * 0.18 : -d * 0.25);
  const pillowB = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.22), cushionMatB);
  pillowB.position.set(horizontal ? w * 0.24 : 0, 0.66, horizontal ? -d * 0.18 : d * 0.24);
  pillowB.rotation.z = 0.15;
  g.add(pillowA, pillowB);

  const leg = new THREE.Mesh(new THREE.BoxGeometry(w - 0.18, 0.1, d - 0.18), brassMat);
  leg.position.y = 0.05;
  g.add(leg);
  return g;
}

function buildPingPongTable(
  x: number,
  z: number,
  w: number,
  d: number,
  steelMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const topMat = new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.45 });
  const lineMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.6 });
  const netMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", transparent: true, opacity: 0.78 });

  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), topMat);
  top.position.y = 0.84;
  top.castShadow = castShadows;
  const centerLine = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.02, 0.06), lineMat);
  centerLine.position.y = 0.9;
  const net = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, d + 0.1), netMat);
  net.position.y = 0.98;
  const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.78, d * 0.56), steelMat);
  base.position.y = 0.39;

  // Two paddles & a ping-pong ball resting on the table
  const paddleRed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.03, 10),
    new THREE.MeshStandardMaterial({ color: "#ef4444", roughness: 0.5 })
  );
  paddleRed.position.set(-w * 0.28, 0.92, 0.32);
  const paddleBlue = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.03, 10),
    new THREE.MeshStandardMaterial({ color: "#3b82f6", roughness: 0.5 })
  );
  paddleBlue.position.set(w * 0.3, 0.92, -0.28);
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 8, 6),
    new THREE.MeshStandardMaterial({ color: "#fef08a", emissive: "#fde047", emissiveIntensity: 0.4 })
  );
  ball.position.set(0.22, 0.95, 0.12);

  g.add(top, centerLine, net, base, paddleRed, paddleBlue, ball);
  return g;
}

function buildArcadeCabinet(
  x: number,
  z: number,
  darkMat: THREE.Material,
  arcadeTex: THREE.CanvasTexture,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.25, 1.15), darkMat);
  body.position.y = 1.125;
  body.castShadow = castShadows;
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.98, 0.74, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: arcadeTex,
      emissive: "#a855f7",
      emissiveMap: arcadeTex,
      emissiveIntensity: 0.95
    })
  );
  screen.position.set(0, 1.46, -0.57);
  screen.rotation.x = -0.18;
  const marquee = new THREE.Mesh(
    new THREE.BoxGeometry(1.16, 0.26, 0.12),
    new THREE.MeshStandardMaterial({ color: "#fbbf24", emissive: "#f59e0b", emissiveIntensity: 1.3 })
  );
  marquee.position.set(0, 2.08, -0.56);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.42), darkMat);
  shelf.position.set(0, 1.0, -0.7);
  const joystick = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 6),
    new THREE.MeshStandardMaterial({ color: "#ef4444", emissive: "#ef4444", emissiveIntensity: 0.6 })
  );
  joystick.position.set(-0.26, 1.14, -0.74);
  g.add(body, screen, marquee, shelf, joystick);
  return g;
}

function buildNapPod(x: number, z: number, darkMat: THREE.Material, castShadows: boolean): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const shellMat = new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.28, metalness: 0.22 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: "#4ade80",
    emissive: "#22c55e",
    emissiveIntensity: 1.05
  });
  const cushionMat = new THREE.MeshStandardMaterial({ color: "#6366f1", roughness: 0.8 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.5, 1.7), darkMat);
  base.position.y = 0.25;
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.16, 1.4), cushionMat);
  cushion.position.y = 0.56;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.12, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), shellMat);
  dome.scale.set(1.1, 0.95, 0.82);
  dome.position.set(0, 0.5, 0);
  dome.castShadow = castShadows;
  const glow = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.12), glowMat);
  glow.position.set(0, 0.62, -0.84);
  g.add(base, cushion, dome, glow);
  return g;
}

function buildWashroomStall(
  x: number,
  z: number,
  w: number,
  d: number,
  steelMat: THREE.Material,
  ceramicMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const panelMat = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.55, metalness: 0.25 });

  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, d), panelMat);
  sideL.position.set(-w / 2 + 0.06, 1.25, 0);
  sideL.castShadow = castShadows;
  const sideR = sideL.clone();
  sideR.position.x = w / 2 - 0.06;
  const frontDoor = new THREE.Mesh(new THREE.BoxGeometry(w - 0.22, 2.05, 0.1), panelMat);
  frontDoor.position.set(0, 1.22, -d / 2 + 0.08);
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.14), steelMat);
  latch.position.set(w * 0.28, 1.12, -d / 2 + 0.06);
  // Green/Red stall occupancy indicator LED above door
  const occColor = Math.abs(Math.round(x)) % 2 === 0 ? "#4ade80" : "#ef4444";
  const occLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.08, 0.12),
    new THREE.MeshStandardMaterial({ color: occColor, emissive: occColor, emissiveIntensity: 1.2 })
  );
  occLed.position.set(0, 2.34, -d / 2 + 0.08);
  const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.56, 10), ceramicMat);
  fixture.position.set(0, 0.28, 0.35);
  g.add(sideL, sideR, frontDoor, latch, occLed, fixture);
  return g;
}

function buildWashroomVanity(
  x: number,
  z: number,
  w: number,
  d: number,
  darkMat: THREE.Material,
  ceramicMat: THREE.Material,
  steelMat: THREE.Material,
  mirrorMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), darkMat);
  cabinet.position.y = 0.45;
  cabinet.castShadow = castShadows;
  const counter = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.1, d + 0.08), ceramicMat);
  counter.position.y = 0.95;
  g.add(cabinet, counter);

  // Triple porcelain sinks, chrome faucets, soap dispensers & illuminated backlit mirror halo
  const soapMat = new THREE.MeshStandardMaterial({ color: "#38bdf8", roughness: 0.25 });
  for (const sx of [-1.9, 0, 1.9]) {
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.12, 12), steelMat);
    basin.position.set(sx, 1.0, 0.08);
    const faucet = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.24), steelMat);
    faucet.position.set(sx, 1.14, -0.3);
    const soap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8), soapMat);
    soap.position.set(sx + 0.46, 1.09, -0.22);
    g.add(basin, faucet, soap);
  }

  const mirror = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 1.25, 0.08), mirrorMat);
  mirror.position.set(0, 1.85, -d / 2 + 0.08);
  const mirrorGlow = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.18, 0.06, 0.1),
    new THREE.MeshStandardMaterial({ color: "#e0f2fe", emissive: "#67e8f9", emissiveIntensity: 1.25 })
  );
  mirrorGlow.position.set(0, 2.52, -d / 2 + 0.08);
  g.add(mirror, mirrorGlow);
  return g;
}

function buildCfoVault(
  x: number,
  z: number,
  w: number,
  d: number,
  darkMat: THREE.Material,
  brassMat: THREE.Material,
  steelMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, 2.55, d), darkMat);
  body.position.y = 1.275;
  body.castShadow = castShadows;
  const door = new THREE.Mesh(new THREE.BoxGeometry(w - 0.28, 2.25, 0.14), steelMat);
  door.position.set(0, 1.28, d / 2);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 8, 16), brassMat);
  wheel.position.set(0, 1.3, d / 2 + 0.1);
  const spokeH = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.07, 0.06), brassMat);
  spokeH.position.set(0, 1.3, d / 2 + 0.1);
  const spokeV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.68, 0.06), brassMat);
  spokeV.position.set(0, 1.3, d / 2 + 0.1);
  const crownTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.1, d + 0.06), brassMat);
  crownTrim.position.y = 2.58;
  g.add(body, door, wheel, spokeH, spokeV, crownTrim);
  return g;
}

function buildVendingMachine(
  x: number,
  z: number,
  darkMat: THREE.Material,
  frontGlowMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.3, 1.3), darkMat);
  body.position.y = 1.15;
  body.castShadow = castShadows;
  const display = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.45, 0.08), frontGlowMat);
  display.position.set(-0.1, 1.32, -0.64);
  // Colorful stocked snack rows visible on the front glass
  const rowColors = ["#ef4444", "#f59e0b", "#22c55e", "#f472b6"];
  rowColors.forEach((col, r) => {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.14, 0.1),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.45 })
    );
    bar.position.set(-0.1, 0.88 + r * 0.3, -0.66);
    g.add(bar);
  });
  g.add(body, display);
  return g;
}

function buildFilingCabinet(
  x: number,
  z: number,
  w: number,
  d: number,
  steelMat: THREE.Material,
  darkMat: THREE.Material,
  brassMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, 1.72, d), steelMat);
  body.position.y = 0.86;
  body.castShadow = castShadows;
  g.add(body);
  for (let row = 0; row < 3; row += 1) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(Math.min(0.6, w * 0.45), 0.06, d + 0.06), brassMat);
    handle.position.set(0, 0.38 + row * 0.5, 0);
    g.add(handle);
  }
  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.08, d + 0.04), darkMat);
  topTrim.position.y = 1.74;
  // Stacked compliance binders on top of the filing cabinet
  const binderA = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.14, 0.34),
    new THREE.MeshStandardMaterial({ color: "#e11d48", roughness: 0.6 })
  );
  binderA.position.set(-0.2, 1.85, 0);
  const binderB = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.12, 0.32),
    new THREE.MeshStandardMaterial({ color: "#3b82f6", roughness: 0.6 })
  );
  binderB.position.set(0.24, 1.84, 0.04);
  g.add(topTrim, binderA, binderB);
  return g;
}

function buildHrShredder(
  x: number,
  z: number,
  darkMat: THREE.Material,
  steelMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.35, 1.2), darkMat);
  body.position.y = 0.675;
  body.castShadow = castShadows;
  const hopper = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.16, 0.9), steelMat);
  hopper.position.y = 1.4;
  const docSheet = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.34, 0.04),
    new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.8 })
  );
  docSheet.position.set(0, 1.58, 0);
  docSheet.rotation.x = 0.25;
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.1, 0.08),
    new THREE.MeshStandardMaterial({ color: "#c084fc", emissive: "#a855f7", emissiveIntensity: 1.3 })
  );
  glow.position.set(0, 1.15, 0.62);
  g.add(body, hopper, docSheet, glow);
  return g;
}

function buildBistroTable(
  x: number,
  z: number,
  woodMat: THREE.Material,
  darkMat: THREE.Material,
  steelMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.1, 14), woodMat);
  top.position.y = 0.88;
  top.castShadow = castShadows;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.84, 8), steelMat);
  pole.position.y = 0.42;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.08, 12), darkMat);
  base.position.y = 0.04;
  // Pizza box & coffee mug on the bistro table
  const pizzaBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.08, 0.62),
    new THREE.MeshStandardMaterial({ color: "#e2c8a0", roughness: 0.82 })
  );
  pizzaBox.position.set(-0.14, 0.97, 0.06);
  pizzaBox.rotation.y = 0.35;
  const cup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.06, 0.16, 8),
    new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.3 })
  );
  cup.position.set(0.42, 1.0, -0.2);
  g.add(top, pole, base, pizzaBox, cup);
  return g;
}

function addAllRoomDecorations(
  group: THREE.Group,
  textures: ProceduralTextureSet,
  darkFrameMat: THREE.Material,
  brassMat: THREE.Material,
  steelMat: THREE.Material,
  serverLedMat: THREE.Material
): void {
  const addRug = (x: number, z: number, w: number, d: number, fillHex: string, borderHex: string) => {
    const border = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color: borderHex, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1 })
    );
    border.rotation.x = -Math.PI / 2;
    border.position.set(x, 0.022, z);
    const inner = new THREE.Mesh(
      new THREE.PlaneGeometry(w - 0.55, d - 0.55),
      new THREE.MeshStandardMaterial({ color: fillHex, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 })
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(x, 0.025, z);
    group.add(border, inner);
  };

  // 1. Area Rugs giving Executive, Boardroom & Lounge rooms rich visual warmth
  addRug(-28.5, -22.2, 8.6, 5.4, "#14352d", "#d4a853"); // CEO Emerald & Gold Executive Rug
  addRug(0, -18.5, 11.4, 5.4, "#16243a", "#38bdf8"); // Boardroom Navy Strategy Rug
  addRug(31.0, 20.5, 9.6, 11.5, "#1f3a36", "#4ade80"); // Casual Lounge Cozy Rug

  // 2. CEO Corner Suite: Framed Abstract Executive Canvas on North Wall
  const ceoArtFrame = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.75, 0.12), brassMat);
  ceoArtFrame.position.set(-28.5, 3.05, -WORLD_BOUNDS.halfD + 0.04);
  const ceoArtCanvas = new THREE.Mesh(
    new THREE.PlaneGeometry(4.1, 2.45),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.ceoArt, roughness: 0.35 })
  );
  ceoArtCanvas.position.set(-28.5, 3.05, -WORLD_BOUNDS.halfD + 0.11);
  group.add(ceoArtFrame, ceoArtCanvas);

  // 3. CFO & Finance Suite: Glowing Wall Stock Ticker & Candlestick Dashboard on North Wall
  const stockFrame = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.7, 0.14), darkFrameMat);
  stockFrame.position.set(25.5, 3.05, -WORLD_BOUNDS.halfD + 0.04);
  const stockFace = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 2.42),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.stockChart,
      emissive: "#10b981",
      emissiveMap: textures.stockChart,
      emissiveIntensity: 0.65,
      roughness: 0.25
    })
  );
  stockFace.position.set(25.5, 3.05, -WORLD_BOUNDS.halfD + 0.12);
  group.add(stockFrame, stockFace);

  // 4. HR Office: Motivational "SYNERGY FIRST" Posters along the West Perimeter Wall
  for (const pz of [-5.4, 5.4]) {
    const posterFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.35, 1.9), darkFrameMat);
    posterFrame.position.set(-WORLD_BOUNDS.halfW + 0.08, 2.75, pz);
    const posterFace = new THREE.Mesh(
      new THREE.PlaneGeometry(1.74, 2.18),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: textures.hrPoster,
        emissive: "#a855f7",
        emissiveMap: textures.hrPoster,
        emissiveIntensity: 0.35
      })
    );
    posterFace.rotation.y = Math.PI / 2;
    posterFace.position.set(-WORLD_BOUNDS.halfW + 0.14, 2.75, pz);
    group.add(posterFrame, posterFace);
  }

  // 5. IT & Core Server Room: Glowing Raised-Floor Cable Conduits + Diagnostic Screen on East Wall
  const conduitMat = new THREE.MeshBasicMaterial({ color: "#0ea5e9", transparent: true, opacity: 0.65 });
  for (const cz of [-6.0, 0.0, 6.0]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 0.28), conduitMat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(26.2, 0.022, cz);
    group.add(strip);
  }
  const srvScreenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 3.6), darkFrameMat);
  srvScreenFrame.position.set(WORLD_BOUNDS.halfW - 0.08, 2.85, 0);
  const srvScreenFace = new THREE.Mesh(
    new THREE.PlaneGeometry(3.38, 1.9),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.serverScreen,
      emissive: "#38bdf8",
      emissiveMap: textures.serverScreen,
      emissiveIntensity: 0.72
    })
  );
  srvScreenFace.rotation.y = -Math.PI / 2;
  srvScreenFace.position.set(WORLD_BOUNDS.halfW - 0.15, 2.85, 0);
  group.add(srvScreenFrame, srvScreenFace);

  // 6. Cafeteria: Warm Hanging "APEX ROASTERY" Menu Board above Espresso Bar
  const menuFrame = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.75, 0.14), darkFrameMat);
  menuFrame.position.set(17.0, 3.35, 27.6);
  const menuFace = new THREE.Mesh(
    new THREE.PlaneGeometry(4.56, 1.54),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.cafeMenu,
      emissive: "#f59e0b",
      emissiveMap: textures.cafeMenu,
      emissiveIntensity: 0.65
    })
  );
  menuFace.rotation.y = Math.PI;
  menuFace.position.set(17.0, 3.35, 27.52);
  group.add(menuFrame, menuFace);

  // 7. Casual Lounge: Glowing "AFK LOUNGE" Neon Sign mounted on East Wall
  const neonFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.55, 4.1), darkFrameMat);
  neonFrame.position.set(WORLD_BOUNDS.halfW - 0.08, 3.0, 20.0);
  const neonFace = new THREE.Mesh(
    new THREE.PlaneGeometry(3.88, 1.38),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.loungeNeon,
      emissive: "#4ade80",
      emissiveMap: textures.loungeNeon,
      emissiveIntensity: 0.85
    })
  );
  neonFace.rotation.y = -Math.PI / 2;
  neonFace.position.set(WORLD_BOUNDS.halfW - 0.15, 3.0, 20.0);
  group.add(neonFrame, neonFace);

  // 8. Washrooms: Yellow "WET FLOOR" A-Frame Caution Cone tucked safely near SW corner (non-colliding prop)
  const coneMat = new THREE.MeshStandardMaterial({ color: "#facc15", roughness: 0.4 });
  const coneA = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.78, 0.06), coneMat);
  coneA.position.set(-16.2, 0.38, 12.6);
  coneA.rotation.x = 0.22;
  const coneB = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.78, 0.06), coneMat);
  coneB.position.set(-16.2, 0.38, 12.92);
  coneB.rotation.x = -0.22;
  group.add(coneA, coneB);

  // 9. Architectural Wall-Cap Room Plaques mounted flush on the partition headers beside each doorway
  // (grounded on y=2.71 aluminum rail — never floating in doorways, never blocking sightlines in 3P or FPS!)
  const entranceSigns: Array<{
    x: number;
    z: number;
    rotY: number;
    title: string;
    sub: string;
    accent: string;
  }> = [
    { x: -6.4, z: -11, rotY: 0, title: "BOARDROOM", sub: "STRATEGY", accent: "#38bdf8" },
    { x: -14, z: -6.2, rotY: Math.PI / 2, title: "HR OFFICE", sub: "PEOPLE OPS", accent: "#c084fc" },
    { x: 14, z: -6.2, rotY: -Math.PI / 2, title: "IT SERVERS", sub: "CORE OPS", accent: "#38bdf8" },
    { x: -18.2, z: -11, rotY: 0, title: "CEO SUITE", sub: "EXECUTIVE", accent: "#eab308" },
    { x: 19.2, z: -11, rotY: 0, title: "CFO SUITE", sub: "FINANCE", accent: "#34d399" },
    { x: -18.2, z: 11, rotY: 0, title: "WASHROOMS", sub: "CLEANSE", accent: "#67e8f9" },
    { x: 5.2, z: 11, rotY: 0, title: "BULLPEN", sub: "ENGINEERING", accent: "#60a5fa" },
    { x: 12.4, z: 11, rotY: 0, title: "CAFETERIA", sub: "ESPRESSO", accent: "#f59e0b" },
    { x: 26.2, z: 11, rotY: 0, title: "AFK LOUNGE", sub: "NAP POD", accent: "#4ade80" }
  ];
  for (const s of entranceSigns) {
    const tex = createRoomSignTexture(s.title, s.sub, s.accent);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex,
      emissive: s.accent,
      emissiveMap: tex,
      emissiveIntensity: 0.42,
      roughness: 0.25
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.62, 0.14), mat);
    sign.position.set(s.x, 3.12, s.z);
    sign.rotation.y = s.rotY;
    // Short mounting brackets anchored directly onto the y=2.71 partition header cap
    const mountL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.16), darkFrameMat);
    mountL.position.set(s.x + (s.rotY === 0 ? -0.95 : 0), 2.77, s.z + (s.rotY !== 0 ? -0.95 : 0));
    const mountR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.16), darkFrameMat);
    mountR.position.set(s.x + (s.rotY === 0 ? 0.95 : 0), 2.77, s.z + (s.rotY !== 0 ? 0.95 : 0));
    group.add(sign, mountL, mountR);
  }
  void serverLedMat;
}

function buildColumn(
  x: number,
  z: number,
  wallMat: THREE.Material,
  brassMat: THREE.Material,
  castShadows: boolean
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.98, 5.2, 0.98), wallMat);
  shaft.position.y = 2.6;
  shaft.castShadow = castShadows;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.24, 1.12), brassMat);
  plinth.position.y = 0.12;
  const collar = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.12, 1.06), brassMat);
  collar.position.y = 3.8;
  g.add(shaft, plinth, collar);
  return g;
}

function buildPlanter(x: number, z: number, castShadows: boolean): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.42, 0.78, 10),
    new THREE.MeshStandardMaterial({ color: "#b86b4b", roughness: 0.82 })
  );
  pot.position.y = 0.39;
  pot.castShadow = castShadows;
  g.add(pot);

  const leafMatA = new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.55 });
  const leafMatB = new THREE.MeshStandardMaterial({ color: "#22c55e", roughness: 0.5 });
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.92, 5), i % 2 === 0 ? leafMatA : leafMatB);
    leaf.position.set(Math.cos(angle) * 0.28, 1.12 + (i % 2) * 0.14, Math.sin(angle) * 0.28);
    leaf.rotation.z = Math.cos(angle) * -0.45;
    leaf.rotation.x = Math.sin(angle) * 0.45;
    g.add(leaf);
  }
  return g;
}
