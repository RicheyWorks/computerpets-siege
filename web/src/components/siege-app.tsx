"use client";

import { useEffect, useRef, useState } from "react";
import { Dumbbell, Utensils, Volume2, VolumeX, Waves } from "lucide-react";
import {
  beginPrep,
  capLeft,
  feed,
  holdTheLine,
  nearDummy,
  petStats,
  placePet,
  resetClock,
  slotNear,
  startWave,
  tick,
  train,
  walkItOff,
  freshWorld,
} from "@/game/sim";
import { emptyView, renderWorld, screenToWorld } from "@/game/render";
import { composeGene, geneCode } from "@/game/horde";
import {
  isMuted,
  setMuted,
  sfxFire,
  sfxHit,
  sfxKill,
  sfxLeak,
  sfxLose,
  sfxPlace,
  sfxSteam,
  sfxTrain,
  sfxFeed,
  sfxWin,
  unlockAudio,
} from "@/game/audio";
import { FEED_COST, PETS, TRAIN_CAP, type PetId, type World } from "@/game/types";

const REDUCE_KEY = "siege-reduce-motion";
const BEST_KEY = "siege-best-wave";

export function SiegeApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World>(freshWorld());
  const viewRef = useRef(emptyView());
  const [ui, setUi] = useState(() => snapshot(worldRef.current));
  const [muted, setMutedUi] = useState(false);
  const [reduce, setReduce] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(REDUCE_KEY) === "1" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [best, setBest] = useState(() => Number(typeof window !== "undefined" ? localStorage.getItem(BEST_KEY) ?? 0 : 0));

  useEffect(() => {
    viewRef.current.reduce = reduce;
    localStorage.setItem(REDUCE_KEY, reduce ? "1" : "0");
  }, [reduce]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const w = worldRef.current;
      tick(w, dt);
      const view = viewRef.current;
      view.reduce = reduce;
      view.trauma = Math.max(0, view.trauma - dt * 1.6);
      for (const e of w.events) {
        if (e.kind === "hit") {
          if (!reduce) view.trauma = Math.min(1, view.trauma + 0.22);
          view.floaters.push({ x: e.x, y: e.y - 12, text: String(e.dmg), t: 0.6, life: 0.6 });
          for (let i = 0; i < 6; i++) {
            view.sparks.push({
              x: e.x,
              y: e.y,
              vx: (Math.random() - 0.5) * 80,
              vy: (Math.random() - 0.5) * 80,
              t: 0.35,
              life: 0.35,
              hue: "#f3ead7",
            });
          }
          sfxHit();
        } else if (e.kind === "kill") {
          view.floaters.push({ x: e.x, y: e.y - 20, text: `+${e.treats}`, t: 0.9, life: 0.9 });
          sfxKill();
        } else if (e.kind === "leak") {
          if (!reduce) view.trauma = Math.min(1, view.trauma + 0.55);
          sfxLeak();
        } else if (e.kind === "fire") sfxFire(e.pet);
        else if (e.kind === "win") {
          sfxWin();
          const b = Math.max(best, w.wave);
          setBest(b);
          localStorage.setItem(BEST_KEY, String(b));
        } else if (e.kind === "wave") {
          const b = Math.max(best, e.n);
          if (b !== best) {
            setBest(b);
            localStorage.setItem(BEST_KEY, String(b));
          }
        }
        else if (e.kind === "train") {
          view.floaters.push({
            x: e.x,
            y: e.y,
            text: e.stat === "dmg" ? "+dmg" : "+reach",
            t: 0.8,
            life: 0.8,
          });
          sfxTrain();
        } else if (e.kind === "steam") {
          view.floaters.push({ x: e.x, y: e.y, text: "steam", t: 0.9, life: 0.9 });
          sfxSteam();
        } else if (e.kind === "feed") sfxFeed();
        else if (e.kind === "lose") {
          sfxLose();
          const b = Math.max(best, w.wave);
          setBest(b);
          localStorage.setItem(BEST_KEY, String(b));
        }
      }
      for (const f of view.floaters) {
        f.t -= dt;
        f.y -= 22 * dt;
      }
      view.floaters = view.floaters.filter((f) => f.t > 0);
      for (const p of view.sparks) {
        p.t -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      view.sparks = view.sparks.filter((p) => p.t > 0);
      w.events.length = 0;

      const parent = canvas.parentElement!;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = parent.clientWidth;
      const cssH = parent.clientHeight;
      const bw = Math.max(1, Math.floor(cssW * dpr));
      const bh = Math.max(1, Math.floor(cssH * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = true;
        renderWorld(ctx, w, view, cssW, cssH);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const id = window.setInterval(() => setUi(snapshot(worldRef.current)), 180);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, [reduce, best]);

  function onCanvasPointer(ev: React.PointerEvent<HTMLCanvasElement>) {
    unlockAudio();
    const canvas = ev.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const world = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height);
    const w = worldRef.current;
    if (nearDummy(world.x, world.y) && (w.phase === "prep" || w.phase === "between")) {
      train(w, w.selected ?? "rui", "dmg");
      setUi(snapshot(w));
      return;
    }
    if (!w.selected) return;
    const slot = slotNear(world.x, world.y);
    if (!slot) return;
    if (placePet(w, w.selected, slot.id)) sfxPlace();
    setUi(snapshot(w));
  }

  function pick(pet: PetId) {
    unlockAudio();
    const w = worldRef.current;
    w.selected = w.selected === pet ? null : pet;
    setUi(snapshot(w));
  }

  function play() {
    unlockAudio();
    const w = worldRef.current;
    resetClock();
    beginPrep(w);
    setUi(snapshot(w));
  }

  function wave() {
    unlockAudio();
    startWave(worldRef.current);
    setUi(snapshot(worldRef.current));
  }

  function horde() {
    unlockAudio();
    holdTheLine(worldRef.current);
    setUi(snapshot(worldRef.current));
  }

  function rest() {
    unlockAudio();
    walkItOff(worldRef.current);
    setUi(snapshot(worldRef.current));
  }

  function doTrain(stat: "dmg" | "range") {
    unlockAudio();
    const w = worldRef.current;
    train(w, w.selected ?? "rui", stat);
    setUi(snapshot(w));
  }

  function doFeed() {
    unlockAudio();
    feed(worldRef.current);
    setUi(snapshot(worldRef.current));
  }

  const w = ui;
  const placing = w.phase === "prep" || w.phase === "between";

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-ink text-fg font-sans">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={onCanvasPointer}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5">
        <div className="pointer-events-auto rounded-lg bg-bar/80 px-3 py-2 backdrop-blur-sm">
          <p className="font-display text-xl leading-tight tracking-tight text-cream">Siege</p>
          <p className="text-xs text-muted">ComputerPets</p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2 rounded-lg bg-bar/80 px-2 py-2 backdrop-blur-sm">
          <Stat label="Wave" value={String(w.wave || "—")} />
          <Stat label="Desktop" value={`${w.lives}`} warn={w.lives <= 2} />
          <Stat label="Treats" value={String(w.treats)} />
          <Stat label="Rui" value={`${w.dmg}`} />
          <Stat label="DNA" value={w.dna} />
          <button
            type="button"
            className="grid size-11 place-items-center rounded-md text-cream hover:bg-ink-soft"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => {
              unlockAudio();
              const next = !isMuted();
              setMuted(next);
              setMutedUi(next);
            }}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            type="button"
            className={`grid size-11 place-items-center rounded-md ${reduce ? "text-rust" : "text-cream"} hover:bg-ink-soft`}
            aria-label="Reduce motion"
            onClick={() => setReduce((v) => !v)}
          >
            <Waves size={18} />
          </button>
        </div>
      </header>

      {w.phase === "title" && (
        <Panel>
          <h1 className="font-display text-4xl tracking-tight text-cream sm:text-5xl">Siege</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-cream-dim">
            Creeps crawl the forest desktop toward the taskbar. Rui is already home. Train at the Dojo. After three
            waves, Horde DNA keeps coming — today's seed, not a shop table. Pets get tired. Tokens never burn.
          </p>
          {best > 0 && <p className="mt-2 text-xs text-muted">Furthest wave {best}</p>}
          <button
            type="button"
            className="mt-6 h-12 min-w-44 rounded-md bg-rust px-6 text-sm font-medium text-cream hover:bg-rust-deep"
            onClick={play}
          >
            Sit Rui down
          </button>
        </Panel>
      )}

      {w.phase === "tired" && (
        <Panel>
          <h2 className="font-display text-3xl text-cream">Rui hid</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-cream-dim">
            The desktop leaked. Rui is not gone — sitting it out for {Math.ceil(w.tiredLeft)}s, then the walk resumes.
            No permadeath.
          </p>
          <button
            type="button"
            className="mt-6 h-12 rounded-md bg-moss-mid px-6 text-sm font-medium text-cream"
            onClick={play}
          >
            Walk back now
          </button>
        </Panel>
      )}

      {w.phase === "victory" && (
        <Panel>
          <h2 className="font-display text-3xl text-cream">Taskbar holds</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-cream-dim">
            {w.horde
              ? `Horde held through wave ${w.wave}. DNA ${w.dna}. Trained ranks stay. Rui walks again whenever you close this.`
              : "Three waves down. Trained ranks stay for tomorrow. Hold the line next time, or walk it off like this."}
          </p>
          <button
            type="button"
            className="mt-6 h-12 rounded-md bg-rust px-6 text-sm font-medium text-cream"
            onClick={play}
          >
            Again
          </button>
        </Panel>
      )}

      {placing && (
        <div className="absolute inset-x-0 bottom-[4.6rem] z-10 flex flex-col items-center gap-3 px-3 pb-[env(safe-area-inset-bottom)]">
          <p className="rounded-md bg-bar/80 px-3 py-1.5 text-xs text-cream-dim backdrop-blur-sm">
            Next DNA {w.nextDna}
            {w.selected
              ? ` · tap a slot to seat ${PETS[w.selected].name}`
              : " · pick a pet, or tap the Dojo dummy"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <PetCard
              pet="paint"
              selected={w.selected === "paint"}
              owned={w.towers.some((t) => t.pet === "paint")}
              treats={w.treats}
              bonus={w.ranks.paint}
              onPick={pick}
            />
            <PetCard
              pet="reed"
              selected={w.selected === "reed"}
              owned={w.towers.some((t) => t.pet === "reed")}
              treats={w.treats}
              bonus={w.ranks.reed}
              onPick={pick}
            />
            <button
              type="button"
              className="flex h-12 items-center gap-2 rounded-md border border-cream/15 bg-bar/85 px-4 text-sm font-medium text-cream hover:bg-ink-soft"
              onClick={() => doTrain("dmg")}
            >
              <Dumbbell size={16} />
              Train {w.selected ? PETS[w.selected].name : "Rui"}
              <span className="text-xs text-muted">{w.capLeft}/{TRAIN_CAP}</span>
            </button>
            <button
              type="button"
              className="flex h-12 items-center gap-2 rounded-md border border-cream/15 bg-bar/85 px-4 text-sm font-medium text-cream hover:bg-ink-soft disabled:opacity-40"
              disabled={w.lives >= 7 || w.treats < FEED_COST}
              onClick={doFeed}
            >
              <Utensils size={16} />
              Feed
              <span className="text-xs text-muted">{FEED_COST}</span>
            </button>
            {w.wave >= 3 && !w.horde && w.phase === "between" ? (
              <>
                <button
                  type="button"
                  className="h-12 rounded-md bg-rust px-5 text-sm font-medium text-cream hover:bg-rust-deep"
                  onClick={horde}
                >
                  Hold the line
                </button>
                <button
                  type="button"
                  className="h-12 rounded-md border border-cream/15 bg-bar/85 px-5 text-sm font-medium text-cream hover:bg-ink-soft"
                  onClick={rest}
                >
                  Walk it off
                </button>
              </>
            ) : (
              <button
                type="button"
                className="h-12 rounded-md bg-rust px-5 text-sm font-medium text-cream hover:bg-rust-deep"
                onClick={wave}
              >
                {w.phase === "prep" ? "Start wave 1" : `Start wave ${w.wave + 1}`}
              </button>
            )}
          </div>
        </div>
      )}

      {w.phase === "combat" && (
        <p className="pointer-events-none absolute bottom-[4.75rem] left-1/2 z-10 -translate-x-1/2 rounded-md bg-bar/70 px-3 py-1 text-xs text-cream-dim">
          {w.horde || w.wave > 3
            ? `Horde wave ${w.wave} · ${w.dna}`
            : `Wave ${w.wave} of 3 · ${w.dna}`}
        </p>
      )}
    </div>
  );
}

function snapshot(w: World) {
  const focus = w.selected ?? "rui";
  return {
    phase: w.phase,
    wave: w.wave,
    lives: w.lives,
    treats: w.treats,
    tiredLeft: w.tiredLeft,
    selected: w.selected,
    towers: w.towers.map((t) => ({ pet: t.pet, slot: t.slot })),
    ranks: w.dojo.ranks,
    capLeft: capLeft(w, focus),
    dmg: petStats(w, "rui").dmg,
    horde: w.horde,
    dna: w.gene ? geneCode(w.gene) : geneCode(composeGene(w.seed, Math.max(1, w.wave))),
    nextDna: geneCode(composeGene(w.seed, w.wave + 1)),
  };
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="min-w-14 px-2">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className={`font-display text-lg tabular-nums leading-none ${warn ? "text-rust" : "text-cream"}`}>{value}</p>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-ink/35 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-lg border border-cream/15 bg-bar/90 p-6 shadow-xl sm:p-8">{children}</div>
    </div>
  );
}

function PetCard({
  pet,
  selected,
  owned,
  treats,
  bonus,
  onPick,
}: {
  pet: PetId;
  selected: boolean;
  owned: boolean;
  treats: number;
  bonus: { dmg: number; range: number };
  onPick: (p: PetId) => void;
}) {
  const spec = PETS[pet];
  const affordable = treats >= spec.cost;
  const disabled = owned || !affordable;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(pet)}
      className={`flex h-16 min-w-36 items-center gap-3 rounded-md border px-3 text-left ${
        selected ? "border-rust bg-rust/20" : "border-cream/15 bg-bar/85"
      } disabled:opacity-40`}
    >
      <img src={`/sprites/${pet}/idle/1.png`} alt="" className="size-12 object-contain" />
      <span>
        <span className="block text-sm font-medium text-cream">{spec.name}</span>
        <span className="block text-xs text-muted">
          {owned ? "Seated" : `${spec.cost} treats`}
          {bonus.dmg > 0 ? ` · +${bonus.dmg * 3} dmg` : ""}
        </span>
      </span>
    </button>
  );
}
