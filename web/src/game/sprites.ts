export type Sheet = { frames: HTMLImageElement[]; ready: boolean };

function load(src: string) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  return img;
}

function sheet(urls: string[]): Sheet {
  const frames = urls.map(load);
  const s: Sheet = { frames, ready: false };
  Promise.all(
    frames.map(
      (img) =>
        new Promise<void>((res) => {
          if (img.complete && img.naturalWidth) res();
          else {
            img.onload = () => res();
            img.onerror = () => res();
          }
        }),
    ),
  ).then(() => {
    s.ready = true;
  });
  return s;
}

const n = (pet: string, pose: string, count = 4) =>
  Array.from({ length: count }, (_, i) => `/sprites/${pet}/${pose}/${i + 1}.png`);

type Pack = {
  ruiIdle: Sheet;
  ruiWalk: Sheet;
  ruiSit: Sheet;
  paintIdle: Sheet;
  paintWalk: Sheet;
  reedIdle: Sheet;
  reedWalk: Sheet;
  paperclip: Sheet;
  popup: Sheet;
  ad: Sheet;
  swipe: Sheet;
  bubble: Sheet;
  wallpaper: HTMLImageElement;
};

let pack: Pack | null = null;

export function sprites(): Pack {
  if (pack) return pack;
  if (typeof Image === "undefined") {
    throw new Error("sprites are browser-only");
  }
  pack = {
    ruiIdle: sheet(n("rui", "idle")),
    ruiWalk: sheet(n("rui", "walk")),
    ruiSit: sheet(n("rui", "sit")),
    paintIdle: sheet(n("paint", "idle")),
    paintWalk: sheet(n("paint", "walk")),
    reedIdle: sheet(n("reed", "idle")),
    reedWalk: sheet(n("reed", "walk")),
    paperclip: sheet(Array.from({ length: 4 }, (_, i) => `/creeps/paperclip/walk-${i + 1}.png`)),
    popup: sheet(Array.from({ length: 4 }, (_, i) => `/creeps/popup/walk-${i + 1}.png`)),
    ad: sheet(Array.from({ length: 4 }, (_, i) => `/creeps/ad/walk-${i + 1}.png`)),
    swipe: sheet(Array.from({ length: 4 }, (_, i) => `/fx/swipe/fx-${i + 1}.png`)),
    bubble: sheet(Array.from({ length: 4 }, (_, i) => `/fx/bubble/projectile-${i + 1}.png`)),
    wallpaper: load("/wallpaper.jpg"),
  };
  return pack;
}

export function frame(s: Sheet, t: number, fps = 8) {
  if (!s.frames.length) return null;
  const i = Math.floor(Math.abs(t) * fps) % s.frames.length;
  const img = s.frames[i];
  return img.complete && img.naturalWidth ? img : s.frames[0];
}
