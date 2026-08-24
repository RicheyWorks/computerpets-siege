let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let muted = false;

function bus() {
  if (!ctx || !sfx) return null;
  return { ctx, sfx };
}

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    sfx.gain.value = 0.28;
    master.gain.value = muted ? 0 : 1;
    sfx.connect(master);
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setMuted(next: boolean) {
  muted = next;
  if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.02);
}

export function isMuted() {
  return muted;
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.18, slide = 0) {
  const b = bus();
  if (!b) return;
  const { ctx: c, sfx: s } = b;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g);
  g.connect(s);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}

export const sfxHit = () => beep(420 + Math.random() * 40, 0.08, "square", 0.12, -180);
export const sfxKill = () => beep(520, 0.16, "triangle", 0.16, 220);
export const sfxLeak = () => beep(180, 0.28, "sawtooth", 0.14, -120);
export const sfxFire = (pet: string) => {
  if (pet === "paint") beep(880, 0.07, "sine", 0.1, -40);
  else if (pet === "reed") beep(160, 0.12, "triangle", 0.14, 80);
  else beep(240, 0.06, "square", 0.1, 90);
};
export const sfxWin = () => {
  beep(523, 0.18, "sine", 0.16);
  setTimeout(() => beep(659, 0.18, "sine", 0.16), 120);
  setTimeout(() => beep(784, 0.28, "sine", 0.18), 240);
};
export const sfxLose = () => beep(140, 0.5, "triangle", 0.16, -80);
export const sfxPlace = () => beep(600, 0.1, "sine", 0.12, 100);
export const sfxTrain = () => beep(310, 0.09, "square", 0.12, 140);
export const sfxFeed = () => beep(490, 0.14, "sine", 0.14, 80);
export const sfxSteam = () => beep(210, 0.12, "triangle", 0.1, 40);

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") unlockAudio();
  });
}
