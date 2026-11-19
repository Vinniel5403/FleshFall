/**
 * Shared plumbing for the animated canvases (SpriteStage / RoomStage): pre-scaled image copies, pausing while
 * off-screen, and the touch/gesture guards WebKit needs so a held doll isn't dropped by the browser.
 */

export interface MipSource {
  id: string;
  img: HTMLImageElement;
  /** size the image is drawn at, in the caller's own units (rig px, room px) */
  w: number;
  h: number;
}

/** WebKit refuses canvases past ~16.7M px (and counts every canvas against a small memory budget). */
const MAX_AREA = 16_000_000;

/**
 * Pre-scaled copies of the stage's images. Drawing a 2000px part into a 300px doll every frame makes the browser
 * resample the full-size bitmap each time (slow in Safari, which also re-decodes big <img>s on draw) — so each image
 * is shrunk once to roughly the size it's shown at, in half-octave steps, and re-baked only when the stage crosses a step.
 */
export class Mips {
  private src = new Map<string, MipSource>();
  private baked = new Map<string, HTMLCanvasElement>();
  private level = 1;

  constructor(list: MipSource[] = []) {
    for (const s of list) this.src.set(s.id, s);
  }

  has(id: string): boolean {
    return this.src.has(id);
  }

  add(s: MipSource): void {
    this.src.set(s.id, s);
    this.bake(s);
  }

  /** What to hand to drawImage: the shrunk copy, or the image itself when it's already small enough. */
  get(id: string): CanvasImageSource | undefined {
    return this.baked.get(id) ?? this.src.get(id)?.img;
  }

  /** `scale` = canvas px per unit of the sources' w/h. */
  fit(scale: number): void {
    const level = scale >= 1 ? 1 : 2 ** (Math.ceil(Math.log2(Math.max(scale, 1 / 64)) * 2) / 2);
    if (level === this.level) return;
    this.level = level;
    this.clear();
    for (const s of this.src.values()) this.bake(s);
  }

  private bake(s: MipSource): void {
    const w = Math.ceil(s.w * this.level), h = Math.ceil(s.h * this.level);
    if (this.level >= 1 || w < 1 || h < 1 || w * h > MAX_AREA || w * 1.25 >= s.img.naturalWidth) return;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(s.img, 0, 0, w, h);
    this.baked.set(s.id, c);
  }

  /** Free the copies now (WebKit is slow to collect canvas memory); get() falls back to the originals. */
  clear(): void {
    for (const c of this.baked.values()) c.width = c.height = 0;
    this.baked.clear();
  }
}

/** Calls back when `el` enters / leaves the viewport (also false while it's display:none, e.g. a hidden studio tab). */
export function watchVisible(el: Element, cb: (visible: boolean) => void): () => void {
  const io = new IntersectionObserver((entries) => cb(entries[entries.length - 1].isIntersecting));
  io.observe(el);
  return () => io.disconnect();
}

/**
 * While `holding()` (a doll or a piece of furniture is being dragged), stop the browser taking the gesture back:
 * page scroll / long-press callout / text selection on iOS Safari end the drag with a pointercancel, and a context
 * menu (ctrl-click on macOS) swallows the pointerup. Touches that miss still scroll the page (touch-action: pan-y).
 */
export function guardGestures(cv: HTMLCanvasElement, holding: () => boolean): () => void {
  const stop = (e: Event) => {
    if (holding() && e.cancelable) e.preventDefault();
  };
  const events = ["touchstart", "touchmove", "contextmenu", "selectstart", "dragstart"] as const;
  for (const name of events) cv.addEventListener(name, stop, { passive: false });
  return () => {
    for (const name of events) cv.removeEventListener(name, stop);
  };
}
