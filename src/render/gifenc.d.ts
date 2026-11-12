// Minimal types for gifenc (pure-JS GIF encoder, MIT) — only what diceGif.ts uses.
declare module 'gifenc' {
  type Palette = number[][];
  interface FrameOptions {
    palette?: Palette;
    /** frame delay in ms */
    delay?: number;
    /** -1 = play once, 0 = loop forever (first frame only) */
    repeat?: number;
    transparent?: boolean;
  }
  interface Encoder {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: FrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  }
  const gifenc: {
    GIFEncoder(): Encoder;
    quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number, opts?: { format?: 'rgb565' | 'rgb444' | 'rgba4444' }): Palette;
    applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette, format?: 'rgb565' | 'rgb444' | 'rgba4444'): Uint8Array;
  };
  export default gifenc;
}
