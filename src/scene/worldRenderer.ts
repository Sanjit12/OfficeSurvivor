import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ALL_STATIONS, CLASS_MAP } from "../game/data";
import { clampFpsPitch, createDefaultSettings } from "../game/settings";
import type {
  EmployeeClassId,
  FloorHazardEntity,
  GameSettings,
  GameState,
  OfficeWeaponId,
  TelegraphEntity
} from "../game/types";
import {
  buildEnemyProjectileMesh,
  buildOfficeWeaponMesh,
  createDroneMesh,
  createEmployeeRig,
  createEnemyRig,
  createPickupMesh,
  type CharacterRig,
  type EnemyRig
} from "./models";
import { buildOfficeEnvironment, type OfficeEnvironmentRefs } from "./officeEnvironment";
import { createProceduralTextures, type ProceduralTextureSet } from "./textures";

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  ttl: number;
  scale: number;
  color: THREE.Color;
}

const MAX_PARTICLES = 220;
const MAX_PROJECTILES = 140;
const MAX_ORBS = 64;

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class WorldRenderer {
  public readonly isSoftwareGl: boolean;
  private readonly mount: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly textures: ProceduralTextureSet;
  private readonly office: OfficeEnvironmentRefs;
  private readonly keyLight: THREE.DirectionalLight;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly serverPointLight: THREE.PointLight;
  private readonly aimReticle: THREE.Group;

  private settings: GameSettings = createDefaultSettings();
  private particleBudgetMult = 1.0;

  private playerRig: CharacterRig;
  private fpsViewmodel: THREE.Group;
  private fpsEmitterMat!: THREE.MeshStandardMaterial;
  private currentRigClass: EmployeeClassId;
  private currentRigWeapon: OfficeWeaponId;
  private currentRigEvolved = false;
  private readonly enemyRigs = new Map<string, EnemyRig>();
  private readonly pickupMeshes = new Map<string, THREE.Group>();
  private readonly droneMeshes = new Map<string, THREE.Group>();
  private readonly telegraphMeshes = new Map<string, THREE.Group>();
  private readonly hazardMeshes = new Map<string, THREE.Group>();
  private readonly weaponProjectileMeshes = new Map<string, THREE.Group>();
  private readonly enemyProjectileMeshes = new Map<string, THREE.Group>();

  // Zero-GC Instanced Pools
  private readonly particleMesh: THREE.InstancedMesh;
  private readonly particles: ParticleSlot[] = [];
  private particleCursor = 0;
  private readonly projectileMesh: THREE.InstancedMesh;
  private readonly orbMesh: THREE.InstancedMesh;

  // Reusable scratch objects (zero per-frame allocations)
  private readonly _dummy = new THREE.Object3D();
  private readonly _vec3 = new THREE.Vector3();
  private readonly _camFwd = new THREE.Vector3();
  private readonly _toPoint = new THREE.Vector3();
  private readonly _camTarget = new THREE.Vector3(0, 1.0, 0);
  private readonly _camDesired = new THREE.Vector3(6, 7.5, 11);
  private readonly _lookDesired = new THREE.Vector3(-2, 1.2, 0);
  private readonly _raycaster = new THREE.Raycaster();
  private readonly _pointerNdc = new THREE.Vector2();
  private readonly _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly _hitPoint = new THREE.Vector3();
  private readonly _skyMorning = new THREE.Color("#162336");
  private readonly _skyNoon = new THREE.Color("#1c2e46");
  private readonly _skySunset = new THREE.Color("#2b2335");
  private readonly _skyDeadline = new THREE.Color("#311b24");
  private readonly _skyTmp = new THREE.Color();
  private readonly _keyWarm = new THREE.Color("#fff1dc");
  private readonly _keySunset = new THREE.Color("#ffb876");
  private readonly _keyDeadline = new THREE.Color("#ff8b74");
  private readonly _keyTmp = new THREE.Color();
  private readonly _white = new THREE.Color("#ffffff");
  private readonly _projColor = new THREE.Color();
  private readonly _orbColor = new THREE.Color();

  private titleOrbitAngle = 0.45;
  private titleUserYawOffset = 0;
  private titleDragCooldown = 0;
  private fpsYaw = 0;
  private fpsPitch = -0.05;
  private fpsRoll = 0;
  private fpsRecoil = 0;
  private reticleWorldX = 0;
  private reticleWorldZ = 0;
  private reticleVisible = false;
  private lastFloorTheme = "";
  private loopId = 0;
  private disposed = false;

  constructor(
    mount: HTMLElement,
    initialClass: EmployeeClassId,
    initialWeapon: OfficeWeaponId = "stapler",
    initialSettings?: GameSettings
  ) {
    this.mount = mount;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.currentRigClass = initialClass;
    this.currentRigWeapon = initialWeapon;
    if (initialSettings) this.settings = initialSettings;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: "high-performance"
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(
      mount.clientWidth || window.innerWidth,
      mount.clientHeight || window.innerHeight
    );

    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    mount.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = this._skyMorning.clone();
    this.scene.fog = new THREE.FogExp2(this._skyMorning.getHex(), 0.0145);

    // Mandatory studio reflections on every device (RoomEnvironment)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(44, width / Math.max(height, 1), 0.08, 160);
    this.camera.rotation.order = "YXZ";
    this.camera.position.set(5.5, 6.2, 10.2);
    this.camera.lookAt(-2.2, 1.2, 0);
    this.scene.add(this.camera);

    // Balanced Warm/Cool Lighting Rig
    this.hemiLight = new THREE.HemisphereLight("#b8d8ff", "#342b26", 0.92);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight("#fff1dc", 1.75);
    this.keyLight.position.set(22, 34, 18);
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 96;
    const d = 40;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    const atriumLight = new THREE.PointLight("#5eead4", 1.15, 22, 1.5);
    atriumLight.position.set(0, 4.4, -7);
    this.scene.add(atriumLight);

    const espressoLight = new THREE.PointLight("#fbbf24", 1.35, 20, 1.5);
    espressoLight.position.set(17, 3.8, 22);
    this.scene.add(espressoLight);

    const ceoLight = new THREE.PointLight("#facc15", 1.1, 20, 1.5);
    ceoLight.position.set(-26, 3.8, -20);
    this.scene.add(ceoLight);

    this.serverPointLight = new THREE.PointLight("#38bdf8", 1.3, 22, 1.5);
    this.serverPointLight.position.set(26, 3.8, 0);
    this.scene.add(this.serverPointLight);

    // Procedural PBR Textures + Office 3D Arena
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.office = buildOfficeEnvironment(this.textures, !this.isSoftwareGl);
    this.scene.add(this.office.group);

    // Initial Hero Employee Rig + First-Person Viewmodel holding selected Office Item
    this.playerRig = createEmployeeRig(
      CLASS_MAP[initialClass],
      initialWeapon,
      this.textures.contactShadow,
      !this.isSoftwareGl
    );
    this.scene.add(this.playerRig.root);

    this.fpsViewmodel = this.createFpsViewmodel(initialClass, initialWeapon, false);
    this.fpsViewmodel.visible = false;
    this.camera.add(this.fpsViewmodel);

    // Crisp 3D Floor Aim Reticle for Manual Aim / Click Override
    this.aimReticle = this.createAimReticle();
    this.aimReticle.visible = false;
    this.scene.add(this.aimReticle);

    // Zero-GC Pooled Instanced Particle System
    const pGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    this._dummy.scale.set(0, 0, 0);
    this._dummy.updateMatrix();
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      this.particleMesh.setMatrixAt(i, this._dummy.matrix);
      this.particleMesh.setColorAt(i, this._white);
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        ttl: 1,
        scale: 1,
        color: new THREE.Color("#ffffff")
      });
    }
    this.scene.add(this.particleMesh);

    // Zero-GC Pooled Instanced Projectile System
    const shotGeo = new THREE.OctahedronGeometry(0.24, 1);
    const shotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.projectileMesh = new THREE.InstancedMesh(shotGeo, shotMat, MAX_PROJECTILES);
    this.projectileMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.projectileMesh.frustumCulled = false;
    for (let i = 0; i < MAX_PROJECTILES; i += 1) {
      this.projectileMesh.setMatrixAt(i, this._dummy.matrix);
      this.projectileMesh.setColorAt(i, this._white);
    }
    this.scene.add(this.projectileMesh);

    // Zero-GC Pooled Instanced Magnetic XP Orbs
    const orbGeo = new THREE.OctahedronGeometry(0.22, 0);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.orbMesh = new THREE.InstancedMesh(orbGeo, orbMat, MAX_ORBS);
    this.orbMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.orbMesh.frustumCulled = false;
    for (let i = 0; i < MAX_ORBS; i += 1) {
      this.orbMesh.setMatrixAt(i, this._dummy.matrix);
      this.orbMesh.setColorAt(i, this._white);
    }
    this.scene.add(this.orbMesh);

    this.applySettings(this.settings);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
    });
  }

  private createAimReticle(): THREE.Group {
    const g = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({
      color: "#28b89d",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    const outer = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.56, 28), ringMat);
    outer.rotation.x = -Math.PI / 2;
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.11, 14), ringMat);
    dot.rotation.x = -Math.PI / 2;
    g.add(outer, dot);
    return g;
  }

  private createFpsViewmodel(
    classId: EmployeeClassId,
    weaponId: OfficeWeaponId,
    evolved: boolean
  ): THREE.Group {
    const emp = CLASS_MAP[classId];
    const root = new THREE.Group();
    root.position.set(0.32, -0.32, -0.56);

    const sleeveMat = new THREE.MeshStandardMaterial({
      color: emp.palette.primary,
      roughness: 0.65,
      metalness: 0.08
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: emp.palette.skin,
      roughness: 0.72
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: "#cbd5e1",
      roughness: 0.25,
      metalness: 0.85
    });
    this.fpsEmitterMat = new THREE.MeshStandardMaterial({
      color: evolved ? "#fbbf24" : emp.palette.accent,
      emissive: evolved ? "#fbbf24" : emp.palette.accent,
      emissiveIntensity: evolved ? 1.65 : 1.15,
      roughness: 0.2
    });

    // Stylized forearm + cuff + hand gripping the chosen Office Item Weapon
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.36), sleeveMat);
    forearm.position.set(0.06, -0.09, 0.22);
    forearm.rotation.set(0.18, -0.15, 0);

    const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), steelMat);
    cuff.position.set(0.03, -0.06, 0.06);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.085, 0.11), skinMat);
    hand.position.set(0.01, -0.05, -0.01);

    const itemWrap = new THREE.Group();
    itemWrap.position.set(-0.01, 0.03, -0.11);
    itemWrap.rotation.set(0.1, 0.14, 0);
    itemWrap.add(buildOfficeWeaponMesh(weaponId, "fps", evolved));

    // Subtle wristband charge indicator synced with fire flash / evolved gold glow
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.128, 0.028, 0.055), this.fpsEmitterMat);
    band.position.set(0.03, -0.04, 0.055);

    root.add(forearm, cuff, band, hand, itemWrap);
    return root;
  }

  public resetFpsLook(yaw = 0, pitch = -0.05): void {
    this.fpsYaw = yaw;
    this.fpsPitch = clampFpsPitch(pitch);
    this.fpsRoll = 0;
  }

  public rotateFpsLook(deltaYaw: number, deltaPitch: number): void {
    this.fpsYaw += deltaYaw;
    this.fpsPitch = clampFpsPitch(this.fpsPitch + deltaPitch);
  }

  public getFpsLook(): { yaw: number; pitch: number } {
    return { yaw: this.fpsYaw, pitch: this.fpsPitch };
  }

  public getFpsAimWorldPoint(playerX: number, playerZ: number, distance = 16): { x: number; z: number } {
    return {
      x: playerX - Math.sin(this.fpsYaw) * distance,
      z: playerZ - Math.cos(this.fpsYaw) * distance
    };
  }

  public applySettings(settings: GameSettings): void {
    this.settings = settings;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.keyLight.castShadow = false;
    } else {
      const cap =
        settings.video.quality === "low"
          ? 1
          : settings.video.quality === "medium"
          ? Math.min(dpr, 1.5)
          : Math.min(dpr, 2);
      this.renderer.setPixelRatio(cap);
      const enableShadows = settings.video.shadows && settings.video.quality !== "low";
      this.renderer.shadowMap.enabled = enableShadows;
      this.keyLight.castShadow = enableShadows;
    }
    this.particleBudgetMult =
      settings.video.quality === "low" ? 0.45 : settings.video.quality === "medium" ? 0.75 : 1.0;
    this.renderer.shadowMap.needsUpdate = true;
  }

  public adjustTitleOrbit(deltaRadians: number): void {
    this.titleUserYawOffset += deltaRadians;
    this.titleDragCooldown = 2.6;
  }

  public setAimReticle(visible: boolean, x: number, z: number): void {
    this.reticleVisible = visible;
    this.reticleWorldX = x;
    this.reticleWorldZ = z;
  }

  public setFloorTheme(hexColor: string): void {
    if (!hexColor || hexColor === this.lastFloorTheme) return;
    this.lastFloorTheme = hexColor;
    this.office.setFloorTheme(hexColor);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public resize(): void {
    const width = this.mount.clientWidth || window.innerWidth;
    const height = this.mount.clientHeight || window.innerHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public setHeroLoadout(classId: EmployeeClassId, weaponId: OfficeWeaponId, evolved = false): void {
    if (
      classId === this.currentRigClass &&
      weaponId === this.currentRigWeapon &&
      evolved === this.currentRigEvolved
    ) {
      return;
    }
    this.currentRigClass = classId;
    this.currentRigWeapon = weaponId;
    this.currentRigEvolved = evolved;

    const prevPos = this.playerRig.root.position.clone();
    const prevRot = this.playerRig.root.rotation.y;
    const prevVis = this.playerRig.root.visible;
    this.scene.remove(this.playerRig.root);
    this.playerRig = createEmployeeRig(
      CLASS_MAP[classId],
      weaponId,
      this.textures.contactShadow,
      !this.isSoftwareGl && this.settings.video.shadows
    );
    if (evolved) {
      this.playerRig.gearGroup.clear();
      this.playerRig.gearGroup.add(buildOfficeWeaponMesh(weaponId, "held", true));
    }
    this.playerRig.root.position.copy(prevPos);
    this.playerRig.root.rotation.y = prevRot;
    this.playerRig.root.visible = prevVis;
    this.scene.add(this.playerRig.root);

    const prevVmVis = this.fpsViewmodel.visible;
    this.camera.remove(this.fpsViewmodel);
    this.fpsViewmodel = this.createFpsViewmodel(classId, weaponId, evolved);
    this.fpsViewmodel.visible = prevVmVis;
    this.camera.add(this.fpsViewmodel);
  }

  public spawnBurst(x: number, z: number, colorHex: string, count = 10, speed = 5.5): void {
    const scaledCount = Math.max(2, Math.round(count * this.particleBudgetMult));
    for (let i = 0; i < scaledCount; i += 1) {
      const slot = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.45 + Math.random() * 0.85);
      slot.active = true;
      slot.x = x;
      slot.y = 0.75 + Math.random() * 0.5;
      slot.z = z;
      slot.vx = Math.cos(angle) * spd;
      slot.vy = 2.4 + Math.random() * 3.8;
      slot.vz = Math.sin(angle) * spd;
      slot.ttl = 0.32 + Math.random() * 0.34;
      slot.life = slot.ttl;
      slot.scale = 0.65 + Math.random() * 0.85;
      slot.color.set(colorHex);
    }
  }

  public screenToWorld(clientX: number, clientY: number): { x: number; z: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this._pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._pointerNdc, this.camera);
    const hit = this._raycaster.ray.intersectPlane(this._groundPlane, this._hitPoint);
    if (!hit) return null;
    return { x: hit.x, z: hit.z };
  }

  public projectToScreen(x: number, y: number, z: number): { sx: number; sy: number } | null {
    this.camera.getWorldDirection(this._camFwd);
    this._toPoint.set(x - this.camera.position.x, y - this.camera.position.y, z - this.camera.position.z);
    if (this._toPoint.dot(this._camFwd) <= 0.15) return null;

    this._vec3.set(x, y, z).project(this.camera);
    if (this._vec3.z < -1 || this._vec3.z > 1) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      sx: (this._vec3.x * 0.5 + 0.5) * rect.width,
      sy: (-this._vec3.y * 0.5 + 0.5) * rect.height
    };
  }

  public renderFrame(
    state: GameState | null,
    selectedClass: EmployeeClassId,
    selectedWeapon: OfficeWeaponId,
    dt: number
  ): void {
    const safeDt = Math.min(Math.max(dt, 0.001), 0.05);

    if (!state || state.screen === "title") {
      this.setHeroLoadout(selectedClass, selectedWeapon, false);
      this.clearDynamicEntities();
      this.updateTitleScene(safeDt);
    } else {
      this.setHeroLoadout(state.employee.id, state.weapon.id, state.player.weaponEvolved);
      this.syncGameplayScene(state, safeDt);
    }

    this.updateParticles(safeDt);
    this.renderer.render(this.scene, this.camera);
  }

  private clearDynamicEntities(): void {
    for (const rig of this.enemyRigs.values()) this.scene.remove(rig.root);
    this.enemyRigs.clear();
    for (const mesh of this.pickupMeshes.values()) this.scene.remove(mesh);
    this.pickupMeshes.clear();
    for (const mesh of this.droneMeshes.values()) this.scene.remove(mesh);
    this.droneMeshes.clear();
    for (const mesh of this.telegraphMeshes.values()) this.scene.remove(mesh);
    this.telegraphMeshes.clear();
    for (const mesh of this.hazardMeshes.values()) this.scene.remove(mesh);
    this.hazardMeshes.clear();
    for (const mesh of this.weaponProjectileMeshes.values()) this.scene.remove(mesh);
    this.weaponProjectileMeshes.clear();
    for (const mesh of this.enemyProjectileMeshes.values()) this.scene.remove(mesh);
    this.enemyProjectileMeshes.clear();
    this.aimReticle.visible = false;

    this._dummy.scale.set(0, 0, 0);
    this._dummy.updateMatrix();
    for (let i = 0; i < MAX_PROJECTILES; i += 1) {
      this.projectileMesh.setMatrixAt(i, this._dummy.matrix);
    }
    this.projectileMesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < MAX_ORBS; i += 1) {
      this.orbMesh.setMatrixAt(i, this._dummy.matrix);
    }
    this.orbMesh.instanceMatrix.needsUpdate = true;
  }

  private updateTitleScene(dt: number): void {
    if (this.titleDragCooldown > 0) {
      this.titleDragCooldown = Math.max(0, this.titleDragCooldown - dt);
    } else {
      this.titleOrbitAngle += dt * 0.2;
      this.titleUserYawOffset = THREE.MathUtils.damp(this.titleUserYawOffset, 0, 1.2, dt);
    }

    this.playerRig.root.visible = true;
    this.fpsViewmodel.visible = false;
    this.office.fpsCeilingGroup.visible = false;
    if (Math.abs(this.camera.fov - 44) > 0.1) {
      this.camera.fov = 44;
      this.camera.updateProjectionMatrix();
    }

    this.playerRig.root.position.set(2.3, 0, 0.6);
    this.playerRig.root.rotation.y =
      Math.PI + Math.sin(this.titleOrbitAngle * 1.2) * 0.22 + this.titleUserYawOffset;
    this.playerRig.bodyGroup.position.y = Math.sin(this.titleOrbitAngle * 3.0) * 0.04;
    this.playerRig.bodyGroup.rotation.x = 0;
    this.playerRig.bodyGroup.scale.set(1, 1, 1);
    this.playerRig.leftLeg.rotation.x = 0;
    this.playerRig.rightLeg.rotation.x = 0;
    this.playerRig.leftArm.rotation.x = 0.55;
    this.playerRig.rightArm.rotation.x = 0.55;
    this.playerRig.meetingRing.visible = false;

    const camAngle = this.titleOrbitAngle;
    const orbitX = 4.6 + Math.cos(camAngle) * 3.6;
    const orbitZ = 10.6 + Math.sin(camAngle) * 2.1;
    this._camDesired.set(orbitX, 5.4, orbitZ);
    this._lookDesired.set(-1.1, 1.35, -1.8);

    const damp = 1 - Math.exp(-4.5 * dt);
    this.camera.position.lerp(this._camDesired, damp);
    this._camTarget.lerp(this._lookDesired, damp);
    this.camera.lookAt(this._camTarget);

    this.scene.background = this._skyMorning;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this._skyMorning);
    }
    this.keyLight.color.copy(this._keyWarm);
    this.keyLight.intensity = 1.8;
    this.hemiLight.intensity = 0.95;
    this.office.overheadLightMat.emissiveIntensity = 1.1;
    for (const st of ALL_STATIONS) {
      const ring = this.office.stationRings[st.id];
      if (ring) {
        ring.visible = true;
        ring.scale.set(1, 1, 1);
      }
    }
  }

  private getCameraFraming(): { height: number; zOffset: number } {
    const zoomScale =
      this.settings.camera.zoom === "close"
        ? 0.82
        : this.settings.camera.zoom === "wide"
        ? 1.22
        : 1.0;

    let baseY = 17.2;
    let baseZ = 13.8;
    if (this.settings.camera.tilt === "tactical") {
      baseY = 20.6;
      baseZ = 9.4;
    } else if (this.settings.camera.tilt === "cinematic") {
      baseY = 13.2;
      baseZ = 16.4;
    }
    return { height: baseY * zoomScale, zOffset: baseZ * zoomScale };
  }

  private syncGameplayScene(state: GameState, dt: number): void {
    const p = state.player;

    // 1. Dynamic Workday Lighting Progression
    const progress = state.elapsed / state.dayLength;
    if (progress < 0.45) {
      this._skyTmp.copy(this._skyMorning).lerp(this._skyNoon, progress / 0.45);
      this._keyTmp.copy(this._keyWarm);
    } else if (progress < 0.8) {
      this._skyTmp.copy(this._skyNoon).lerp(this._skySunset, (progress - 0.45) / 0.35);
      this._keyTmp.copy(this._keyWarm).lerp(this._keySunset, (progress - 0.45) / 0.35);
    } else {
      this._skyTmp.copy(this._skySunset).lerp(this._skyDeadline, (progress - 0.8) / 0.2);
      this._keyTmp.copy(this._keySunset).lerp(this._keyDeadline, (progress - 0.8) / 0.2);
    }

    const outageActive = state.outage > 0;
    this.scene.background = this._skyTmp;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this._skyTmp);
    }
    this.keyLight.color.copy(this._keyTmp);
    this.keyLight.intensity = outageActive ? 0.55 : 1.75;
    this.hemiLight.intensity = outageActive ? 0.42 : 0.92;
    this.office.overheadLightMat.emissiveIntensity = outageActive ? 0.15 : 1.1;

    this.setFloorTheme(state.chapter.themeColor);

    // Interactive station cues across all 8 room stations
    ALL_STATIONS.forEach((st, idx) => {
      const ring = this.office.stationRings[st.id];
      if (!ring) return;
      if (st.id === "server") {
        const mat = ring.material as THREE.MeshBasicMaterial;
        if (outageActive) {
          const flash = Math.sin(state.elapsed * 12) > 0;
          this.office.serverLedMat.color.set(flash ? "#ef4444" : "#f59e0b");
          this.office.serverLedMat.emissive.set(flash ? "#ef4444" : "#f59e0b");
          this.serverPointLight.color.set("#ef4444");
          this.serverPointLight.intensity = 2.6;
          mat.color.set("#ef4444");
          mat.opacity = 0.88;
          const s = 1 + Math.sin(state.elapsed * 8) * 0.1;
          ring.visible = true;
          ring.scale.set(s, s, 1);
        } else {
          this.office.serverLedMat.color.set("#38bdf8");
          this.office.serverLedMat.emissive.set("#38bdf8");
          this.serverPointLight.color.set("#38bdf8");
          this.serverPointLight.intensity = 1.15;
          const ready = state.stationCooldowns.server <= 0.05;
          mat.color.set("#38bdf8");
          mat.opacity = ready ? 0.65 : 0.24;
          ring.visible = true;
          const s = ready ? 1 + Math.sin(state.elapsed * 4.4) * 0.07 : 1;
          ring.scale.set(s, s, 1);
        }
        return;
      }

      const ready = state.stationCooldowns[st.id] <= 0.05;
      ring.visible = ready;
      if (ready) {
        const s = 1 + Math.sin(state.elapsed * 4.6 + idx * 0.85) * 0.08;
        ring.scale.set(s, s, 1);
      }
    });

    // 2. Sync Player 3D Rig (stride, dodge tuck, squash/stretch, attack recoil)
    this.playerRig.root.position.set(p.x, 0, p.z);
    const targetYaw = Math.atan2(-p.facingX, -p.facingZ);
    const yawDiff = Math.atan2(
      Math.sin(targetYaw - this.playerRig.root.rotation.y),
      Math.cos(targetYaw - this.playerRig.root.rotation.y)
    );
    this.playerRig.root.rotation.y += yawDiff * (1 - Math.exp(-16 * dt));

    const stride = p.moving ? Math.sin(p.strideDistance * 2.2) : 0;
    this.playerRig.leftLeg.rotation.x = stride * 0.65;
    this.playerRig.rightLeg.rotation.x = -stride * 0.65;
    this.playerRig.leftArm.rotation.x = 0.55 - stride * 0.28;
    this.playerRig.rightArm.rotation.x = 0.55 + stride * 0.28 + (p.attackFlash > 0 ? 0.35 : 0);
    this.playerRig.gearGroup.position.z = -0.42 - (p.attackFlash > 0 ? 0.14 : 0);

    // Dodge roll forward lean / spin
    if (p.dodgeTimer > 0) {
      const rollProgress = 1 - p.dodgeTimer / 0.24;
      this.playerRig.bodyGroup.rotation.x = -rollProgress * Math.PI * 2;
      this.playerRig.bodyGroup.position.y = 0.35 * Math.sin(rollProgress * Math.PI);
    } else {
      this.playerRig.bodyGroup.rotation.x = 0;
      const bob = p.moving ? Math.abs(stride) * 0.08 : Math.sin(state.elapsed * 2.4) * 0.025;
      this.playerRig.bodyGroup.position.y = bob;
    }

    const invXZ = 1 / Math.sqrt(Math.max(0.5, p.squashY));
    this.playerRig.bodyGroup.scale.set(invXZ, p.squashY, invXZ);
    this.playerRig.meetingRing.visible = state.meetingLock > 0;
    if (state.meetingLock > 0) {
      this.playerRig.meetingRing.rotation.z += dt * 3.5;
    }

    for (const mat of this.playerRig.materialsToFlash) {
      if (p.hitFlash > 0) {
        mat.emissive.set("#ffffff");
        mat.emissiveIntensity = 1.4;
      } else if (p.dodgeTimer > 0) {
        mat.emissive.set("#7dd3fc");
        mat.emissiveIntensity = 0.75;
      } else {
        mat.emissive.set(state.employee.palette.accent);
        mat.emissiveIntensity = mat === this.playerRig.materialsToFlash[1] ? 0.35 : 0;
      }
    }

    const isFps = this.settings.camera.viewMode === "fps";
    this.playerRig.root.visible = !isFps;
    this.fpsViewmodel.visible = isFps;
    this.office.fpsCeilingGroup.visible = isFps;

    // Manual / Override Aim Reticle (3rd-person only; FPS uses centered crosshair)
    this.aimReticle.visible = !isFps && this.reticleVisible && state.screen === "playing";
    if (this.aimReticle.visible) {
      this.aimReticle.position.set(this.reticleWorldX, 0.06, this.reticleWorldZ);
      this.aimReticle.rotation.y += dt * 2.4;
    }

    // 3. Gameplay Camera: First-Person (FPS) vs Smooth Damped Third-Person
    const shakeAllowed = this.settings.gameplay.screenShake;
    const shakeMag = shakeAllowed ? state.trauma * state.trauma * 0.55 : 0;

    if (isFps) {
      const targetFov =
        this.settings.camera.zoom === "close"
          ? 64
          : this.settings.camera.zoom === "wide"
          ? 84
          : 74;
      if (Math.abs(this.camera.fov - targetFov) > 0.1) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 10, dt);
        this.camera.updateProjectionMatrix();
      }

      const rollProgress = p.dodgeTimer > 0 ? 1 - p.dodgeTimer / 0.24 : 0;
      const dodgeDip = p.dodgeTimer > 0 ? Math.sin(rollProgress * Math.PI) * 0.52 : 0;
      const headBobY = p.moving && p.dodgeTimer <= 0 ? Math.sin(p.strideDistance * 2.2) * 0.055 : 0;
      const headBobX = p.moving && p.dodgeTimer <= 0 ? Math.cos(p.strideDistance * 1.1) * 0.03 : 0;

      const rightX = Math.cos(this.fpsYaw);
      const rightZ = -Math.sin(this.fpsYaw);
      const strafeVel = p.vx * rightX + p.vz * rightZ;
      const targetRoll = THREE.MathUtils.clamp(-strafeVel * 0.0045, -0.04, 0.04) + (p.dodgeTimer > 0 ? 0.12 * Math.sin(rollProgress * Math.PI) : 0);
      this.fpsRoll = THREE.MathUtils.damp(this.fpsRoll, targetRoll, 11, dt);

      const shakePitch = shakeMag > 0.004 ? (Math.random() - 0.5) * 0.07 * shakeMag : 0;
      const shakeYaw = shakeMag > 0.004 ? (Math.random() - 0.5) * 0.07 * shakeMag : 0;

      this.camera.position.set(
        p.x + rightX * headBobX,
        1.64 + headBobY - dodgeDip,
        p.z + rightZ * headBobX
      );
      this.camera.rotation.order = "YXZ";
      this.camera.rotation.set(
        this.fpsPitch + shakePitch,
        this.fpsYaw + shakeYaw,
        this.fpsRoll
      );

      // Animate FPS viewmodel sway, fire recoil, and evolved weapon glow
      if (p.attackFlash > 0) {
        this.fpsRecoil = Math.max(this.fpsRecoil, 0.065);
      } else {
        this.fpsRecoil = THREE.MathUtils.damp(this.fpsRecoil, 0, 14, dt);
      }
      const vmBobY = p.moving ? Math.abs(Math.sin(p.strideDistance * 2.2)) * 0.018 : Math.sin(state.elapsed * 2.2) * 0.006;
      const vmBobX = p.moving ? Math.cos(p.strideDistance * 1.1) * 0.014 : 0;
      this.fpsViewmodel.position.set(
        0.31 + vmBobX,
        -0.31 - vmBobY - dodgeDip * 0.22,
        -0.55 + this.fpsRecoil
      );
      this.fpsViewmodel.rotation.set(this.fpsRecoil * 2.4, 0, -this.fpsRoll * 1.4);

      if (this.fpsEmitterMat) {
        const glowColor = p.weaponEvolved ? "#fbbf24" : state.employee.palette.accent;
        this.fpsEmitterMat.color.set(glowColor);
        this.fpsEmitterMat.emissive.set(glowColor);
        this.fpsEmitterMat.emissiveIntensity = p.attackFlash > 0 ? 2.4 : p.weaponEvolved ? 1.7 : 1.15;
      }
    } else {
      if (Math.abs(this.camera.fov - 44) > 0.1) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 44, 10, dt);
        this.camera.updateProjectionMatrix();
      }
      const shakeX = shakeMag > 0.005 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
      const shakeZ = shakeMag > 0.005 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
      const framing = this.getCameraFraming();

      this._camDesired.set(
        THREE.MathUtils.clamp(p.x * 0.94, -31, 31) + shakeX,
        framing.height,
        THREE.MathUtils.clamp(p.z * 0.94 + framing.zOffset, -16, 46) + shakeZ
      );
      this._lookDesired.set(
        THREE.MathUtils.clamp(p.x * 0.96, -32, 32),
        0.8,
        THREE.MathUtils.clamp(p.z * 0.96 - 0.6, -24, 24)
      );

      const camDamp = 1 - Math.exp(-7.5 * dt);
      this.camera.position.lerp(this._camDesired, camDamp);
      this._camTarget.lerp(this._lookDesired, camDamp);
      this.camera.lookAt(this._camTarget);
    }

    // 4. Sync Enemies (including Phase II boss aura)
    const activeEnemyIds = new Set<string>();
    for (const enemy of state.enemies) {
      activeEnemyIds.add(enemy.id);
      let rig = this.enemyRigs.get(enemy.id);
      if (!rig) {
        rig = createEnemyRig(
          enemy.typeId,
          this.textures.contactShadow,
          !this.isSoftwareGl && this.settings.video.shadows
        );
        this.enemyRigs.set(enemy.id, rig);
        this.scene.add(rig.root);
      }

      rig.root.position.set(enemy.x, 0, enemy.z);
      rig.root.rotation.y = Math.atan2(-enemy.facingX, -enemy.facingZ);

      if (enemy.aiPhase === "dying") {
        const t = 1 - THREE.MathUtils.clamp(enemy.deathTimer / 0.36, 0, 1);
        rig.visual.rotation.x = t * (Math.PI * 0.48);
        const s = Math.max(0.05, 1 - t * 0.72);
        rig.visual.scale.set(s, s, s);
        rig.hpBarBg.visible = false;
        rig.nameplate.visible = false;
        rig.markRing.visible = false;
        if (rig.rallyHalo) rig.rallyHalo.visible = false;
      } else {
        rig.visual.rotation.x = 0;
        const phaseScale = enemy.boss && enemy.bossPhase === 2 ? 1.12 : 1.0;
        const windupScale = (enemy.aiPhase === "windup" ? 1.14 : 1.0) * phaseScale;
        rig.visual.scale.set(
          windupScale,
          (enemy.aiPhase === "windup" ? 0.86 : 1.0) * phaseScale,
          windupScale
        );
        rig.visual.position.y = Math.abs(Math.sin(enemy.walkPhase)) * (enemy.boss ? 0.06 : 0.09);

        if (rig.leftLeg && rig.rightLeg) {
          const swing = Math.sin(enemy.walkPhase) * 0.56;
          rig.leftLeg.rotation.x = swing;
          rig.rightLeg.rotation.x = -swing;
        }
        if (rig.leftArm && rig.rightArm) {
          const armSwing = Math.sin(enemy.walkPhase) * 0.22;
          if (rig.leftArm.userData.baseRotX === undefined) {
            rig.leftArm.userData.baseRotX = rig.leftArm.rotation.x;
            rig.rightArm.userData.baseRotX = rig.rightArm.rotation.x;
          }
          const castLift =
            enemy.castTimer > 0
              ? Math.sin(THREE.MathUtils.clamp(enemy.castTimer / 0.36, 0, 1) * Math.PI) * 1.05
              : 0;
          rig.leftArm.rotation.x = (rig.leftArm.userData.baseRotX as number) - armSwing + castLift * 0.55;
          rig.rightArm.rotation.x = (rig.rightArm.userData.baseRotX as number) + armSwing + castLift;
        }
        if (rig.wingLeft && rig.wingRight) {
          const flap = Math.sin(enemy.walkPhase * 3.5) * 0.55;
          rig.wingLeft.rotation.z = flap;
          rig.wingRight.rotation.z = -flap;
        }
        if (rig.halo) {
          rig.halo.rotation.z += dt * (enemy.bossPhase === 2 ? 5.2 : 2.4);
        }
        if (rig.rankRing) {
          rig.rankRing.rotation.z += dt * (enemy.boss ? 1.8 : 1.1);
        }
        if (rig.rallyHalo) {
          rig.rallyHalo.visible = enemy.rallyTimer > 0;
          if (rig.rallyHalo.visible) {
            rig.rallyHalo.rotation.z -= dt * 3.2;
          }
        }

        rig.flashMaterials.forEach((mat, idx) => {
          if (enemy.hitFlash > 0) {
            mat.emissive.set("#ffffff");
            mat.emissiveIntensity = 1.8;
          } else if (enemy.aiPhase === "windup" || (enemy.boss && enemy.bossPhase === 2)) {
            mat.emissive.set("#ef4444");
            mat.emissiveIntensity = enemy.aiPhase === "windup" ? 0.95 : 0.55;
          } else if (enemy.castTimer > 0 && idx === 1) {
            mat.emissive.copy(rig.baseEmissives[idx]);
            mat.emissiveIntensity = 1.15;
          } else {
            mat.emissive.copy(rig.baseEmissives[idx]);
            mat.emissiveIntensity = idx === 1 ? 0.45 : 0;
          }
        });

        const distToPlayer = Math.hypot(enemy.x - p.x, enemy.z - p.z);
        const showNameplate =
          enemy.boss ||
          enemy.elite ||
          distToPlayer < (enemy.policy === "lead_buffer" || enemy.policy === "lead_spawner" || enemy.policy === "hr_silencer" || enemy.policy === "shield_auditor" ? 32 : 23);
        rig.nameplate.visible = showNameplate;

        const ratio = THREE.MathUtils.clamp(enemy.hp / enemy.maxHp, 0, 1);
        rig.hpBarBg.visible = ratio < 0.995 || ((enemy.elite || enemy.boss) && distToPlayer < 24);
        if (rig.hpBarBg.visible) {
          rig.hpBarBg.lookAt(this.camera.position);
          rig.hpBarFill.scale.x = Math.max(0.01, ratio);
          const halfBar = (enemy.boss ? 2.54 : enemy.elite ? 1.69 : enemy.policy === "lead_buffer" || enemy.policy === "lead_spawner" || enemy.policy === "hr_silencer" || enemy.policy === "shield_auditor" ? 1.34 : 1.06) * 0.5;
          rig.hpBarFill.position.x = -(1 - ratio) * halfBar;
        }

        rig.markRing.visible = enemy.markedTimer > 0;
        if (rig.markRing.visible) rig.markRing.rotation.z += dt * 3;
      }
    }

    for (const [id, rig] of this.enemyRigs.entries()) {
      if (!activeEnemyIds.has(id)) {
        this.scene.remove(rig.root);
        this.enemyRigs.delete(id);
      }
    }

    // 5. Sync Pickups
    const activePickups = new Set<string>();
    for (const pk of state.pickups) {
      activePickups.add(pk.id);
      let mesh = this.pickupMeshes.get(pk.id);
      if (!mesh) {
        mesh = createPickupMesh(pk.kind, this.textures.contactShadow);
        this.pickupMeshes.set(pk.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(pk.x, 0, pk.z);
      const prop = mesh.userData.prop as THREE.Group | undefined;
      if (prop) {
        prop.position.y = 0.56 + Math.sin(pk.bob) * 0.14;
        prop.rotation.y += dt * 2.2;
      }
    }
    for (const [id, mesh] of this.pickupMeshes.entries()) {
      if (!activePickups.has(id)) {
        this.scene.remove(mesh);
        this.pickupMeshes.delete(id);
      }
    }

    // 6. Sync Drones
    const activeDrones = new Set<string>();
    for (const dr of state.drones) {
      activeDrones.add(dr.id);
      let mesh = this.droneMeshes.get(dr.id);
      if (!mesh) {
        mesh = createDroneMesh();
        this.droneMeshes.set(dr.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(dr.x, 1.55 + Math.sin(state.elapsed * 6) * 0.12, dr.z);
      mesh.rotation.y += dt * 4.5;
    }
    for (const [id, mesh] of this.droneMeshes.entries()) {
      if (!activeDrones.has(id)) {
        this.scene.remove(mesh);
        this.droneMeshes.delete(id);
      }
    }

    // 7. Sync Dynamic Floor Hazards
    const activeHazards = new Set<string>();
    for (const hz of state.hazards) {
      activeHazards.add(hz.id);
      let mesh = this.hazardMeshes.get(hz.id);
      if (!mesh) {
        mesh = this.createHazardVisual(hz);
        this.hazardMeshes.set(hz.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(hz.x, 0.04, hz.z);
      if (hz.kind === "runaway_chair") {
        mesh.rotation.y += dt * 7.5;
      } else if (hz.kind === "heat_vent") {
        const activeCore = mesh.userData.core as THREE.Mesh | undefined;
        if (activeCore) {
          const hot = hz.elapsed > 1.2;
          const s = hot ? 0.95 + Math.sin(state.elapsed * 18) * 0.1 : 0.35 + (hz.elapsed / 1.2) * 0.55;
          activeCore.scale.set(s, s, 1);
        }
      }
    }
    for (const [id, mesh] of this.hazardMeshes.entries()) {
      if (!activeHazards.has(id)) {
        this.scene.remove(mesh);
        this.hazardMeshes.delete(id);
      }
    }

    // 8. Sync Ground Telegraphs & Stasis Fields
    const activeTelegraphs = new Set<string>();
    for (const tg of state.telegraphs) {
      activeTelegraphs.add(tg.id);
      let grp = this.telegraphMeshes.get(tg.id);
      if (!grp) {
        grp = this.createTelegraphVisual(tg);
        this.telegraphMeshes.set(tg.id, grp);
        this.scene.add(grp);
      }
      const frac = THREE.MathUtils.clamp(tg.elapsed / tg.duration, 0.05, 1);
      if (tg.kind === "lunge_line") {
        grp.position.set(tg.x, 0.05, tg.z);
        grp.rotation.y = Math.atan2(tg.dirX, tg.dirZ);
        const fill = grp.userData.fill as THREE.Mesh;
        fill.scale.set(1, frac, 1);
      } else {
        grp.position.set(tg.x, 0.05, tg.z);
        const fill = grp.userData.fill as THREE.Mesh;
        if (tg.kind === "stasis_field") {
          grp.rotation.y += dt * 1.4;
          fill.scale.set(1, 1, 1);
        } else {
          fill.scale.set(frac, frac, 1);
        }
      }
    }
    for (const [id, grp] of this.telegraphMeshes.entries()) {
      if (!activeTelegraphs.has(id)) {
        this.scene.remove(grp);
        this.telegraphMeshes.delete(id);
      }
    }

    // 9. Sync Projectiles: 3D Office Weapons (Player) + 10 Distinct 3D Corporate Projectiles (Enemies) + InstancedMesh (Drones)
    const activeWeaponShots = new Set<string>();
    const activeEnemyShots = new Set<string>();
    let instIdx = 0;
    for (let i = 0; i < state.projectiles.length; i += 1) {
      const shot = state.projectiles[i];
      if (!shot.fromEnemy && shot.weaponId) {
        activeWeaponShots.add(shot.id);
        let mesh = this.weaponProjectileMeshes.get(shot.id);
        if (!mesh) {
          mesh = buildOfficeWeaponMesh(shot.weaponId, "projectile", Boolean(shot.evolved));
          this.scene.add(mesh);
          this.weaponProjectileMeshes.set(shot.id, mesh);
        }
        mesh.position.set(shot.x, 1.08, shot.z);
        const sc = shot.evolved ? 1.25 : shot.crit ? 1.16 : 1.0;
        mesh.scale.setScalar(sc);
        mesh.rotation.set(state.elapsed * 7, state.elapsed * 13, state.elapsed * 4);
      } else if (shot.fromEnemy && shot.enemyKind) {
        activeEnemyShots.add(shot.id);
        let mesh = this.enemyProjectileMeshes.get(shot.id);
        if (!mesh) {
          mesh = buildEnemyProjectileMesh(shot.enemyKind);
          this.scene.add(mesh);
          this.enemyProjectileMeshes.set(shot.id, mesh);
        }
        let y = 1.04 + Math.sin(state.elapsed * 9 + i) * 0.05;
        if (shot.arcHeight && shot.arcHeight > 0) {
          const maxT = Math.max(0.1, shot.maxTtl || 1);
          const progress = THREE.MathUtils.clamp(1 - shot.ttl / maxT, 0, 1);
          y = 0.72 + Math.sin(progress * Math.PI) * shot.arcHeight;
        }
        mesh.position.set(shot.x, y, shot.z);

        const kind = shot.enemyKind;
        if (kind === "coffee_cup") {
          mesh.rotation.set(state.elapsed * 8.5, Math.atan2(shot.vx, shot.vz), state.elapsed * 4.5);
        } else if (kind === "firewall_disc") {
          mesh.rotation.set(0, state.elapsed * 16, 0);
        } else if (kind === "server_blade" || kind === "exec_directive" || kind === "code_review") {
          const heading = Math.atan2(shot.vx, shot.vz);
          mesh.rotation.set(0, heading, Math.sin(state.elapsed * 11 + i) * 0.35);
        } else {
          // Flat spinning frisbee glide for spreadsheets, kanban cards, policy memos, calendar invites & audit ledgers
          mesh.rotation.set(0.16, state.elapsed * 9.5, Math.sin(state.elapsed * 6 + i) * 0.14);
        }
      } else if (instIdx < MAX_PROJECTILES) {
        this._dummy.position.set(shot.x, 1.02, shot.z);
        const sc = shot.fromEnemy ? 1.25 : shot.evolved ? 1.38 : shot.crit ? 1.25 : 0.92;
        this._dummy.scale.set(sc, sc, sc);
        this._dummy.rotation.set(state.elapsed * 8, state.elapsed * 10, 0);
        this._dummy.updateMatrix();
        this.projectileMesh.setMatrixAt(instIdx, this._dummy.matrix);
        this._projColor.set(shot.color);
        this.projectileMesh.setColorAt(instIdx, this._projColor);
        instIdx += 1;
      }
    }
    for (const [id, mesh] of this.weaponProjectileMeshes.entries()) {
      if (!activeWeaponShots.has(id)) {
        this.scene.remove(mesh);
        this.weaponProjectileMeshes.delete(id);
      }
    }
    for (const [id, mesh] of this.enemyProjectileMeshes.entries()) {
      if (!activeEnemyShots.has(id)) {
        this.scene.remove(mesh);
        this.enemyProjectileMeshes.delete(id);
      }
    }
    for (let i = instIdx; i < MAX_PROJECTILES; i += 1) {
      this._dummy.scale.set(0, 0, 0);
      this._dummy.updateMatrix();
      this.projectileMesh.setMatrixAt(i, this._dummy.matrix);
    }
    this.projectileMesh.instanceMatrix.needsUpdate = true;
    if (this.projectileMesh.instanceColor) {
      this.projectileMesh.instanceColor.needsUpdate = true;
    }

    // 10. Sync Pooled Instanced Magnetic XP Orbs
    const orbCount = Math.min(state.xpOrbs.length, MAX_ORBS);
    for (let i = 0; i < MAX_ORBS; i += 1) {
      if (i < orbCount) {
        const orb = state.xpOrbs[i];
        this._dummy.position.set(orb.x, 0.52 + Math.sin(orb.bob) * 0.14, orb.z);
        const sc = orb.xp >= 35 ? 1.15 : 0.85;
        this._dummy.scale.set(sc, sc, sc);
        this._dummy.rotation.set(orb.bob * 0.6, orb.bob * 1.1, 0);
        this._dummy.updateMatrix();
        this.orbMesh.setMatrixAt(i, this._dummy.matrix);
        this._orbColor.set(orb.color);
        this.orbMesh.setColorAt(i, this._orbColor);
      } else {
        this._dummy.scale.set(0, 0, 0);
        this._dummy.updateMatrix();
        this.orbMesh.setMatrixAt(i, this._dummy.matrix);
      }
    }
    this.orbMesh.instanceMatrix.needsUpdate = true;
    if (this.orbMesh.instanceColor) {
      this.orbMesh.instanceColor.needsUpdate = true;
    }
  }

  private createHazardVisual(hz: FloorHazardEntity): THREE.Group {
    const grp = new THREE.Group();
    if (hz.kind === "coffee_spill") {
      const puddle = new THREE.Mesh(
        new THREE.CircleGeometry(hz.radius, 24),
        new THREE.MeshBasicMaterial({
          color: "#5c3419",
          transparent: true,
          opacity: 0.72,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      puddle.rotation.x = -Math.PI / 2;
      const sheen = new THREE.Mesh(
        new THREE.RingGeometry(hz.radius * 0.78, hz.radius, 24),
        new THREE.MeshBasicMaterial({
          color: "#b45309",
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      sheen.rotation.x = -Math.PI / 2;
      grp.add(puddle, sheen);
    } else if (hz.kind === "heat_vent") {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(hz.radius - 0.16, hz.radius, 24),
        new THREE.MeshBasicMaterial({
          color: "#fb923c",
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      ring.rotation.x = -Math.PI / 2;
      const core = new THREE.Mesh(
        new THREE.CircleGeometry(hz.radius * 0.9, 24),
        new THREE.MeshBasicMaterial({
          color: "#f97316",
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      core.rotation.x = -Math.PI / 2;
      grp.add(ring, core);
      grp.userData.core = core;
    } else {
      // Composite runaway swivel chair
      const darkMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.5 });
      const steelMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.8, roughness: 0.25 });
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.72), darkMat);
      seat.position.y = 0.5;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.65, 0.12), darkMat);
      back.position.set(0, 0.86, 0.32);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.42, 0.45, 5), steelMat);
      base.position.y = 0.22;
      grp.add(seat, back, base);
    }
    return grp;
  }

  private createTelegraphVisual(tg: TelegraphEntity): THREE.Group {
    const grp = new THREE.Group();
    if (tg.kind === "lunge_line") {
      const outline = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, tg.length),
        new THREE.MeshBasicMaterial({
          color: tg.color,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      outline.rotation.x = -Math.PI / 2;
      outline.position.z = tg.length / 2;

      const fill = new THREE.Mesh(
        new THREE.PlaneGeometry(0.95, tg.length),
        new THREE.MeshBasicMaterial({
          color: tg.color,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      fill.rotation.x = -Math.PI / 2;
      fill.position.z = tg.length / 2;
      grp.add(outline, fill);
      grp.userData.fill = fill;
    } else {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(tg.radius - 0.14, tg.radius, 36),
        new THREE.MeshBasicMaterial({
          color: tg.color,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      ring.rotation.x = -Math.PI / 2;

      const fill = new THREE.Mesh(
        new THREE.CircleGeometry(tg.radius, 36),
        new THREE.MeshBasicMaterial({
          color: tg.color,
          transparent: true,
          opacity: tg.kind === "stasis_field" ? 0.2 : 0.3,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      fill.rotation.x = -Math.PI / 2;
      grp.add(ring, fill);
      grp.userData.fill = fill;
    }
    return grp;
  }

  private updateParticles(dt: number): void {
    let anyActive = false;
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      const slot = this.particles[i];
      if (!slot.active) {
        this._dummy.scale.set(0, 0, 0);
        this._dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, this._dummy.matrix);
        continue;
      }
      anyActive = true;
      slot.life -= dt;
      if (slot.life <= 0) {
        slot.active = false;
        this._dummy.scale.set(0, 0, 0);
        this._dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, this._dummy.matrix);
        continue;
      }

      slot.x += slot.vx * dt;
      slot.y = Math.max(0.08, slot.y + slot.vy * dt);
      slot.z += slot.vz * dt;
      slot.vy -= 11.5 * dt;
      const damp = Math.exp(-3.2 * dt);
      slot.vx *= damp;
      slot.vz *= damp;

      const s = slot.scale * (slot.life / slot.ttl);
      this._dummy.position.set(slot.x, slot.y, slot.z);
      this._dummy.scale.set(s, s, s);
      this._dummy.rotation.set(slot.life * 8, slot.life * 6, 0);
      this._dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this._dummy.matrix);
      this.particleMesh.setColorAt(i, slot.color);
    }

    if (anyActive || this.particleMesh.instanceMatrix.needsUpdate) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) {
        this.particleMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  public startLoop(tick: (dt: number) => void): void {
    let prev = performance.now();
    let lastDraw = 0;

    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          this.loopId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.loopId = window.setTimeout(cb, 80);
        }
      };
      this.loopId = window.setTimeout(poll, 5);
    };

    const step = () => {
      if (this.disposed) return;
      const now = performance.now();

      if (!this.isSoftwareGl && this.settings.video.fpsCap > 0) {
        const minInterval = 1000 / this.settings.video.fpsCap;
        if (now - lastDraw < minInterval - 1.5) {
          this.loopId = requestAnimationFrame(step);
          return;
        }
      }

      const dt = Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      lastDraw = now;
      tick(dt);
      if (this.isSoftwareGl) {
        afterDraw(step);
      } else {
        this.loopId = requestAnimationFrame(step);
      }
    };

    step();
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.loopId);
    clearTimeout(this.loopId);
    this.textures.dispose();
    this.renderer.dispose();
  }
}
