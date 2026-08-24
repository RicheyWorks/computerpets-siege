import type { CreepKind } from "./types";

export type Gene = {
  paperclip: number;
  popup: number;
  ad: number;
  hpMul: number;
  interval: number;
};

export function daySeed(): number {
  const d = new Date().toISOString().slice(0, 10);
  let h = 2166136261;
  for (const c of `${d}-horde`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function composeGene(seed: number, wave: number): Gene {
  const r = rng(seed + wave * 9973);
  if (wave <= 1) return { paperclip: 8, popup: 0, ad: 0, hpMul: 1, interval: 0.9 };
  if (wave === 2) return { paperclip: 6, popup: 5, ad: 0, hpMul: 1, interval: 0.85 };
  if (wave === 3) return { paperclip: 5, popup: 5, ad: 3, hpMul: 1.05, interval: 0.72 };
  const n = wave - 3;
  return {
    paperclip: 6 + n + Math.floor(r() * 3),
    popup: 3 + Math.floor(n * 0.9) + Math.floor(r() * 3),
    ad: Math.min(10, 1 + Math.floor(n * 0.7) + (r() > 0.45 ? 1 : 0)),
    hpMul: 1 + n * 0.14,
    interval: Math.max(0.36, 0.68 - n * 0.028),
  };
}

export function geneCode(g: Gene): string {
  return `${g.paperclip ? `P${g.paperclip}` : ""}${g.popup ? `U${g.popup}` : ""}${g.ad ? `A${g.ad}` : ""}` || "—";
}

export function expandGene(g: Gene, seed: number, wave: number): CreepKind[] {
  const q: CreepKind[] = [
    ...Array.from({ length: g.paperclip }, () => "paperclip" as const),
    ...Array.from({ length: g.popup }, () => "popup" as const),
    ...Array.from({ length: g.ad }, () => "ad" as const),
  ];
  const r = rng(seed + wave * 13 + 7);
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  return q;
}
