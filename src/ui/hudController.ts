import {
  ALL_STATIONS,
  CLASS_MAP,
  computeEffectiveStartingStats,
  DIFFICULTIES,
  DIFFICULTY_MAP,
  EMPLOYEE_CLASSES,
  ENEMY_ARCHETYPES,
  getChapterForDay,
  getMaxUnlockedDay,
  getRoomById,
  getShopItemCost,
  HIERARCHY_LIST,
  OFFICE_ROOMS,
  OFFICE_WEAPON_MAP,
  OFFICE_WEAPONS,
  SHOP_ITEMS,
  STORY_CHAPTERS
} from "../game/data";
import {
  formatWorkClock,
  getFlowMultiplier,
  getPhaseLabel
} from "../game/rules";
import {
  formatKeyLabel,
  KEY_ACTION_META
} from "../game/settings";
import type {
  AimMode,
  CameraTiltPreset,
  CameraViewMode,
  CameraZoomPreset,
  DifficultyId,
  EmployeeClassId,
  EnemyTypeId,
  GameSettings,
  GameState,
  GraphicsQuality,
  KeyAction,
  OfficeWeaponId,
  SaveData
} from "../game/types";
import type { WorldRenderer } from "../scene/worldRenderer";
import { CampusMinimap } from "./minimap";
import {
  getEmployeePortraitSvg,
  getEnemyPortraitSvg,
  getPortraitForId,
  getWeaponIconSvg
} from "./portraits";

export interface HudCallbacks {
  onSelectClass: (id: EmployeeClassId) => void;
  onSelectWeapon: (id: OfficeWeaponId) => void;
  onSelectDay: (day: number) => void;
  onSelectDifficulty: (diff: DifficultyId) => void;
  onBuyUpgrade: (itemId: string) => void;
  onStartWorkday: () => void;
  onResetSave: () => void;
  onClaimQueuedPerk: () => void;
  onPickPerk: (perkId: string) => void;
  onRerollPerks: () => void;
  onDeferPerk: () => void;
  onPickDilemma: (choiceId: string) => void;
  onTriggerDodge: () => void;
  onTriggerSkill: () => void;
  onToggleViewMode: () => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestartDay: () => void;
  onReturnLobby: (openShopTab?: boolean) => void;
  onSettingsChanged: (next: GameSettings, playPreviewTick?: boolean) => void;
  onResetSettings: () => void;
  onStartRebind: (action: KeyAction) => void;
  onSettingsOpenChange: (open: boolean) => void;
}

export class HudController {
  private readonly callbacks: HudCallbacks;
  private toastTimer = 0;
  private commsTimer = 0;
  private lastScreen = "";
  private renderedPerkKey = "";
  private renderedDilemmaKey = "";
  private renderedSummaryKey = "";
  private settingsOpen = false;
  private directoryOpen = false;
  private directoryPopulated = false;
  private listeningAction: KeyAction | null = null;
  private currentSettings: GameSettings;
  private isSoftwareGl = false;
  private lastHeroPortraitClass = "";
  private lastBossPortraitId = "";
  private lastStatusKey = "";
  private readonly minimap: CampusMinimap;

  // Cached DOM refs
  private readonly hudHeroPortrait = document.getElementById("hudHeroPortrait")!;
  private readonly hudHeroName = document.getElementById("hudHeroName")!;
  private readonly hudHeroLevel = document.getElementById("hudHeroLevel")!;
  private readonly hudEnergyText = document.getElementById("hudEnergyText")!;
  private readonly hudEnergyFill = document.getElementById("hudEnergyFill")!;
  private readonly hudEnergyGhost = document.getElementById("hudEnergyGhost")!;
  private readonly hudWeaponLabel = document.getElementById("hudWeaponLabel")!;
  private readonly hudFocusText = document.getElementById("hudFocusText")!;
  private readonly hudProdText = document.getElementById("hudProdText")!;
  private readonly hudXpFill = document.getElementById("hudXpFill")!;
  private readonly hudStatusRow = document.getElementById("hudStatusRow")!;
  private readonly hudDayLabel = document.getElementById("hudDayLabel")!;
  private readonly hudClockText = document.getElementById("hudClockText")!;
  private readonly hudPhaseText = document.getElementById("hudPhaseText")!;
  private readonly hudRoomPlate = document.getElementById("hudRoomPlate")!;
  private readonly hudSalaryText = document.getElementById("hudSalaryText")!;
  private readonly hudFlowText = document.getElementById("hudFlowText")!;
  private readonly minimapRoomName = document.getElementById("minimapRoomName")!;
  private readonly minimapFloorLabel = document.getElementById("minimapFloorLabel")!;

  private readonly hudDodgeKey = document.getElementById("hudDodgeKey")!;
  private readonly hudDodgeStatus = document.getElementById("hudDodgeStatus")!;
  private readonly hudDodgeFill = document.getElementById("hudDodgeFill")!;
  private readonly dodgeSlotButton = document.getElementById("dodgeSlotButton")!;

  private readonly hudSkillKey = document.getElementById("hudSkillKey")!;
  private readonly hudSkillName = document.getElementById("hudSkillName")!;
  private readonly hudSkillStatus = document.getElementById("hudSkillStatus")!;
  private readonly hudSkillFill = document.getElementById("hudSkillFill")!;
  private readonly skillSlotButton = document.getElementById("skillSlotButton")!;

  private readonly claimPerkButton = document.getElementById("claimPerkButton")!;
  private readonly hudClaimKey = document.getElementById("hudClaimKey")!;
  private readonly hudClaimLabel = document.getElementById("hudClaimLabel")!;
  private readonly hudClaimCount = document.getElementById("hudClaimCount")!;

  private readonly stationHint = document.getElementById("stationHint")!;
  private readonly bossBarWrap = document.getElementById("bossBarWrap")!;
  private readonly bossPortrait = document.getElementById("bossPortrait")!;
  private readonly bossNameText = document.getElementById("bossNameText")!;
  private readonly bossHpText = document.getElementById("bossHpText")!;
  private readonly bossHpFill = document.getElementById("bossHpFill")!;
  private readonly dangerVignette = document.getElementById("dangerVignette")!;
  private readonly floaterLayer = document.getElementById("floaterLayer")!;
  private readonly toastBanner = document.getElementById("toastBanner")!;

  private readonly commsCard = document.getElementById("commsCard")!;
  private readonly commsAvatar = document.getElementById("commsAvatar")!;
  private readonly commsSpeaker = document.getElementById("commsSpeaker")!;
  private readonly commsRole = document.getElementById("commsRole")!;
  private readonly commsMessage = document.getElementById("commsMessage")!;

  // Title panel refs
  private readonly titleDayMeta = document.getElementById("titleDayMeta")!;
  private readonly titleBankMeta = document.getElementById("titleBankMeta")!;
  private readonly daySelector = document.getElementById("daySelector")!;
  private readonly titleChapterName = document.getElementById("titleChapterName")!;
  private readonly titleChapterBrief = document.getElementById("titleChapterBrief")!;
  private readonly difficultyTagline = document.getElementById("difficultyTagline")!;
  private readonly difficultySelector = document.getElementById("difficultySelector")!;
  private readonly tabRoster = document.getElementById("tabRoster")!;
  private readonly tabArsenal = document.getElementById("tabArsenal")!;
  private readonly tabShop = document.getElementById("tabShop")!;
  private readonly rosterPane = document.getElementById("rosterPane")!;
  private readonly arsenalPane = document.getElementById("arsenalPane")!;
  private readonly shopPane = document.getElementById("shopPane")!;
  private readonly classGrid = document.getElementById("classGrid")!;
  private readonly dossierPortrait = document.getElementById("dossierPortrait")!;
  private readonly dossierName = document.getElementById("dossierName")!;
  private readonly dossierRole = document.getElementById("dossierRole")!;
  private readonly dossierWeaponName = document.getElementById("dossierWeaponName")!;
  private readonly dossierWeaponDesc = document.getElementById("dossierWeaponDesc")!;
  private readonly dossierSwitchWeaponBtn = document.getElementById("dossierSwitchWeaponBtn")!;
  private readonly dossierSkillName = document.getElementById("dossierSkillName")!;
  private readonly dossierSkillDesc = document.getElementById("dossierSkillDesc")!;
  private readonly effectiveStatsStrip = document.getElementById("effectiveStatsStrip")!;
  private readonly arsenalSelectedBar = document.getElementById("arsenalSelectedBar")!;
  private readonly weaponGrid = document.getElementById("weaponGrid")!;
  private readonly shopBankText = document.getElementById("shopBankText")!;
  private readonly shopGrid = document.getElementById("shopGrid")!;
  private readonly titleControlsHint = document.getElementById("titleControlsHint")!;

  // Modal refs
  private readonly upgradeModal = document.getElementById("upgradeModal")!;
  private readonly upgradeKicker = document.getElementById("upgradeKicker")!;
  private readonly rerollPerksButton = document.getElementById("rerollPerksButton")!;
  private readonly perkChoices = document.getElementById("perkChoices")!;
  private readonly dilemmaModal = document.getElementById("dilemmaModal")!;
  private readonly dilemmaSender = document.getElementById("dilemmaSender")!;
  private readonly dilemmaTitle = document.getElementById("dilemmaTitle")!;
  private readonly dilemmaPrompt = document.getElementById("dilemmaPrompt")!;
  private readonly dilemmaChoices = document.getElementById("dilemmaChoices")!;
  private readonly pauseModal = document.getElementById("pauseModal")!;
  private readonly pauseSummary = document.getElementById("pauseSummary")!;
  private readonly resultModal = document.getElementById("resultModal")!;
  private readonly resultKicker = document.getElementById("resultKicker")!;
  private readonly resultTitle = document.getElementById("resultTitle")!;
  private readonly resultEpilogue = document.getElementById("resultEpilogue")!;
  private readonly resultStats = document.getElementById("resultStats")!;
  private readonly resultAchievements = document.getElementById("resultAchievements")!;
  private readonly playAgainButton = document.getElementById("playAgainButton")!;

  // Corporate Directory modal refs
  private readonly directoryModal = document.getElementById("directoryModal")!;
  private readonly directoryHierarchyPane = document.getElementById("directoryHierarchyPane")!;
  private readonly directoryRoomsPane = document.getElementById("directoryRoomsPane")!;
  private readonly directoryHierarchyList = document.getElementById("directoryHierarchyList")!;
  private readonly directoryRoomsList = document.getElementById("directoryRoomsList")!;

  // Settings modal refs
  private readonly settingsModal = document.getElementById("settingsModal")!;
  private readonly optMasterVol = document.getElementById("optMasterVol") as HTMLInputElement;
  private readonly optMasterVolVal = document.getElementById("optMasterVolVal")!;
  private readonly optSfxVol = document.getElementById("optSfxVol") as HTMLInputElement;
  private readonly optSfxVolVal = document.getElementById("optSfxVolVal")!;
  private readonly optUiVol = document.getElementById("optUiVol") as HTMLInputElement;
  private readonly optUiVolVal = document.getElementById("optUiVolVal")!;
  private readonly optMuted = document.getElementById("optMuted")!;
  private readonly optShadows = document.getElementById("optShadows")!;
  private readonly optShadowsHint = document.getElementById("optShadowsHint")!;
  private readonly optMouseSens = document.getElementById("optMouseSens") as HTMLInputElement;
  private readonly optMouseSensVal = document.getElementById("optMouseSensVal")!;
  private readonly optScreenShake = document.getElementById("optScreenShake")!;
  private readonly optHitstop = document.getElementById("optHitstop")!;
  private readonly optDamageNumbers = document.getElementById("optDamageNumbers")!;
  private readonly keybindList = document.getElementById("keybindList")!;

  private readonly viewModeButton = document.getElementById("viewModeButton")!;
  private readonly fpsCrosshair = document.getElementById("fpsCrosshair")!;
  private readonly soundWaves = document.getElementById("soundWaves")!;
  private readonly soundMuteLine = document.getElementById("soundMuteLine")!;

  constructor(callbacks: HudCallbacks, initialSettings: GameSettings, isSoftwareGl: boolean) {
    this.callbacks = callbacks;
    this.currentSettings = initialSettings;
    this.isSoftwareGl = isSoftwareGl;
    const minimapCanvas = document.getElementById("minimapCanvas") as HTMLCanvasElement;
    this.minimap = new CampusMinimap(minimapCanvas);
    this.bindStaticControls();
    this.syncSettingsUi(initialSettings, null);
  }

  public isSettingsOpen(): boolean {
    return this.settingsOpen;
  }

  public openSettings(tab: "audio" | "video" | "gameplay" | "controls" = "audio"): void {
    this.settingsOpen = true;
    this.settingsModal.hidden = false;
    this.setSettingsTab(tab);
    this.syncSettingsUi(this.currentSettings, this.listeningAction);
    this.callbacks.onSettingsOpenChange(true);
  }

  public closeSettings(): void {
    if (!this.settingsOpen) return;
    this.settingsOpen = false;
    this.listeningAction = null;
    this.settingsModal.hidden = true;
    this.callbacks.onSettingsOpenChange(false);
  }

  private setSettingsTab(tab: "audio" | "video" | "gameplay" | "controls"): void {
    const panes: Record<string, HTMLElement> = {
      audio: document.getElementById("settingsPaneAudio")!,
      video: document.getElementById("settingsPaneVideo")!,
      gameplay: document.getElementById("settingsPaneGameplay")!,
      controls: document.getElementById("settingsPaneControls")!
    };
    document.querySelectorAll<HTMLButtonElement>("[data-settings-tab]").forEach((btn) => {
      const active = btn.dataset.settingsTab === tab;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    for (const [key, pane] of Object.entries(panes)) {
      pane.hidden = key !== tab;
    }
  }

  public isDirectoryOpen(): boolean {
    return this.directoryOpen;
  }

  public openDirectory(tab: "hierarchy" | "rooms" = "hierarchy"): void {
    if (!this.directoryPopulated) {
      this.populateDirectory();
      this.directoryPopulated = true;
    }
    this.directoryOpen = true;
    this.directoryModal.hidden = false;
    this.setDirectoryTab(tab);
  }

  public closeDirectory(): void {
    if (!this.directoryOpen) return;
    this.directoryOpen = false;
    this.directoryModal.hidden = true;
  }

  private setDirectoryTab(tab: "hierarchy" | "rooms"): void {
    document.querySelectorAll<HTMLButtonElement>("[data-dir-tab]").forEach((btn) => {
      const active = btn.dataset.dirTab === tab;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    this.directoryHierarchyPane.hidden = tab !== "hierarchy";
    this.directoryRoomsPane.hidden = tab !== "rooms";
  }

  private populateDirectory(): void {
    const tierTitles: Record<1 | 2 | 3 | 4, string> = {
      1: "Tier 1 · Frontline Chaos & Junior Staff",
      2: "Tier 2 · Functional Leads & Specialists",
      3: "Tier 3 · Middle & Senior Management (Elites)",
      4: "Tier 4 · C-Suite Floor Bosses (2-Phase Encounters)"
    };
    this.directoryHierarchyList.innerHTML = "";
    for (const tier of [1, 2, 3, 4] as const) {
      const members = HIERARCHY_LIST.filter((e) => e.rankTier === tier);
      const section = document.createElement("section");
      section.className = "dir-tier-section";
      const gridHtml = members
        .map(
          (m) => `
          <div class="dir-card${m.boss ? " is-boss" : ""}">
            <div class="dir-portrait">${getEnemyPortraitSvg(m.id)}</div>
            <div class="dir-card-body">
              <div class="dir-card-title">
                <strong>${m.name}</strong>
                <span class="dir-card-dept mono">${m.department}</span>
              </div>
              <div class="dir-card-badge mono">${m.titleBadge}</div>
              <p class="dir-card-trait">${m.traitSummary}</p>
            </div>
          </div>`
        )
        .join("");
      section.innerHTML = `<h3>${tierTitles[tier]}</h3><div class="dir-tier-grid">${gridHtml}</div>`;
      this.directoryHierarchyList.appendChild(section);
    }

    const stationMap = new Map(ALL_STATIONS.map((s) => [s.id, s]));
    this.directoryRoomsList.innerHTML = OFFICE_ROOMS.map((room) => {
      const st = room.stationId ? stationMap.get(room.stationId) : undefined;
      return `
        <div class="dir-room-card" style="border-left-color:${room.accentColor}">
          <div class="dir-room-head">
            <strong>${room.name}</strong>
            <span class="dir-room-dept mono">${room.department}</span>
          </div>
          ${
            st
              ? `<div class="dir-room-station mono">Station: ${st.label}</div>`
              : room.id === "ceo_suite"
              ? `<div class="dir-room-station mono">Executive Arena · C-Suite Showdowns</div>`
              : `<div class="dir-room-station mono">Hub · Multi-Wing Crossroads</div>`
          }
          <p class="dir-room-desc">${room.tacticalSummary}</p>
        </div>
      `;
    }).join("");
  }

  private bindStaticControls(): void {
    this.tabRoster.addEventListener("click", () => this.setTitleTab("roster"));
    this.tabArsenal.addEventListener("click", () => this.setTitleTab("arsenal"));
    this.tabShop.addEventListener("click", () => this.setTitleTab("shop"));
    this.dossierSwitchWeaponBtn.addEventListener("click", () => this.setTitleTab("arsenal"));

    document.getElementById("startButton")!.addEventListener("click", (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.callbacks.onStartWorkday();
    });

    document.getElementById("resetButton")!.addEventListener("click", () => {
      this.callbacks.onResetSave();
    });

    document.getElementById("titleDirectoryButton")!.addEventListener("click", () => {
      this.openDirectory("hierarchy");
    });
    document.getElementById("closeDirectoryTop")!.addEventListener("click", () => this.closeDirectory());
    document.getElementById("doneDirectoryButton")!.addEventListener("click", () => this.closeDirectory());
    document.querySelectorAll<HTMLButtonElement>("[data-dir-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.dataset.dirTab as "hierarchy" | "rooms";
        this.setDirectoryTab(t);
      });
    });

    document.getElementById("titleSettingsButton")!.addEventListener("click", () => {
      this.openSettings("audio");
    });

    document.getElementById("pauseSettingsButton")!.addEventListener("click", () => {
      this.openSettings("audio");
    });

    document.getElementById("closeSettingsTop")!.addEventListener("click", () => this.closeSettings());
    document.getElementById("doneSettingsButton")!.addEventListener("click", () => this.closeSettings());
    document.getElementById("resetSettingsButton")!.addEventListener("click", () => {
      this.callbacks.onResetSettings();
    });

    document.querySelectorAll<HTMLButtonElement>("[data-settings-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.dataset.settingsTab as "audio" | "video" | "gameplay" | "controls";
        this.setSettingsTab(t);
      });
    });

    // Audio Sliders & Mute Toggle
    this.optMasterVol.addEventListener("input", () => {
      const val = Number(this.optMasterVol.value) / 100;
      this.optMasterVolVal.textContent = `${this.optMasterVol.value}%`;
      this.currentSettings.audio.masterVolume = val;
      this.callbacks.onSettingsChanged(this.currentSettings, false);
    });
    this.optMasterVol.addEventListener("change", () => {
      this.callbacks.onSettingsChanged(this.currentSettings, true);
    });

    this.optSfxVol.addEventListener("input", () => {
      const val = Number(this.optSfxVol.value) / 100;
      this.optSfxVolVal.textContent = `${this.optSfxVol.value}%`;
      this.currentSettings.audio.sfxVolume = val;
      this.callbacks.onSettingsChanged(this.currentSettings, false);
    });
    this.optSfxVol.addEventListener("change", () => {
      this.callbacks.onSettingsChanged(this.currentSettings, true);
    });

    this.optUiVol.addEventListener("input", () => {
      const val = Number(this.optUiVol.value) / 100;
      this.optUiVolVal.textContent = `${this.optUiVol.value}%`;
      this.currentSettings.audio.uiVolume = val;
      this.callbacks.onSettingsChanged(this.currentSettings, false);
    });
    this.optUiVol.addEventListener("change", () => {
      this.callbacks.onSettingsChanged(this.currentSettings, true);
    });

    this.optMuted.addEventListener("click", () => {
      this.currentSettings.audio.muted = !this.currentSettings.audio.muted;
      this.callbacks.onSettingsChanged(this.currentSettings, !this.currentSettings.audio.muted);
    });

    // Video & Camera controls
    this.bindSegmented("optQualityGroup", (val) => {
      this.currentSettings.video.quality = val as GraphicsQuality;
      this.callbacks.onSettingsChanged(this.currentSettings, true);
    });
    this.optShadows.addEventListener("click", () => {
      this.currentSettings.video.shadows = !this.currentSettings.video.shadows;
      this.callbacks.onSettingsChanged(this.currentSettings, true);
    });
    this.bindSegmented("optFpsGroup", (val) => {
      this.currentSettings.video.fpsCap = Number(val) as 0 | 30 | 60;
      this.callbacks.onSettingsChanged(this.currentSettings, true);
    });
    this.bindSegmented("optViewModeGroup", (val) => {
      this.currentSettings.camera.viewMode = val as CameraViewMode;
      this.callbacks.onSettingsChanged(this.currentSettings, true);
    });
    this.bindSegmented("optZoomGroup", (val) => {
      this.currentSettings.camera.zoom = val as CameraZoomPreset;
      this.callbacks.onSettingsChanged(this.currentSettings, true);
    });
    this.bindSegmented("optTiltGroup", (val) => {
      this.currentSettings.camera.tilt = val as CameraTiltPreset;
      this.callbacks.onSettingsChanged(this.currentSettings, true);
    });
    this.optMouseSens.addEventListener("input", () => {
      const val = Number(this.optMouseSens.value) / 100;
      this.optMouseSensVal.textContent = `${val.toFixed(1)}×`;
      this.currentSettings.camera.mouseSensitivity = val;
      this.callbacks.onSettingsChanged(this.currentSettings, false);
    });
    this.optMouseSens.addEventListener("change", () => {
      this.callbacks.onSettingsChanged(this.currentSettings, true);
    });

    // Gameplay toggles
    this.bindSegmented("optAimGroup", (val) => {
      this.currentSettings.gameplay.aimMode = val as AimMode;
      this.callbacks.onSettingsChanged(this.currentSettings, true);
    });
    this.optScreenShake.addEventListener("click", () => {
      this.currentSettings.gameplay.screenShake = !this.currentSettings.gameplay.screenShake;
      this.callbacks.onSettingsChanged(this.currentSettings, true);
    });
    this.optHitstop.addEventListener("click", () => {
      this.currentSettings.gameplay.hitstop = !this.currentSettings.gameplay.hitstop;
      this.callbacks.onSettingsChanged(this.currentSettings, true);
    });
    this.optDamageNumbers.addEventListener("click", () => {
      this.currentSettings.gameplay.damageNumbers = !this.currentSettings.gameplay.damageNumbers;
      this.callbacks.onSettingsChanged(this.currentSettings, true);
    });

    // Gameplay action dock & modal controls
    this.dodgeSlotButton.addEventListener("click", (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.callbacks.onTriggerDodge();
    });

    this.skillSlotButton.addEventListener("click", (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.callbacks.onTriggerSkill();
    });

    this.claimPerkButton.addEventListener("click", (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.callbacks.onClaimQueuedPerk();
    });

    this.rerollPerksButton.addEventListener("click", (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.callbacks.onRerollPerks();
    });

    document.getElementById("deferPerkButton")!.addEventListener("click", (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.callbacks.onDeferPerk();
    });

    this.viewModeButton.addEventListener("click", (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.callbacks.onToggleViewMode();
    });

    document.getElementById("muteButton")!.addEventListener("click", (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.callbacks.onToggleMute();
    });

    document.getElementById("pauseButton")!.addEventListener("click", (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.callbacks.onTogglePause();
    });

    document.getElementById("resumeButton")!.addEventListener("click", (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.callbacks.onTogglePause();
    });

    document.getElementById("restartShiftButton")!.addEventListener("click", (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.callbacks.onRestartDay();
    });

    document.getElementById("returnTitleButton")!.addEventListener("click", (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.callbacks.onReturnLobby(false);
    });

    this.playAgainButton.addEventListener("click", (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.callbacks.onStartWorkday();
    });

    document.getElementById("resultLobbyButton")!.addEventListener("click", (e) => {
      (e.currentTarget as HTMLButtonElement).blur();
      this.callbacks.onReturnLobby(true);
    });
  }

  private bindSegmented(containerId: string, onPick: (val: string) => void): void {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.querySelectorAll<HTMLButtonElement>("button[data-val]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.val !== undefined) onPick(btn.dataset.val);
      });
    });
  }

  private syncSegmented(containerId: string, activeVal: string): void {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.querySelectorAll<HTMLButtonElement>("button[data-val]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.val === activeVal);
    });
  }

  private syncToggle(btn: HTMLElement, on: boolean): void {
    btn.setAttribute("aria-pressed", String(on));
    btn.textContent = on ? "On" : "Off";
  }

  public syncSettingsUi(settings: GameSettings, listeningAction: KeyAction | null): void {
    this.currentSettings = settings;
    this.listeningAction = listeningAction;

    // Audio
    const mPct = Math.round(settings.audio.masterVolume * 100);
    const sPct = Math.round(settings.audio.sfxVolume * 100);
    const uPct = Math.round(settings.audio.uiVolume * 100);
    this.optMasterVol.value = String(mPct);
    this.optMasterVolVal.textContent = `${mPct}%`;
    this.optSfxVol.value = String(sPct);
    this.optSfxVolVal.textContent = `${sPct}%`;
    this.optUiVol.value = String(uPct);
    this.optUiVolVal.textContent = `${uPct}%`;
    this.syncToggle(this.optMuted, settings.audio.muted);
    this.setMutedIcon(settings.audio.muted);

    // Video & Camera
    this.syncSegmented("optQualityGroup", settings.video.quality);
    this.syncToggle(this.optShadows, settings.video.shadows);
    this.optShadowsHint.textContent = this.isSoftwareGl
      ? "Software WebGL detected — shadows stay auto-disabled for smooth frame rate"
      : "Soft directional shadows on GPU devices";
    this.syncSegmented("optFpsGroup", String(settings.video.fpsCap));
    this.syncSegmented("optViewModeGroup", settings.camera.viewMode);
    this.syncSegmented("optZoomGroup", settings.camera.zoom);
    this.syncSegmented("optTiltGroup", settings.camera.tilt);
    const sensPct = Math.round(settings.camera.mouseSensitivity * 100);
    this.optMouseSens.value = String(sensPct);
    this.optMouseSensVal.textContent = `${settings.camera.mouseSensitivity.toFixed(1)}×`;

    const isFps = settings.camera.viewMode === "fps";
    this.viewModeButton.textContent = isFps ? "FPS" : "3P";
    this.viewModeButton.classList.toggle("is-fps", isFps);
    const viewKey = formatKeyLabel(settings.bindings.toggleView);
    this.viewModeButton.title = isFps
      ? `First-Person Active — Switch to 3P (${viewKey})`
      : `Third-Person Active — Switch to FPS (${viewKey})`;

    // Gameplay
    this.syncSegmented("optAimGroup", settings.gameplay.aimMode);
    this.syncToggle(this.optScreenShake, settings.gameplay.screenShake);
    this.syncToggle(this.optHitstop, settings.gameplay.hitstop);
    this.syncToggle(this.optDamageNumbers, settings.gameplay.damageNumbers);

    // Keybinds table
    this.keybindList.innerHTML = "";
    for (const meta of KEY_ACTION_META) {
      const row = document.createElement("div");
      row.className = "keybind-row";
      const isListening = listeningAction === meta.action;
      const keyText = isListening ? "Press key..." : formatKeyLabel(settings.bindings[meta.action]);
      row.innerHTML = `
        <div>
          <strong>${meta.label}</strong>
          <span>${meta.hint}</span>
        </div>
      `;
      const cap = document.createElement("button");
      cap.type = "button";
      cap.className = `keycap-btn${isListening ? " is-listening" : ""}`;
      cap.textContent = keyText;
      cap.addEventListener("click", () => this.callbacks.onStartRebind(meta.action));
      row.appendChild(cap);
      this.keybindList.appendChild(row);
    }

    // Sync live keycap badges across HUD & Lobby
    const b = settings.bindings;
    this.hudDodgeKey.textContent = formatKeyLabel(b.dodge);
    this.hudSkillKey.textContent = formatKeyLabel(b.skill);
    this.hudClaimKey.textContent = formatKeyLabel(b.claimPerk);
    const moveSummary = `${formatKeyLabel(b.moveUp)}${formatKeyLabel(b.moveLeft)}${formatKeyLabel(b.moveDown)}${formatKeyLabel(b.moveRight)}`;
    this.titleControlsHint.textContent = `Drag 3D View · ${moveSummary} Move · ${formatKeyLabel(b.dodge)} Dodge · ${formatKeyLabel(b.skill)} Skill · ${formatKeyLabel(b.claimPerk)} Perk · ${viewKey} FPS View`;
  }

  public setTitleTab(tab: "roster" | "arsenal" | "shop"): void {
    const isRoster = tab === "roster";
    const isArsenal = tab === "arsenal";
    const isShop = tab === "shop";
    this.tabRoster.classList.toggle("is-active", isRoster);
    this.tabArsenal.classList.toggle("is-active", isArsenal);
    this.tabShop.classList.toggle("is-active", isShop);
    this.tabRoster.setAttribute("aria-selected", String(isRoster));
    this.tabArsenal.setAttribute("aria-selected", String(isArsenal));
    this.tabShop.setAttribute("aria-selected", String(isShop));
    this.rosterPane.hidden = !isRoster;
    this.arsenalPane.hidden = !isArsenal;
    this.shopPane.hidden = !isShop;
  }

  public setMutedIcon(muted: boolean): void {
    if (muted) {
      this.soundWaves.setAttribute("hidden", "");
      this.soundMuteLine.removeAttribute("hidden");
    } else {
      this.soundWaves.removeAttribute("hidden");
      this.soundMuteLine.setAttribute("hidden", "");
    }
  }

  public showToast(message: string): void {
    this.toastBanner.textContent = message;
    this.toastBanner.classList.add("is-visible");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastBanner.classList.remove("is-visible");
    }, 3200);
  }

  public showComms(
    speaker: string,
    role: string,
    avatarColor: string,
    message: string,
    portraitId?: EmployeeClassId | EnemyTypeId
  ): void {
    const svg = getPortraitForId(portraitId);
    if (svg) {
      this.commsAvatar.innerHTML = svg;
      this.commsAvatar.style.background = "transparent";
    } else {
      const initials = speaker
        .split(" ")
        .map((part) => part[0] || "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
      this.commsAvatar.textContent = initials;
      this.commsAvatar.style.background = avatarColor;
    }
    this.commsSpeaker.textContent = speaker;
    this.commsRole.textContent = role;
    this.commsMessage.textContent = message;
    this.commsCard.hidden = false;

    window.clearTimeout(this.commsTimer);
    this.commsTimer = window.setTimeout(() => {
      this.commsCard.hidden = true;
    }, 6400);
  }

  public hideComms(): void {
    this.commsCard.hidden = true;
  }

  public renderTitle(save: SaveData): void {
    const maxUnlocked = getMaxUnlockedDay(save);
    const chosenDay = Math.min(maxUnlocked, Math.max(1, save.selectedDay || save.day));
    const chapter = getChapterForDay(chosenDay);
    const active = CLASS_MAP[save.selectedClass];
    const diff = DIFFICULTY_MAP[save.selectedDifficulty] || DIFFICULTY_MAP.standard;

    this.titleDayMeta.textContent = `FL ${chapter.floorNumber} · ${chapter.weekday} · Day ${chosenDay}`;
    this.titleBankMeta.textContent = `Bank $${Math.floor(save.bank)}`;
    this.titleChapterName.textContent = `${chapter.department}: ${chapter.title}`;
    this.titleChapterBrief.textContent = `${chapter.briefing} C-Suite Boss: ${ENEMY_ARCHETYPES[chapter.finalBoss].name}.`;

    // 5-Floor Tower Selector
    this.daySelector.innerHTML = "";
    for (const ch of STORY_CHAPTERS) {
      const unlocked = ch.day <= maxUnlocked;
      const bestDiff = save.floorBestDifficulty?.[ch.day];
      const cleared = ch.day <= save.highestDayCleared || Boolean(bestDiff);
      const selected = ch.day === chosenDay;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `day-btn${selected ? " is-selected" : ""}${cleared ? " is-cleared" : ""}${!unlocked ? " is-locked" : ""}`;
      btn.disabled = !unlocked;
      btn.setAttribute("aria-pressed", String(selected));
      const badge = !unlocked
        ? "Locked"
        : bestDiff
        ? DIFFICULTY_MAP[bestDiff].shortLabel
        : cleared
        ? "Cleared"
        : ch.weekday.slice(0, 3);
      btn.innerHTML = `
        <strong>FL ${ch.floorNumber}</strong>
        <span>${badge}</span>
      `;
      if (unlocked) {
        btn.addEventListener("click", () => this.callbacks.onSelectDay(ch.day));
      }
      this.daySelector.appendChild(btn);
    }

    // 4-Tier Difficulty Selector
    this.difficultyTagline.textContent = `${diff.label} · ${diff.tagline}`;
    this.difficultySelector.innerHTML = "";
    for (const d of DIFFICULTIES) {
      const selected = d.id === save.selectedDifficulty;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.diff = d.id;
      btn.className = `diff-btn${selected ? " is-selected" : ""}`;
      btn.setAttribute("aria-pressed", String(selected));
      btn.textContent = d.shortLabel;
      btn.title = `${d.label} — ${d.tagline}`;
      btn.addEventListener("click", () => this.callbacks.onSelectDifficulty(d.id));
      this.difficultySelector.appendChild(btn);
    }

    // Roster Cards with Custom SVG Portraits
    this.classGrid.innerHTML = "";
    for (const emp of EMPLOYEE_CLASSES) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `roster-card${emp.id === save.selectedClass ? " is-selected" : ""}`;
      btn.setAttribute("aria-pressed", String(emp.id === save.selectedClass));
      btn.innerHTML = `
        <div class="roster-portrait" aria-hidden="true">${getEmployeePortraitSvg(emp.id)}</div>
        <div class="roster-card-copy">
          <div class="roster-card-name">${emp.characterName}</div>
          <div class="roster-card-role">${emp.roleTitle}</div>
          <div class="roster-card-passive">${emp.passiveLabel}</div>
        </div>
      `;
      btn.addEventListener("click", () => this.callbacks.onSelectClass(emp.id));
      this.classGrid.appendChild(btn);
    }

    // Hero Loadout Dossier + Equipped Office Weapon + Effective Starting Stats
    const activeWeapon = OFFICE_WEAPON_MAP[save.selectedWeapon] || OFFICE_WEAPON_MAP.stapler;
    this.dossierPortrait.innerHTML = getEmployeePortraitSvg(active.id);
    this.dossierName.textContent = active.characterName;
    this.dossierRole.textContent = active.roleTitle;
    this.dossierWeaponName.textContent = `${activeWeapon.name} (${activeWeapon.roleTag})`;
    this.dossierWeaponDesc.textContent = activeWeapon.summary;
    this.dossierSkillName.textContent = active.skillName;
    this.dossierSkillDesc.textContent = active.skillDescription;

    const eff = computeEffectiveStartingStats(save);
    this.effectiveStatsStrip.innerHTML = `
      <span>Energy <strong>${eff.energy}</strong></span>
      <span>Dmg <strong>${eff.productivity}</strong></span>
      <span>Crit <strong>${eff.critPct}%</strong></span>
      <span>Speed <strong>${eff.speed}</strong></span>
      <span>Reach <strong>${eff.range}m</strong></span>
    `;

    // Office Arsenal Tab: Equipped Preview + 10 Selectable Office Items
    this.arsenalSelectedBar.innerHTML = `
      <div class="arsenal-selected-icon" aria-hidden="true">${getWeaponIconSvg(activeWeapon.id)}</div>
      <div class="arsenal-selected-copy">
        <div class="arsenal-selected-top">
          <strong>${activeWeapon.name}</strong>
          <span class="weapon-tag mono" style="color:${activeWeapon.color}">${activeWeapon.roleTag}</span>
        </div>
        <div class="arsenal-selected-desc">${activeWeapon.summary}</div>
        <div class="arsenal-selected-evo mono">Evolves → ${activeWeapon.evolvedName}</div>
      </div>
    `;

    this.weaponGrid.innerHTML = "";
    for (const wpn of OFFICE_WEAPONS) {
      const selected = wpn.id === activeWeapon.id;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.weaponId = wpn.id;
      btn.className = `weapon-card${selected ? " is-selected" : ""}`;
      btn.setAttribute("aria-pressed", String(selected));
      const statLine = `${Math.round(wpn.damageMult * 100)}% Dmg · ${wpn.fireRateMult.toFixed(1)}× RoF`;
      btn.innerHTML = `
        <div class="weapon-icon" aria-hidden="true">${getWeaponIconSvg(wpn.id)}</div>
        <div class="weapon-card-copy">
          <div class="weapon-card-name">${wpn.name}</div>
          <div class="weapon-tag mono" style="color:${wpn.color}">${wpn.roleTag}</div>
          <div class="weapon-card-stats mono">${statLine}</div>
        </div>
      `;
      btn.addEventListener("click", () => this.callbacks.onSelectWeapon(wpn.id));
      this.weaponGrid.appendChild(btn);
    }

    // Upgrades Shop
    this.shopBankText.textContent = `$${Math.floor(save.bank)}`;
    this.shopGrid.innerHTML = "";
    for (const item of SHOP_ITEMS) {
      const level = save.upgrades[item.id] || 0;
      const maxed = level >= item.maxLevel;
      const cost = getShopItemCost(item, level);
      const locked = !maxed && save.bank < cost;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `shop-card${maxed ? " is-maxed" : ""}${locked ? " is-locked" : ""}`;
      btn.innerHTML = `
        <div class="shop-card-title">${item.name}</div>
        <div class="shop-card-effect">${item.effectLabel}</div>
        <div class="shop-card-foot mono">
          <span>Lvl ${level}/${item.maxLevel}</span>
          <span>${maxed ? "Maxed" : `$${cost}`}</span>
        </div>
      `;
      btn.addEventListener("click", () => this.callbacks.onBuyUpgrade(item.id));
      this.shopGrid.appendChild(btn);
    }
  }

  public syncFrame(
    state: GameState | null,
    renderer: WorldRenderer,
    isFps = false,
    fpsYaw = 0
  ): void {
    const screen = state ? state.screen : "title";
    if (screen !== this.lastScreen) {
      this.lastScreen = screen;
      document.body.dataset.state = screen;
      this.upgradeModal.hidden = screen !== "upgrade";
      this.dilemmaModal.hidden = screen !== "dilemma";
      this.pauseModal.hidden = screen !== "paused";
      this.resultModal.hidden = screen !== "gameover";
      if (screen === "title") {
        this.floaterLayer.innerHTML = "";
        this.dangerVignette.style.opacity = "0";
        this.hideComms();
      }
    }

    const showCrosshair =
      screen === "playing" &&
      !this.settingsOpen &&
      !this.directoryOpen &&
      this.currentSettings.camera.viewMode === "fps";
    this.fpsCrosshair.hidden = !showCrosshair;

    if (!state || screen === "title") return;

    const p = state.player;
    if (showCrosshair) {
      this.fpsCrosshair.classList.toggle("is-firing", p.attackFlash > 0);
    }
    if (this.lastHeroPortraitClass !== state.employee.id) {
      this.lastHeroPortraitClass = state.employee.id;
      this.hudHeroPortrait.innerHTML = getEmployeePortraitSvg(state.employee.id);
    }

    this.hudHeroName.textContent = state.employee.characterName;
    this.hudHeroLevel.textContent = `Lvl ${state.level}`;
    this.hudEnergyText.textContent = `${Math.ceil(p.energy)}/${Math.ceil(p.maxEnergy)}`;

    const energyPct = Math.max(0, Math.min(100, (p.energy / p.maxEnergy) * 100));
    const ghostPct = Math.max(energyPct, Math.min(100, (p.ghostEnergy / p.maxEnergy) * 100));
    this.hudEnergyFill.style.width = `${energyPct.toFixed(1)}%`;
    this.hudEnergyGhost.style.width = `${ghostPct.toFixed(1)}%`;
    this.dangerVignette.style.opacity = energyPct < 30 ? String(((30 - energyPct) / 30) * 0.9) : "0";

    this.hudWeaponLabel.textContent = p.weaponEvolved
      ? state.weapon.evolvedName
      : state.weapon.name;
    this.hudWeaponLabel.classList.toggle("is-evolved", p.weaponEvolved);
    this.hudFocusText.textContent = `${Math.round(p.focus)}%`;
    this.hudProdText.textContent = `${Math.round(p.productivity)}`;
    this.hudXpFill.style.width = `${Math.min(100, (state.xp / state.xpNeeded) * 100).toFixed(1)}%`;

    // Active status chips (Morale Shield, Policy Silence, Haste, 2x Salary)
    const statusTags: Array<{ label: string; cls: string }> = [];
    if (p.moraleShield > 0.5) {
      statusTags.push({ label: `SHIELD ${Math.ceil(p.moraleShield)}`, cls: "is-shield" });
    }
    if (state.policySilenceTimer > 0.05) {
      statusTags.push({ label: `HR SILENCE ${state.policySilenceTimer.toFixed(1)}s`, cls: "is-danger" });
    }
    if (state.hasteTimer > 0.05) {
      statusTags.push({ label: `HASTE ${state.hasteTimer.toFixed(1)}s`, cls: "is-warn" });
    }
    if (state.salaryBoostTimer > 0.05) {
      statusTags.push({ label: `2x SALARY ${state.salaryBoostTimer.toFixed(1)}s`, cls: "is-salary" });
    }
    const statusKey = statusTags.map((t) => t.label).join("|");
    if (statusKey !== this.lastStatusKey) {
      this.lastStatusKey = statusKey;
      if (statusTags.length === 0) {
        this.hudStatusRow.hidden = true;
        this.hudStatusRow.innerHTML = "";
      } else {
        this.hudStatusRow.hidden = false;
        this.hudStatusRow.innerHTML = statusTags
          .map((t) => `<span class="hud-status-tag ${t.cls}">${t.label}</span>`)
          .join("");
      }
    }

    const curRoom = getRoomById(state.currentRoomId);
    this.hudDayLabel.textContent = `FL ${state.chapter.floorNumber} · ${state.chapter.weekday.slice(0, 3)} · ${state.difficulty.shortLabel}`;
    this.hudClockText.textContent = formatWorkClock(state.elapsed, state.dayLength);
    this.hudPhaseText.textContent = getPhaseLabel(state);
    this.hudRoomPlate.textContent = curRoom.shortLabel;
    this.hudRoomPlate.style.color = curRoom.accentColor;
    this.minimapRoomName.textContent = curRoom.shortLabel;
    this.minimapRoomName.style.color = curRoom.accentColor;
    this.minimapFloorLabel.textContent = `FL ${state.chapter.floorNumber}`;
    this.hudSalaryText.textContent = `$${Math.floor(state.salary)}`;

    const flow = getFlowMultiplier(state.combo);
    if (flow > 1) {
      this.hudFlowText.hidden = false;
      this.hudFlowText.textContent = `${flow}x Flow · ${state.combo}`;
    } else {
      this.hudFlowText.hidden = true;
    }

    // Dodge Roll Slot
    const dodgeReady = p.dodgeCooldown <= 0.01;
    this.dodgeSlotButton.classList.toggle("is-ready", dodgeReady);
    this.hudDodgeStatus.textContent = dodgeReady ? "Ready" : `${p.dodgeCooldown.toFixed(1)}s`;
    const dodgePct = dodgeReady ? 100 : Math.max(0, (1 - p.dodgeCooldown / p.dodgeMaxCooldown) * 100);
    this.hudDodgeFill.style.width = `${dodgePct.toFixed(1)}%`;

    // Signature Skill Slot
    this.hudSkillName.textContent = state.employee.skillName;
    const silenced = state.policySilenceTimer > 0.05;
    const ready = !silenced && p.skillCooldown <= 0.01;
    this.skillSlotButton.classList.toggle("is-ready", ready);
    this.hudSkillStatus.textContent = silenced
      ? "Silenced"
      : ready
      ? "Ready"
      : `${p.skillCooldown.toFixed(1)}s`;
    const skillPct = ready ? 100 : Math.max(0, (1 - p.skillCooldown / p.skillMaxCooldown) * 100);
    this.hudSkillFill.style.width = `${skillPct.toFixed(1)}%`;

    // Non-blocking Queued Perk Claim Slot
    if (state.pendingLevelUps > 0) {
      this.claimPerkButton.hidden = false;
      this.hudClaimLabel.textContent = "Claim Perk";
      this.hudClaimCount.textContent =
        state.pendingLevelUps > 1 ? `${state.pendingLevelUps} Queued` : "Ready";
    } else {
      this.claimPerkButton.hidden = true;
    }

    // Contextual Interactive Station Hint across all 8 rooms
    const cd = state.stationCooldowns;
    if (state.outage > 0) {
      this.stationHint.hidden = false;
      this.stationHint.textContent =
        state.serverRebootProgress > 0
          ? `Rebooting IT Core Server... ${Math.round((state.serverRebootProgress / 1.05) * 100)}%`
          : "Outage active — Visit IT Server Room (East Wing) to reboot (+$55)";
    } else if (state.policySilenceTimer > 0.1 && (cd.washroom <= 0 || cd.hr_shredder <= 0)) {
      this.stationHint.hidden = false;
      this.stationHint.textContent = "HR Silenced — Cleanse at Washrooms (SW) or HR Shredder (West)";
    } else if (cd.espresso <= 0 && energyPct < 72) {
      this.stationHint.hidden = false;
      this.stationHint.textContent = "Cafeteria Espresso Bar (SE) is hot & ready (+Energy & Haste)";
    } else if (cd.lounge <= 0 && p.moraleShield < 5 && state.elapsed > 30) {
      this.stationHint.hidden = false;
      this.stationHint.textContent = "Casual Lounge Nap Pod (SE Corner) ready (+24 Morale Shield)";
    } else if (cd.cfo_terminal <= 0 && state.salaryBoostTimer <= 0 && state.elapsed > 45) {
      this.stationHint.hidden = false;
      this.stationHint.textContent = "CFO Audit Terminal (NE) ready (2x Salary + XP Vacuum)";
    } else if (cd.whiteboard <= 0 && state.whiteboardBuffTimer <= 0 && state.elapsed > 20) {
      this.stationHint.hidden = false;
      this.stationHint.textContent = "Boardroom Whiteboard (North) ready (+28% Fire Rate)";
    } else if (cd.printer <= 0 && state.enemies.length >= 6) {
      this.stationHint.hidden = false;
      this.stationHint.textContent = "Bullpen Turbo Printer (South) charged (+$35 shockwave)";
    } else {
      this.stationHint.hidden = true;
    }

    // Active C-Suite Boss Bar with SVG Portrait
    const activeBoss = state.enemies.find((e) => e.boss && e.aiPhase !== "dying");
    if (activeBoss) {
      this.bossBarWrap.hidden = false;
      this.bossBarWrap.classList.toggle("is-phase2", activeBoss.bossPhase === 2);
      if (this.lastBossPortraitId !== activeBoss.typeId) {
        this.lastBossPortraitId = activeBoss.typeId;
        this.bossPortrait.innerHTML = getEnemyPortraitSvg(activeBoss.typeId);
      }
      this.bossNameText.textContent =
        activeBoss.bossPhase === 2
          ? `${ENEMY_ARCHETYPES[activeBoss.typeId].name} · Phase II`
          : ENEMY_ARCHETYPES[activeBoss.typeId].name;
      this.bossHpText.textContent = `${Math.ceil(activeBoss.hp)}/${Math.ceil(activeBoss.maxHp)}`;
      this.bossHpFill.style.width = `${Math.max(0, (activeBoss.hp / activeBoss.maxHp) * 100).toFixed(1)}%`;
    } else {
      this.bossBarWrap.hidden = true;
    }

    // Live 2D Canvas Campus Minimap
    this.minimap.render(state, isFps, fpsYaw);

    // Upgrade Modal
    if (screen === "upgrade") {
      this.rerollPerksButton.textContent = `Reroll ($${state.rerollCost})`;
      const key = `${state.level}:${state.pendingLevelUps}:${state.pendingPerks.map((x) => x.id).join(",")}`;
      if (key !== this.renderedPerkKey) {
        this.renderedPerkKey = key;
        this.upgradeKicker.textContent = `Level ${state.level} · ${state.pendingLevelUps} Queued`;
        this.perkChoices.innerHTML = "";
        state.pendingPerks.forEach((perk, idx) => {
          const isSynergy =
            perk.synergyFor === state.employee.id && !state.player.weaponEvolved;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `choice-card${isSynergy ? " is-synergy" : ""}`;
          btn.innerHTML = `
            <span class="choice-kicker">[${idx + 1}] ${perk.category} · ${
              isSynergy ? "Evolution Synergy" : perk.rarity
            }</span>
            <h3>${perk.name}</h3>
            <p>${perk.description}</p>
          `;
          btn.addEventListener("click", () => this.callbacks.onPickPerk(perk.id));
          this.perkChoices.appendChild(btn);
        });
      }
    }

    if (screen === "dilemma" && state.activeDilemma) {
      const key = state.activeDilemma.title;
      if (key !== this.renderedDilemmaKey) {
        this.renderedDilemmaKey = key;
        this.dilemmaSender.textContent = state.activeDilemma.sender;
        this.dilemmaTitle.textContent = state.activeDilemma.title;
        this.dilemmaPrompt.textContent = state.activeDilemma.prompt;
        this.dilemmaChoices.innerHTML = "";
        state.activeDilemma.choices.forEach((choice, idx) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "choice-card";
          btn.innerHTML = `
            <span class="choice-kicker">Option ${idx + 1}</span>
            <h3>${choice.label}</h3>
            <p>${choice.sublabel}</p>
          `;
          btn.addEventListener("click", () => this.callbacks.onPickDilemma(choice.id));
          this.dilemmaChoices.appendChild(btn);
        });
      }
    }

    if (screen === "paused") {
      this.pauseSummary.textContent = `${state.chapter.weekday} · ${state.chapter.title} (${state.difficulty.label}) · ${formatWorkClock(
        state.elapsed,
        state.dayLength
      )} · $${Math.floor(state.salary)} earned.`;
    }

    if (screen === "gameover" && state.summary) {
      const s = state.summary;
      const key = `${s.day}:${s.won}:${s.salaryEarned}:${s.kills}`;
      if (key !== this.renderedSummaryKey) {
        this.renderedSummaryKey = key;
        this.resultKicker.textContent = s.won
          ? `Floor ${s.floorNumber} · Day ${s.day} Complete`
          : "Burnout Detected";
        this.resultTitle.textContent = s.won
          ? `You cleared Floor ${s.floorNumber} (${s.weekday}).`
          : "The calendar claimed another shift.";
        this.resultEpilogue.textContent = s.epilogue;
        this.playAgainButton.textContent = s.won ? "Start Next Workday" : "Try Again";

        this.resultStats.innerHTML = `
          <div class="stat-tile"><span>Paycheck</span><strong>$${s.salaryEarned}</strong></div>
          <div class="stat-tile"><span>Chaos Cleared</span><strong>${s.kills}</strong></div>
          <div class="stat-tile"><span>Peak Flow</span><strong>${s.maxCombo}x</strong></div>
          <div class="stat-tile"><span>Level</span><strong>${s.levelReached}</strong></div>
        `;
        this.resultAchievements.textContent = `Milestones: ${s.achievementsUnlocked.join(" · ")}`;
      }
    }

    this.syncFloaters(state, renderer);
  }

  private syncFloaters(state: GameState, renderer: WorldRenderer): void {
    const showDamage = this.currentSettings.gameplay.damageNumbers;
    const visible = showDamage ? state.floaters : state.floaters.filter((f) => !f.isDamage);
    if (visible.length === 0) {
      if (this.floaterLayer.childElementCount > 0) this.floaterLayer.innerHTML = "";
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const flt of visible) {
      const projected = renderer.projectToScreen(flt.x, flt.y, flt.z);
      if (!projected) continue;
      const el = document.createElement("span");
      el.className = "floater-item";
      el.textContent = flt.text;
      el.style.left = `${projected.sx.toFixed(1)}px`;
      el.style.top = `${projected.sy.toFixed(1)}px`;
      el.style.color = flt.color;
      el.style.opacity = String(Math.max(0, Math.min(1, flt.life / flt.ttl)));
      fragment.appendChild(el);
    }
    this.floaterLayer.replaceChildren(fragment);
  }
}
