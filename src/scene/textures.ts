import * as THREE from "three";

export interface ProceduralTextureSet {
  floorColor: THREE.CanvasTexture;
  floorBump: THREE.CanvasTexture;
  checkeredTile: THREE.CanvasTexture;
  woodColor: THREE.CanvasTexture;
  woodBump: THREE.CanvasTexture;
  monitorCode: THREE.CanvasTexture;
  monitorKanban: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  whiteboard: THREE.CanvasTexture;
  floorSign: THREE.CanvasTexture;
  stockChart: THREE.CanvasTexture;
  hrPoster: THREE.CanvasTexture;
  cafeMenu: THREE.CanvasTexture;
  loungeNeon: THREE.CanvasTexture;
  ceoArt: THREE.CanvasTexture;
  serverScreen: THREE.CanvasTexture;
  arcadeScreen: THREE.CanvasTexture;
  atriumCompass: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  return [canvas, ctx];
}

function finalizeColorTex(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Honed Architectural Concrete / Carpet Tile Floor
  const [fCanvas, fCtx] = makeCanvas(512, 512);
  fCtx.fillStyle = "#2b3544";
  fCtx.fillRect(0, 0, 512, 512);

  const tile = 128;
  for (let ty = 0; ty < 4; ty += 1) {
    for (let tx = 0; tx < 4; tx += 1) {
      const shade = (tx + ty) % 2 === 0 ? "#2e394a" : "#283242";
      fCtx.fillStyle = shade;
      fCtx.fillRect(tx * tile + 2, ty * tile + 2, tile - 4, tile - 4);
      fCtx.fillStyle = "rgba(255,255,255,0.025)";
      for (let i = 0; i < 16; i += 1) {
        const y = ty * tile + 6 + i * 7;
        fCtx.fillRect(tx * tile + 4, y, tile - 8, 1);
      }
    }
  }
  fCtx.strokeStyle = "rgba(12, 18, 28, 0.55)";
  fCtx.lineWidth = 3;
  for (let i = 0; i <= 512; i += tile) {
    fCtx.beginPath();
    fCtx.moveTo(i, 0);
    fCtx.lineTo(i, 512);
    fCtx.stroke();
    fCtx.beginPath();
    fCtx.moveTo(0, i);
    fCtx.lineTo(512, i);
    fCtx.stroke();
  }
  const floorColor = finalizeColorTex(fCanvas, maxAnisotropy, 14, 11);

  // Floor Bump Map (linear space)
  const [fbCanvas, fbCtx] = makeCanvas(256, 256);
  fbCtx.fillStyle = "#888888";
  fbCtx.fillRect(0, 0, 256, 256);
  fbCtx.strokeStyle = "#303030";
  fbCtx.lineWidth = 3;
  for (let i = 0; i <= 256; i += 64) {
    fbCtx.beginPath();
    fbCtx.moveTo(i, 0);
    fbCtx.lineTo(i, 256);
    fbCtx.stroke();
    fbCtx.beginPath();
    fbCtx.moveTo(0, i);
    fbCtx.lineTo(256, i);
    fbCtx.stroke();
  }
  const floorBump = new THREE.CanvasTexture(fbCanvas);
  floorBump.wrapS = THREE.RepeatWrapping;
  floorBump.wrapT = THREE.RepeatWrapping;
  floorBump.repeat.set(14, 11);
  floorBump.anisotropy = maxAnisotropy;

  // 1b. Washrooms Checkered Ceramic Tile
  const [ctCanvas, ctCtx] = makeCanvas(256, 256);
  for (let ty = 0; ty < 4; ty += 1) {
    for (let tx = 0; tx < 4; tx += 1) {
      ctCtx.fillStyle = (tx + ty) % 2 === 0 ? "#cbd5e1" : "#475569";
      ctCtx.fillRect(tx * 64, ty * 64, 64, 64);
      ctCtx.strokeStyle = "#1e293b";
      ctCtx.lineWidth = 2;
      ctCtx.strokeRect(tx * 64, ty * 64, 64, 64);
    }
  }
  const checkeredTile = finalizeColorTex(ctCanvas, maxAnisotropy, 8, 6);

  // 2. Warm Walnut Wood Grain for Desks & Conference Table
  const [wCanvas, wCtx] = makeCanvas(256, 256);
  wCtx.fillStyle = "#966d4b";
  wCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    const wave = Math.sin(y * 0.09) * 14;
    wCtx.fillStyle = y % 6 === 0 ? "rgba(62, 39, 22, 0.24)" : "rgba(210, 170, 128, 0.14)";
    wCtx.fillRect(0, y, 256, 2);
    wCtx.fillStyle = "rgba(50, 30, 16, 0.12)";
    wCtx.fillRect((y * 7 + wave) % 256, y, 42, 1);
  }
  const woodColor = finalizeColorTex(wCanvas, maxAnisotropy, 1, 1);
  woodColor.wrapS = THREE.RepeatWrapping;
  woodColor.wrapT = THREE.RepeatWrapping;

  const [wbCanvas, wbCtx] = makeCanvas(128, 128);
  wbCtx.fillStyle = "#808080";
  wbCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) {
    wbCtx.fillStyle = y % 4 === 0 ? "#6a6a6a" : "#969696";
    wbCtx.fillRect(0, y, 128, 1);
  }
  const woodBump = new THREE.CanvasTexture(wbCanvas);
  woodBump.wrapS = THREE.RepeatWrapping;
  woodBump.wrapT = THREE.RepeatWrapping;

  // 3. Glowing IDE Code Monitor Texture
  const [mcCanvas, mcCtx] = makeCanvas(256, 160);
  mcCtx.fillStyle = "#0f172a";
  mcCtx.fillRect(0, 0, 256, 160);
  mcCtx.fillStyle = "#1e293b";
  mcCtx.fillRect(0, 0, 44, 160);
  mcCtx.fillRect(0, 0, 256, 18);
  const codeColors = ["#38bdf8", "#34d399", "#fbbf24", "#f472b6", "#cbd5e1"];
  for (let row = 0; row < 11; row += 1) {
    const indent = (row % 3) * 14;
    mcCtx.fillStyle = codeColors[row % codeColors.length];
    mcCtx.fillRect(54 + indent, 28 + row * 11, 40 + ((row * 37) % 110), 5);
  }
  const monitorCode = finalizeColorTex(mcCanvas, maxAnisotropy);

  // 4. Glowing Kanban / Dashboard Monitor Texture
  const [mkCanvas, mkCtx] = makeCanvas(256, 160);
  mkCtx.fillStyle = "#111827";
  mkCtx.fillRect(0, 0, 256, 160);
  const colColors = ["#38bdf8", "#f59e0b", "#22c55e"];
  for (let col = 0; col < 3; col += 1) {
    mkCtx.fillStyle = "#1f2937";
    mkCtx.fillRect(12 + col * 80, 18, 70, 128);
    mkCtx.fillStyle = colColors[col];
    mkCtx.fillRect(16 + col * 80, 24, 62, 10);
    for (let card = 0; card < 3; card += 1) {
      mkCtx.fillStyle = "#334155";
      mkCtx.fillRect(16 + col * 80, 42 + card * 30, 62, 22);
    }
  }
  const monitorKanban = finalizeColorTex(mkCanvas, maxAnisotropy);

  // 5. Soft Radial Contact Shadow Disc
  const [csCanvas, csCtx] = makeCanvas(128, 128);
  const grad = csCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, "rgba(4, 8, 15, 0.72)");
  grad.addColorStop(0.55, "rgba(4, 8, 15, 0.34)");
  grad.addColorStop(1, "rgba(4, 8, 15, 0)");
  csCtx.fillStyle = grad;
  csCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(csCanvas);

  // 6. Executive Boardroom Whiteboard Texture
  const [wb2Canvas, wb2Ctx] = makeCanvas(512, 256);
  wb2Ctx.fillStyle = "#f1f5f9";
  wb2Ctx.fillRect(0, 0, 512, 256);
  wb2Ctx.strokeStyle = "#cbd5e1";
  wb2Ctx.lineWidth = 8;
  wb2Ctx.strokeRect(4, 4, 504, 248);
  wb2Ctx.fillStyle = "#0f172a";
  wb2Ctx.font = "bold 28px sans-serif";
  wb2Ctx.fillText("PROJECT PHOENIX — SHIP FRIDAY", 28, 52);
  wb2Ctx.strokeStyle = "#f97316";
  wb2Ctx.lineWidth = 4;
  wb2Ctx.beginPath();
  wb2Ctx.moveTo(28, 66);
  wb2Ctx.lineTo(468, 66);
  wb2Ctx.stroke();
  wb2Ctx.fillStyle = "#334155";
  wb2Ctx.font = "bold 18px sans-serif";
  wb2Ctx.fillText("MON: PIVOT", 30, 110);
  wb2Ctx.fillText("WED: HOTFIX", 190, 110);
  wb2Ctx.fillText("FRI: LAUNCH!", 350, 110);
  wb2Ctx.fillStyle = "#ef4444";
  wb2Ctx.fillRect(30, 130, 110, 26);
  wb2Ctx.fillStyle = "#f59e0b";
  wb2Ctx.fillRect(190, 130, 120, 26);
  wb2Ctx.fillStyle = "#10b981";
  wb2Ctx.fillRect(350, 130, 120, 26);
  wb2Ctx.fillStyle = "#1e293b";
  wb2Ctx.font = "bold 16px sans-serif";
  wb2Ctx.fillText("NO RELEASES ON FRIDAY (IGNORED)", 30, 212);
  const whiteboard = finalizeColorTex(wb2Canvas, maxAnisotropy);

  // 7. Apex Corp Architectural Wall Crest
  const [sgCanvas, sgCtx] = makeCanvas(512, 140);
  sgCtx.fillStyle = "#0f172a";
  sgCtx.fillRect(0, 0, 512, 140);
  sgCtx.strokeStyle = "#31c5a9";
  sgCtx.lineWidth = 5;
  sgCtx.strokeRect(6, 6, 500, 128);
  sgCtx.fillStyle = "#f8fafc";
  sgCtx.font = "900 44px sans-serif";
  sgCtx.fillText("APEX CORP TOWER", 32, 68);
  sgCtx.fillStyle = "#31c5a9";
  sgCtx.font = "700 22px monospace";
  sgCtx.fillText("GLOBAL HQ · SYNERGY & VELOCITY", 32, 108);
  const floorSign = finalizeColorTex(sgCanvas, maxAnisotropy);

  // 8. CFO Suite Wall Stock Ticker & Candlestick Dashboard
  const [scCanvas, scCtx] = makeCanvas(512, 256);
  scCtx.fillStyle = "#071318";
  scCtx.fillRect(0, 0, 512, 256);
  scCtx.strokeStyle = "#10b981";
  scCtx.lineWidth = 4;
  scCtx.strokeRect(4, 4, 504, 248);
  scCtx.fillStyle = "#34d399";
  scCtx.font = "bold 22px monospace";
  scCtx.fillText("APEX $428.50 ▲ +14.2%   Q4 MARGIN", 22, 38);
  scCtx.strokeStyle = "rgba(52,211,153,0.18)";
  scCtx.lineWidth = 1;
  for (let y = 60; y <= 210; y += 30) {
    scCtx.beginPath();
    scCtx.moveTo(20, y);
    scCtx.lineTo(492, y);
    scCtx.stroke();
  }
  const bars = [42, 66, 55, 84, 72, 105, 96, 124, 118, 146, 138, 162];
  bars.forEach((h, i) => {
    const up = i === 0 || h >= bars[i - 1];
    scCtx.fillStyle = up ? "#22c55e" : "#ef4444";
    const bx = 30 + i * 38;
    scCtx.fillRect(bx, 224 - h, 20, h);
    scCtx.fillRect(bx + 9, 212 - h, 2, h + 16);
  });
  const stockChart = finalizeColorTex(scCanvas, maxAnisotropy);

  // 9. HR Office Motivational Poster ("SYNERGY FIRST")
  const [hrCanvas, hrCtx] = makeCanvas(320, 400);
  hrCtx.fillStyle = "#2e1065";
  hrCtx.fillRect(0, 0, 320, 400);
  hrCtx.strokeStyle = "#e9d5ff";
  hrCtx.lineWidth = 10;
  hrCtx.strokeRect(12, 12, 296, 376);
  hrCtx.fillStyle = "#c084fc";
  hrCtx.beginPath();
  hrCtx.arc(160, 140, 68, 0, Math.PI * 2);
  hrCtx.fill();
  hrCtx.fillStyle = "#faf5ff";
  hrCtx.font = "900 32px sans-serif";
  hrCtx.textAlign = "center";
  hrCtx.fillText("SYNERGY", 160, 260);
  hrCtx.fillStyle = "#f0abfc";
  hrCtx.font = "700 18px monospace";
  hrCtx.fillText("MANDATORY FUN AT 4PM", 160, 305);
  hrCtx.fillStyle = "#cbd5e1";
  hrCtx.font = "600 15px sans-serif";
  hrCtx.fillText("HR COMPLIANCE · DEPT 04", 160, 348);
  const hrPoster = finalizeColorTex(hrCanvas, maxAnisotropy);

  // 10. Cafeteria Espresso Bar Menu Board
  const [cmCanvas, cmCtx] = makeCanvas(512, 220);
  cmCtx.fillStyle = "#1c1512";
  cmCtx.fillRect(0, 0, 512, 220);
  cmCtx.strokeStyle = "#f59e0b";
  cmCtx.lineWidth = 6;
  cmCtx.strokeRect(6, 6, 500, 208);
  cmCtx.fillStyle = "#fbbf24";
  cmCtx.font = "900 30px sans-serif";
  cmCtx.fillText("APEX ROASTERY & CAFE", 28, 48);
  cmCtx.fillStyle = "#fef3c7";
  cmCtx.font = "700 20px monospace";
  cmCtx.fillText("DOUBLE ESPRESSO ...... FREE*", 28, 96);
  cmCtx.fillText("OAT MILK LATTE ....... +HASTE", 28, 132);
  cmCtx.fillText("FRIDAY PIZZA SLICE ... +ENERGY", 28, 168);
  cmCtx.fillStyle = "#f59e0b";
  cmCtx.font = "600 15px sans-serif";
  cmCtx.fillText("*Requires active sprint ticket", 28, 198);
  const cafeMenu = finalizeColorTex(cmCanvas, maxAnisotropy);

  // 11. Casual Lounge Neon Sign
  const [lnCanvas, lnCtx] = makeCanvas(448, 160);
  lnCtx.fillStyle = "#0b1718";
  lnCtx.fillRect(0, 0, 448, 160);
  lnCtx.strokeStyle = "#4ade80";
  lnCtx.lineWidth = 6;
  lnCtx.strokeRect(8, 8, 432, 144);
  lnCtx.fillStyle = "#86efac";
  lnCtx.font = "900 44px sans-serif";
  lnCtx.textAlign = "center";
  lnCtx.fillText("AFK LOUNGE", 224, 78);
  lnCtx.fillStyle = "#f472b6";
  lnCtx.font = "700 22px monospace";
  lnCtx.fillText("NO MEETINGS · NAP PODS OPEN", 224, 122);
  const loungeNeon = finalizeColorTex(lnCanvas, maxAnisotropy);

  // 12. CEO Corner Suite Abstract Executive Art
  const [caCanvas, caCtx] = makeCanvas(384, 256);
  caCtx.fillStyle = "#0f172a";
  caCtx.fillRect(0, 0, 384, 256);
  caCtx.fillStyle = "#1e3a5f";
  caCtx.fillRect(24, 24, 180, 208);
  caCtx.fillStyle = "#eab308";
  caCtx.beginPath();
  caCtx.arc(240, 128, 72, 0, Math.PI * 2);
  caCtx.fill();
  caCtx.fillStyle = "#f8fafc";
  caCtx.fillRect(60, 118, 260, 14);
  caCtx.strokeStyle = "#d4a853";
  caCtx.lineWidth = 10;
  caCtx.strokeRect(6, 6, 372, 244);
  const ceoArt = finalizeColorTex(caCanvas, maxAnisotropy);

  // 13. IT Server Room Telemetry Monitor
  const [ssCanvas, ssCtx] = makeCanvas(384, 224);
  ssCtx.fillStyle = "#06111e";
  ssCtx.fillRect(0, 0, 384, 224);
  ssCtx.strokeStyle = "#38bdf8";
  ssCtx.lineWidth = 4;
  ssCtx.strokeRect(4, 4, 376, 216);
  ssCtx.fillStyle = "#38bdf8";
  ssCtx.font = "bold 20px monospace";
  ssCtx.fillText("PROD-US-EAST  99.98%", 20, 38);
  ssCtx.fillStyle = "#4ade80";
  ssCtx.font = "16px monospace";
  ssCtx.fillText("NODE-01 [OK]  CPU 42%", 20, 78);
  ssCtx.fillText("NODE-02 [OK]  CPU 58%", 20, 108);
  ssCtx.fillStyle = "#fbbf24";
  ssCtx.fillText("NODE-03 [HOT] CPU 91%", 20, 138);
  ssCtx.fillStyle = "#38bdf8";
  for (let i = 0; i < 12; i += 1) {
    ssCtx.fillRect(20 + i * 28, 162, 20, 38 - ((i * 11) % 24));
  }
  const serverScreen = finalizeColorTex(ssCanvas, maxAnisotropy);

  // 14. Retro Arcade Pixel Screen
  const [arCanvas, arCtx] = makeCanvas(256, 200);
  arCtx.fillStyle = "#090418";
  arCtx.fillRect(0, 0, 256, 200);
  arCtx.fillStyle = "#f43f5e";
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 6; c += 1) {
      arCtx.fillStyle = r === 0 ? "#f43f5e" : r === 1 ? "#facc15" : "#22d3ee";
      arCtx.fillRect(26 + c * 34, 28 + r * 26, 22, 14);
    }
  }
  arCtx.fillStyle = "#4ade80";
  arCtx.fillRect(114, 158, 28, 14);
  arCtx.fillRect(124, 148, 8, 12);
  arCtx.fillStyle = "#f8fafc";
  arCtx.fillRect(126, 118, 4, 18);
  const arcadeScreen = finalizeColorTex(arCanvas, maxAnisotropy);

  // 15. Central Atrium Floor Directional Compass Inlay
  const [acCanvas, acCtx] = makeCanvas(512, 512);
  acCtx.clearRect(0, 0, 512, 512);
  acCtx.strokeStyle = "rgba(212, 168, 83, 0.45)";
  acCtx.lineWidth = 4;
  acCtx.beginPath();
  acCtx.arc(256, 256, 220, 0, Math.PI * 2);
  acCtx.stroke();
  acCtx.fillStyle = "rgba(148, 163, 184, 0.72)";
  acCtx.font = "800 22px monospace";
  acCtx.textAlign = "center";
  acCtx.fillText("▲ BOARDROOM", 256, 62);
  acCtx.fillText("▼ BULLPEN", 256, 466);
  acCtx.fillStyle = "rgba(234, 179, 8, 0.78)";
  acCtx.fillText("↖ CEO", 112, 118);
  acCtx.fillStyle = "rgba(52, 211, 153, 0.78)";
  acCtx.fillText("CFO ↗", 400, 118);
  acCtx.fillStyle = "rgba(192, 132, 252, 0.78)";
  acCtx.fillText("◀ HR", 74, 264);
  acCtx.fillStyle = "rgba(56, 189, 248, 0.78)";
  acCtx.fillText("IT ▶", 438, 264);
  const atriumCompass = finalizeColorTex(acCanvas, maxAnisotropy);

  const all = [
    floorColor,
    floorBump,
    checkeredTile,
    woodColor,
    woodBump,
    monitorCode,
    monitorKanban,
    contactShadow,
    whiteboard,
    floorSign,
    stockChart,
    hrPoster,
    cafeMenu,
    loungeNeon,
    ceoArt,
    serverScreen,
    arcadeScreen,
    atriumCompass
  ];

  return {
    floorColor,
    floorBump,
    checkeredTile,
    woodColor,
    woodBump,
    monitorCode,
    monitorKanban,
    contactShadow,
    whiteboard,
    floorSign,
    stockChart,
    hrPoster,
    cafeMenu,
    loungeNeon,
    ceoArt,
    serverScreen,
    arcadeScreen,
    atriumCompass,
    dispose: () => {
      for (const tex of all) tex.dispose();
    }
  };
}
