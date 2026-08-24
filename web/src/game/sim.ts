import {
  CREEPS,
  DUMMY,
  FEED_COST,
  PATH,
  PETS,
  SLOTS,
  STEP,
  TRAIN_CAP,
  type Creep,
  type CreepKind,
  type Dojo,
  type PetId,
  type Shot,
  type World,
} from "./types";
import { composeGene, daySeed, expandGene } from "./horde";

const DOJO_KEY = "siege-dojo-v1";

function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function blankRanks(): Dojo["ranks"] {
  return {
    rui: { dmg: 0, range: 0 },
    paint: { dmg: 0, range: 0 },
    reed: { dmg: 0, range: 0 },
  };
}

export function emptyDojo(): Dojo {
  return {
    day: today(),
    ranks: blankRanks(),
    spent: { rui: 0, paint: 0, reed: 0 },
  };
}

export function loadDojo(): Dojo {
  if (typeof window === "undefined") return emptyDojo();
  try {
    const raw = localStorage.getItem(DOJO_KEY);
    if (!raw) return emptyDojo();
    const s = JSON.parse(raw) as Dojo;
    if (!s.ranks || !s.spent) return emptyDojo();
    if (s.day !== today()) {
      return { day: today(), ranks: s.ranks, spent: { rui: 0, paint: 0, reed: 0 } };
    }
    return s;
  } catch {
    return emptyDojo();
  }
}

export function saveDojo(s: Dojo) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DOJO_KEY, JSON.stringify(s));
}

export function petStats(w: World, pet: PetId) {
  const b = PETS[pet];
  const r = w.dojo.ranks[pet];
  return {
    range: b.range + r.range * 10,
    dmg: b.dmg + r.dmg * 3,
    rate: b.rate,
    splash: b.splash,
    shot: b.shot,
  };
}

export function freshWorld(): World {
  const home = SLOTS[0];
  return {
    phase: "title",
    wave: 0,
    lives: 7,
    treats: 100,
    spawnAcc: 0,
    spawnQueue: [],
    towers: [
      {
        id: "rui-home",
        pet: "rui",
        slot: home.id,
        x: home.x,
        y: home.y,
        cooldown: 0,
        facing: 0,
      },
    ],
    creeps: [],
    shots: [],
    events: [],
    time: 0,
    tiredLeft: 0,
    hitstop: 0,
    selected: null,
    dojo: loadDojo(),
    seed: daySeed(),
    horde: false,
    gene: null,
  };
}

function spawnCreep(w: World, kind: CreepKind) {
  const spec = CREEPS[kind];
  const start = PATH[0];
  const mul = w.gene?.hpMul ?? 1;
  const hp = Math.round(spec.hp * mul);
  const c: Creep = {
    alive: true,
    kind,
    x: start.x + (Math.random() - 0.5) * 10,
    y: start.y,
    wp: 1,
    hp,
    maxHp: hp,
    speed: spec.speed * (0.94 + Math.random() * 0.12),
    radius: spec.radius,
    pathProg: 0,
    treats: spec.treats + (w.horde ? 2 : 0),
    hurt: 0,
  };
  w.creeps.push(c);
}

function leak(w: World, c: Creep) {
  c.alive = false;
  w.lives -= 1;
  w.events.push({ kind: "leak" });
  if (w.lives <= 0) {
    w.phase = "tired";
    w.tiredLeft = 30;
    w.spawnQueue = [];
    w.creeps.forEach((x) => {
      x.alive = false;
    });
    w.events.push({ kind: "lose" });
  }
}

function kill(w: World, c: Creep) {
  c.alive = false;
  w.treats += c.treats;
  w.events.push({ kind: "kill", x: c.x, y: c.y, treats: c.treats });
}

function firstInRange(w: World, t: World["towers"][number], range: number): Creep | null {
  const r2 = range * range;
  let best: Creep | null = null;
  let bestProg = -1;
  for (const c of w.creeps) {
    if (!c.alive) continue;
    if (dist2(t.x, t.y, c.x, c.y) > r2) continue;
    if (c.pathProg > bestProg) {
      bestProg = c.pathProg;
      best = c;
    }
  }
  return best;
}

function fire(w: World, t: World["towers"][number], target: Creep) {
  const spec = petStats(w, t.pet);
  t.cooldown = 1 / spec.rate;
  t.facing = Math.atan2(target.y - t.y, target.x - t.x);
  w.events.push({ kind: "fire", pet: t.pet, x: t.x, y: t.y });
  const shot: Shot = {
    alive: true,
    kind: spec.shot,
    x: t.x,
    y: t.y,
    vx: 0,
    vy: 0,
    dmg: spec.dmg,
    splash: spec.splash,
    ttl: spec.shot === "swipe" ? 0.18 : 1.4,
    target,
    lastX: target.x,
    lastY: target.y,
  };
  if (spec.shot === "swipe") {
    applyHit(w, target, spec.dmg, spec.splash);
  } else if (spec.shot === "hop") {
    applyHit(w, target, spec.dmg, spec.splash);
    shot.x = target.x;
    shot.y = target.y;
  } else {
    const ang = t.facing;
    shot.vx = Math.cos(ang) * 280;
    shot.vy = Math.sin(ang) * 280;
  }
  w.shots.push(shot);
}

function applyHit(w: World, c: Creep, dmg: number, splash: number) {
  if (!c.alive) return;
  c.hp -= dmg;
  c.hurt = 0.12;
  w.events.push({ kind: "hit", x: c.x, y: c.y, dmg });
  w.hitstop = Math.max(w.hitstop, 0.045);
  if (c.hp <= 0) kill(w, c);
  if (splash > 0) {
    const s2 = splash * splash;
    for (const o of w.creeps) {
      if (!o.alive || o === c) continue;
      if (dist2(c.x, c.y, o.x, o.y) <= s2) {
        o.hp -= dmg * 0.55;
        o.hurt = 0.1;
        if (o.hp <= 0) kill(w, o);
      }
    }
  }
}

function stepCreeps(w: World, dt: number) {
  for (const c of w.creeps) {
    if (!c.alive) continue;
    c.hurt = Math.max(0, c.hurt - dt);
    const tgt = PATH[c.wp];
    if (!tgt) {
      leak(w, c);
      continue;
    }
    const dx = tgt.x - c.x;
    const dy = tgt.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 5) {
      c.wp += 1;
      if (c.wp >= PATH.length) leak(w, c);
      continue;
    }
    const sp = c.speed * dt;
    c.x += (dx / d) * sp;
    c.y += (dy / d) * sp;
    c.pathProg += sp;
  }
}

function stepTowers(w: World, dt: number) {
  for (const t of w.towers) {
    t.cooldown = Math.max(0, t.cooldown - dt);
    if (t.cooldown > 0) continue;
    const spec = petStats(w, t.pet);
    const target = firstInRange(w, t, spec.range);
    if (target) fire(w, t, target);
  }
}

function stepShots(w: World, dt: number) {
  for (const s of w.shots) {
    if (!s.alive) continue;
    s.ttl -= dt;
    if (s.kind !== "bubble") {
      if (s.ttl <= 0) s.alive = false;
      continue;
    }
    const tgt = s.target && s.target.alive ? s.target : null;
    const tx = tgt ? tgt.x : s.lastX;
    const ty = tgt ? tgt.y : s.lastY;
    if (tgt) {
      s.lastX = tgt.x;
      s.lastY = tgt.y;
    }
    const dx = tx - s.x;
    const dy = ty - s.y;
    const d = Math.hypot(dx, dy) || 1;
    s.vx = (dx / d) * 280;
    s.vy = (dy / d) * 280;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (d < 16) {
      if (tgt) applyHit(w, tgt, s.dmg, s.splash);
      s.alive = false;
    } else if (s.ttl <= 0) {
      s.alive = false;
    }
  }
}

function stepSpawn(w: World, dt: number) {
  if (w.phase !== "combat") return;
  w.spawnAcc += dt;
  const interval = w.gene?.interval ?? 0.9;
  if (w.spawnQueue.length && w.spawnAcc >= interval) {
    w.spawnAcc = 0;
    const kind = w.spawnQueue.shift()!;
    spawnCreep(w, kind);
  }
  const living = w.creeps.some((c) => c.alive);
  if (!living && w.spawnQueue.length === 0 && w.wave > 0) {
    w.phase = "between";
    w.treats += w.horde ? 22 : 18;
    if (w.wave === 3 && !w.horde) w.events.push({ kind: "win" });
  }
}

export function startWave(w: World) {
  if (w.phase !== "prep" && w.phase !== "between" && w.phase !== "title") return;
  if (w.wave >= 3 && !w.horde && w.phase === "between") return;
  w.wave += 1;
  w.gene = composeGene(w.seed, w.wave);
  w.spawnQueue = expandGene(w.gene, w.seed, w.wave);
  w.spawnAcc = 0.4;
  w.creeps = [];
  w.shots = [];
  w.phase = "combat";
  w.events.push({ kind: "wave", n: w.wave });
}

export function holdTheLine(w: World) {
  if (w.phase !== "between" || w.wave < 3) return;
  w.horde = true;
  startWave(w);
}

export function walkItOff(w: World) {
  if (w.phase !== "between") return;
  w.phase = "victory";
}

export function beginPrep(w: World) {
  w.phase = "prep";
  w.wave = 0;
  w.lives = 7;
  w.treats = 100;
  w.spawnQueue = [];
  w.creeps = [];
  w.shots = [];
  w.tiredLeft = 0;
  w.towers = w.towers.filter((t) => t.pet === "rui");
  w.selected = null;
  w.dojo = loadDojo();
  w.seed = daySeed();
  w.horde = false;
  w.gene = composeGene(w.seed, 1);
}

export function canPlace(w: World, pet: PetId, slotId: string) {
  if (pet === "rui") return false;
  if (w.towers.some((t) => t.pet === pet)) return false;
  if (w.towers.some((t) => t.slot === slotId)) return false;
  if (w.towers.length >= 3) return false;
  const slot = SLOTS.find((s) => s.id === slotId);
  if (!slot || slot.home) return false;
  if (w.treats < PETS[pet].cost) return false;
  if (w.phase !== "prep" && w.phase !== "between") return false;
  return true;
}

export function placePet(w: World, pet: PetId, slotId: string) {
  if (!canPlace(w, pet, slotId)) return false;
  const slot = SLOTS.find((s) => s.id === slotId)!;
  w.treats -= PETS[pet].cost;
  w.towers.push({
    id: `${pet}-${slotId}`,
    pet,
    slot: slotId,
    x: slot.x,
    y: slot.y,
    cooldown: 0.2,
    facing: 0,
  });
  w.selected = null;
  return true;
}

export function slotNear(x: number, y: number) {
  let best = SLOTS[0];
  let bestD = Infinity;
  for (const s of SLOTS) {
    const d = dist2(x, y, s.x, s.y);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return bestD < 70 * 70 ? best : null;
}

export function nearDummy(x: number, y: number) {
  return dist2(x, y, DUMMY.x, DUMMY.y) < 52 * 52;
}

export function train(w: World, pet: PetId, stat: "dmg" | "range") {
  if (w.phase !== "prep" && w.phase !== "between") return false;
  if (w.dojo.spent[pet] >= TRAIN_CAP) {
    w.events.push({ kind: "steam", pet, x: DUMMY.x, y: DUMMY.y - 40 });
    return false;
  }
  w.dojo.spent[pet] += 1;
  w.dojo.ranks[pet][stat] += 1;
  saveDojo(w.dojo);
  w.events.push({ kind: "train", pet, stat, x: DUMMY.x, y: DUMMY.y - 36 });
  return true;
}

export function feed(w: World) {
  if (w.phase !== "prep" && w.phase !== "between") return false;
  if (w.lives >= 7) return false;
  if (w.treats < FEED_COST) return false;
  w.treats -= FEED_COST;
  w.lives += 1;
  w.events.push({ kind: "feed" });
  return true;
}

export function capLeft(w: World, pet: PetId) {
  return Math.max(0, TRAIN_CAP - w.dojo.spent[pet]);
}

export function step(w: World, dt: number) {
  w.time += dt;
  if (w.phase === "tired") {
    w.tiredLeft = Math.max(0, w.tiredLeft - dt);
    if (w.tiredLeft <= 0) w.phase = "title";
    return;
  }
  if (w.hitstop > 0) {
    w.hitstop -= dt;
    dt *= 0.15;
  }
  if (w.phase === "combat") {
    stepSpawn(w, dt);
    stepCreeps(w, dt);
    stepTowers(w, dt);
    stepShots(w, dt);
    w.creeps = w.creeps.filter((c) => c.alive);
    w.shots = w.shots.filter((s) => s.alive);
  } else {
    stepTowers(w, dt);
    w.shots = w.shots.filter((s) => {
      s.ttl -= dt;
      return s.alive && s.ttl > 0;
    });
  }
}

let acc = 0;

export function resetClock() {
  acc = 0;
}

export function tick(w: World, frameDt: number) {
  acc += Math.min(frameDt, 0.1);
  while (acc >= STEP) {
    step(w, STEP);
    acc -= STEP;
  }
}
