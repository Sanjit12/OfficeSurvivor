import type { AudioSettings } from "./types";

type AudioChannel = "sfx" | "ui";

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterVolume = 0.8;
  private sfxVolume = 0.85;
  private uiVolume = 0.75;
  private muted = false;

  public applySettings(settings: AudioSettings): void {
    this.masterVolume = Math.max(0, Math.min(1, settings.masterVolume));
    this.sfxVolume = Math.max(0, Math.min(1, settings.sfxVolume));
    this.uiVolume = Math.max(0, Math.min(1, settings.uiVolume));
    this.muted = settings.muted;
  }

  public unlock(): void {
    if (this.muted) return;
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    gainPeak: number,
    delay = 0,
    channel: AudioChannel = "sfx"
  ): void {
    const channelScale = channel === "ui" ? this.uiVolume : this.sfxVolume;
    const finalPeak = gainPeak * this.masterVolume * channelScale;
    if (this.muted || finalPeak <= 0.0005 || !this.ctx || this.ctx.state !== "running") return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(finalPeak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public uiTick(): void {
    this.playTone(540, 680, 0.045, "sine", 0.045, 0, "ui");
  }

  public shoot(isCrit = false): void {
    const jitter = 0.92 + Math.random() * 0.16;
    this.playTone(
      isCrit ? 620 * jitter : 420 * jitter,
      220,
      0.055,
      "triangle",
      isCrit ? 0.06 : 0.035,
      0,
      "sfx"
    );
  }

  public hit(isCrit = false): void {
    const jitter = 0.92 + Math.random() * 0.16;
    this.playTone(
      isCrit ? 520 * jitter : 210 * jitter,
      95,
      0.07,
      isCrit ? "sawtooth" : "square",
      isCrit ? 0.055 : 0.03,
      0,
      "sfx"
    );
  }

  public kill(isBoss = false): void {
    if (isBoss) {
      this.playTone(220, 65, 0.35, "sawtooth", 0.09, 0, "sfx");
      this.playTone(330, 520, 0.25, "triangle", 0.07, 0.12, "sfx");
      this.playTone(520, 780, 0.28, "triangle", 0.07, 0.24, "sfx");
      return;
    }
    this.playTone(280, 120, 0.1, "triangle", 0.055, 0, "sfx");
    this.playTone(440, 580, 0.08, "sine", 0.035, 0.03, "sfx");
  }

  public playerHit(): void {
    this.playTone(170, 62, 0.18, "sawtooth", 0.08, 0, "sfx");
  }

  public dodge(): void {
    this.playTone(310, 560, 0.09, "sine", 0.055, 0, "sfx");
    this.playTone(180, 95, 0.11, "triangle", 0.04, 0.02, "sfx");
  }

  public skill(): void {
    this.playTone(260, 740, 0.18, "triangle", 0.07, 0, "sfx");
    this.playTone(520, 920, 0.14, "sine", 0.05, 0.06, "sfx");
  }

  public orb(): void {
    const jitter = 0.94 + Math.random() * 0.14;
    this.playTone(760 * jitter, 980 * jitter, 0.05, "sine", 0.03, 0, "sfx");
  }

  public pickup(): void {
    this.playTone(520, 780, 0.09, "sine", 0.055, 0, "ui");
    this.playTone(780, 1040, 0.12, "sine", 0.05, 0.07, "ui");
  }

  public stationBuff(): void {
    this.playTone(392, 523, 0.14, "triangle", 0.06, 0, "ui");
    this.playTone(523, 784, 0.18, "sine", 0.055, 0.09, "ui");
  }

  public telegraph(): void {
    this.playTone(440, 660, 0.15, "sine", 0.035, 0, "sfx");
  }

  public levelUp(): void {
    this.playTone(440, 440, 0.12, "triangle", 0.06, 0, "ui");
    this.playTone(554, 554, 0.12, "triangle", 0.06, 0.09, "ui");
    this.playTone(659, 659, 0.18, "triangle", 0.065, 0.18, "ui");
  }

  public evolve(): void {
    [440, 554, 659, 880, 1108].forEach((n, idx) => {
      this.playTone(n, n * 1.03, 0.2, "triangle", 0.07, idx * 0.075, "ui");
    });
  }

  public bossSpawn(): void {
    this.playTone(130, 98, 0.32, "sawtooth", 0.08, 0, "sfx");
    this.playTone(110, 82, 0.38, "sawtooth", 0.08, 0.22, "sfx");
  }

  public bossPhase(): void {
    this.playTone(150, 290, 0.25, "sawtooth", 0.085, 0, "sfx");
    this.playTone(290, 110, 0.3, "sawtooth", 0.08, 0.18, "sfx");
  }

  public victory(): void {
    [523, 659, 784, 1046].forEach((n, idx) => {
      this.playTone(n, n, 0.22, "triangle", 0.065, idx * 0.11, "ui");
    });
  }

  public defeat(): void {
    [320, 260, 195].forEach((n, idx) => {
      this.playTone(n, n * 0.9, 0.22, "sawtooth", 0.06, idx * 0.14, "ui");
    });
  }
}
