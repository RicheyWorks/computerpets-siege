import { frame, sprites } from "./sprites";
import { petStats } from "./sim";
import { DUMMY, H, PATH, SLOTS, TASKBAR, W, type Floater, type Spark, type World } from "./types";

export type View = {
  floaters: Floater[];
  sparks: Spark[];
  trauma: number;
  reduce: boolean;
};

export function emptyView(): View {
  return { floaters: [], sparks: [], trauma: 0, reduce: false };
}

function drawImg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
  opts?: { flash?: boolean; flip?: boolean; rot?: number; alpha?: number },
) {
  if (!img || !img.naturalWidth) return;
  ctx.save();
  ctx.translate(x, y);
  if (opts?.rot) ctx.rotate(opts.rot);
  if (opts?.flip) ctx.scale(-1, 1);
  ctx.globalAlpha = opts?.alpha ?? 1;
  if (opts?.flash) ctx.filter = "brightness(2.4)";
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  w: World,
  view: View,
  cssW: number,
  cssH: number,
) {
  const scale = Math.min(cssW / W, cssH / H);
  const ox = (cssW - W * scale) / 2;
  const oy = (cssH - H * scale) / 2;
  const sp = sprites();
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, ox, oy);

  let shakeX = 0;
  let shakeY = 0;
  if (!view.reduce && view.trauma > 0) {
    const s = view.trauma * view.trauma;
    shakeX = (Math.random() * 2 - 1) * 10 * s;
    shakeY = (Math.random() * 2 - 1) * 8 * s;
  }
  ctx.translate(shakeX, shakeY);

  const wall = sp.wallpaper;
  if (wall.complete && wall.naturalWidth) {
    ctx.drawImage(wall, 0, 0, W, H);
  } else {
    ctx.fillStyle = "#2a4538";
    ctx.fillRect(0, 0, W, H);
  }

  // faint path
  ctx.strokeStyle = "rgba(243,234,215,0.18)";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  PATH.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  drawDummy(ctx, w);

  // slots while placing
  if (w.phase === "prep" || w.phase === "between") {
    for (const s of SLOTS) {
      const taken = w.towers.some((t) => t.slot === s.id);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 28, 0, Math.PI * 2);
      ctx.strokeStyle = taken ? "rgba(126,163,122,0.7)" : "rgba(196,92,62,0.85)";
      ctx.lineWidth = 2;
      ctx.setLineDash(taken ? [] : [5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // creeps
  for (const c of w.creeps) {
    if (!c.alive) continue;
    const sheet = c.kind === "ad" ? sp.ad : c.kind === "popup" ? sp.popup : sp.paperclip;
    const img = frame(sheet, w.time, 7);
    const size = c.kind === "ad" ? 58 : c.kind === "popup" ? 52 : 46;
    drawImg(ctx, img, c.x, c.y, size, { flash: c.hurt > 0, flip: c.x > 480 });
    const bw = size * 0.7;
    ctx.fillStyle = "rgba(28,23,18,0.55)";
    ctx.fillRect(c.x - bw / 2, c.y - size / 2 - 8, bw, 4);
    ctx.fillStyle = "#7ea37a";
    ctx.fillRect(c.x - bw / 2, c.y - size / 2 - 8, bw * Math.max(0, c.hp / c.maxHp), 4);
  }

  // shots
  for (const s of w.shots) {
    if (!s.alive) continue;
    if (s.kind === "bubble") {
      drawImg(ctx, frame(sp.bubble, w.time, 10), s.x, s.y, 28);
    } else if (s.kind === "swipe") {
      drawImg(ctx, frame(sp.swipe, 1 - s.ttl / 0.18, 14), s.x + 36, s.y - 8, 72, { rot: s.target ? Math.atan2(s.lastY - s.y, s.lastX - s.x) : 0 });
    } else {
      ctx.fillStyle = "rgba(126,163,122,0.35)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 48, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // towers
  if (w.phase !== "title") {
    for (const t of w.towers) {
      const spec = petStats(w, t.pet);
      const attacking = t.cooldown > 1 / spec.rate - 0.18;
      let sh = sp.ruiIdle;
      if (t.pet === "rui") {
        sh = w.phase === "tired" ? sp.ruiSit : attacking ? sp.ruiWalk : sp.ruiIdle;
      } else if (t.pet === "paint") sh = attacking ? sp.paintWalk : sp.paintIdle;
      else sh = attacking ? sp.reedWalk : sp.reedIdle;
      const size = t.pet === "rui" ? 88 : 92;
      const bob = w.phase === "tired" && t.pet === "rui" ? 0 : Math.sin(w.time * 3 + t.x) * 3;
      drawImg(ctx, frame(sh, w.time, 6), t.x, t.y + bob - 8, size, {
        flip: t.facing > Math.PI / 2 || t.facing < -Math.PI / 2,
      });
      if (w.phase === "prep" || w.phase === "between" || w.selected === t.pet) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, spec.range, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(243,234,215,0.16)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  // title Rui walk if no combat and rui exists
  if (w.phase === "title") {
    const rui = w.towers.find((t) => t.pet === "rui");
    if (rui) {
      const x = ((w.time * 42) % (W + 80)) - 40;
      drawImg(ctx, frame(sp.ruiWalk, w.time, 8), x, H - TASKBAR / 2 - 10, 84);
    }
  }

  // taskbar
  ctx.fillStyle = "rgba(20,17,14,0.92)";
  ctx.fillRect(0, H - TASKBAR, W, TASKBAR);
  ctx.fillStyle = "rgba(243,234,215,0.08)";
  ctx.fillRect(0, H - TASKBAR, W, 1);

  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i < w.lives ? "#f3ead7" : "rgba(196,92,62,0.45)";
    ctx.fillRect(W - 22 - (7 - i) * 14, H - 38, 10, 10);
  }

  // leak well
  ctx.fillStyle = "rgba(196,92,62,0.25)";
  ctx.beginPath();
  ctx.arc(PATH[PATH.length - 1].x, PATH[PATH.length - 1].y, 16, 0, Math.PI * 2);
  ctx.fill();

  for (const p of view.sparks) {
    ctx.globalAlpha = Math.max(0, p.t / p.life);
    ctx.fillStyle = p.hue;
    ctx.fillRect(p.x, p.y, 3, 3);
    ctx.globalAlpha = 1;
  }
  ctx.font = "600 14px Figtree, sans-serif";
  ctx.textAlign = "center";
  for (const f of view.floaters) {
    ctx.globalAlpha = Math.max(0, f.t / f.life);
    ctx.fillStyle = "#f3ead7";
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

export function screenToWorld(cssX: number, cssY: number, cssW: number, cssH: number) {
  const scale = Math.min(cssW / W, cssH / H);
  const ox = (cssW - W * scale) / 2;
  const oy = (cssH - H * scale) / 2;
  return { x: (cssX - ox) / scale, y: (cssY - oy) / scale };
}

function drawDummy(ctx: CanvasRenderingContext2D, w: World) {
  if (w.phase === "title") return;
  const { x, y } = DUMMY;
  const pulse = w.phase === "prep" || w.phase === "between" ? 1 + Math.sin(w.time * 4) * 0.04 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = "#5a3d28";
  ctx.fillRect(-7, -38, 14, 52);
  ctx.fillStyle = "#8a6240";
  ctx.beginPath();
  ctx.ellipse(0, -46, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c45c3e";
  ctx.fillRect(-18, -28, 8, 6);
  ctx.fillRect(10, -22, 8, 6);
  ctx.fillStyle = "rgba(243,234,215,0.85)";
  ctx.font = "600 11px Figtree, sans-serif";
  ctx.textAlign = "center";
  if (w.phase === "prep" || w.phase === "between") {
    ctx.fillText("Dojo", 0, 28);
  }
  ctx.restore();
}
