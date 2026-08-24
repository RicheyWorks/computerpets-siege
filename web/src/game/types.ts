export const W = 960;
export const H = 540;
export const STEP = 1 / 60;
export const TASKBAR = 64;

export type Phase = "title" | "prep" | "combat" | "between" | "tired" | "victory";
export type PetId = "rui" | "paint" | "reed";
export type CreepKind = "paperclip" | "popup" | "ad";

export type Vec = { x: number; y: number };

export const PATH: Vec[] = [
  { x: 480, y: 28 },
  { x: 210, y: 108 },
  { x: 750, y: 176 },
  { x: 240, y: 252 },
  { x: 720, y: 328 },
  { x: 480, y: H - TASKBAR - 10 },
];

export const SLOTS: { id: string; x: number; y: number; home?: boolean }[] = [
  { id: "home", x: 210, y: H - TASKBAR / 2, home: true },
  { id: "left", x: 72, y: 292 },
  { id: "right", x: 888, y: 292 },
];

export const DUMMY = { x: 358, y: 386 };
export const TRAIN_CAP = 8;
export const FEED_COST = 14;

export type Tower = {
  id: string;
  pet: PetId;
  slot: string;
  x: number;
  y: number;
  cooldown: number;
  facing: number;
};

export type Creep = {
  alive: boolean;
  kind: CreepKind;
  x: number;
  y: number;
  wp: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  pathProg: number;
  treats: number;
  hurt: number;
};

export type Shot = {
  alive: boolean;
  kind: "bubble" | "swipe" | "hop";
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  splash: number;
  ttl: number;
  target: Creep | null;
  lastX: number;
  lastY: number;
};

export type Floater = { x: number; y: number; text: string; t: number; life: number };
export type Spark = { x: number; y: number; vx: number; vy: number; t: number; life: number; hue: string };

export type Rank = { dmg: number; range: number };

export type Dojo = {
  day: string;
  ranks: Record<PetId, Rank>;
  spent: Record<PetId, number>;
};

export type FxEvent =
  | { kind: "hit"; x: number; y: number; dmg: number }
  | { kind: "kill"; x: number; y: number; treats: number }
  | { kind: "leak" }
  | { kind: "fire"; pet: PetId; x: number; y: number }
  | { kind: "wave"; n: number }
  | { kind: "win" }
  | { kind: "lose" }
  | { kind: "train"; pet: PetId; stat: "dmg" | "range"; x: number; y: number }
  | { kind: "steam"; pet: PetId; x: number; y: number }
  | { kind: "feed" };

export type World = {
  phase: Phase;
  wave: number;
  lives: number;
  treats: number;
  spawnAcc: number;
  spawnQueue: CreepKind[];
  towers: Tower[];
  creeps: Creep[];
  shots: Shot[];
  events: FxEvent[];
  time: number;
  tiredLeft: number;
  hitstop: number;
  selected: PetId | null;
  dojo: Dojo;
  seed: number;
  horde: boolean;
  gene: import("./horde").Gene | null;
};

export const PETS: Record<
  PetId,
  { name: string; cost: number; range: number; dmg: number; rate: number; splash: number; shot: Shot["kind"] }
> = {
  rui: { name: "Rui", cost: 0, range: 150, dmg: 20, rate: 0.95, splash: 0, shot: "swipe" },
  paint: { name: "Paint", cost: 40, range: 230, dmg: 11, rate: 1.25, splash: 0, shot: "bubble" },
  reed: { name: "Reed", cost: 50, range: 165, dmg: 14, rate: 0.62, splash: 78, shot: "hop" },
};

export const CREEPS: Record<CreepKind, { hp: number; speed: number; radius: number; treats: number }> = {
  paperclip: { hp: 28, speed: 52, radius: 16, treats: 6 },
  popup: { hp: 44, speed: 44, radius: 20, treats: 9 },
  ad: { hp: 90, speed: 34, radius: 24, treats: 16 },
};
