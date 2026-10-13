// Draws the toolbox icon (blue rounded square, white toolbox) as a PNG with no dependencies.
// Mirrors toolbox/icon.svg at half scale. Run: node make-icon.js [size] [out.png] [maskable]
// maskable = full-bleed square with the art inside the 80% safe zone (for Android/ChromeOS app icons).
const fs = require('fs'), zlib = require('zlib');
const S = +(process.argv[2] || 256), OUT = process.argv[3] || __dirname + '/icon.png', MASK = process.argv[4] === 'maskable', px = Buffer.alloc(S * S * 4);
const BLUE = [0x2f, 0x6f, 0xde], WHITE = [255, 255, 255];
// signed coverage helpers, 4x4 supersampling for smooth edges
const inRound = (x, y, x0, y0, w, h, r) => {
  const cx = Math.min(Math.max(x, x0 + r), x0 + w - r), cy = Math.min(Math.max(y, y0 + r), y0 + h - r);
  return x >= x0 && x <= x0 + w && y >= y0 && y <= y0 + h && (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
function color(x, y) {
  if (!inRound(x, y, 0, 0, 256, 256, 56)) return null;
  // handle: ring between outer and inner rounded rects above the body
  const handle = inRound(x, y, 91, 63, 74, 44, 17) && !inRound(x, y, 105, 77, 46, 40, 6) && y < 100;
  const body = inRound(x, y, 48, 100, 160, 100, 14);
  const stripe = y >= 135 && y <= 146 && x >= 48 && x <= 208;
  const latch = inRound(x, y, 118, 128, 20, 25, 4);
  if ((body && !stripe && !latch) || handle) return WHITE;
  return BLUE;
}
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
  let r = 0, g = 0, b = 0, a = 0;
  for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
    let u = (x + (sx + .5) / 4) * 256 / S, v = (y + (sy + .5) / 4) * 256 / S;
    if (MASK) { u = (u - 128) / .8 + 128; v = (v - 128) / .8 + 128; }
    const c = color(u, v) || (MASK ? BLUE : null);
    if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
  }
  const i = (y * S + x) * 4;
  if (a) { px[i] = r / a; px[i + 1] = g / a; px[i + 2] = b / a; px[i + 3] = a / 16 * 255; }
}
// PNG encoding
const crcT = [...Array(256)].map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const v of buf) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const t = Buffer.from(type), len = Buffer.alloc(4), c = Buffer.alloc(4); len.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 6;
const raw = Buffer.alloc((S * 4 + 1) * S); for (let y = 0; y < S; y++) px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
fs.writeFileSync(OUT, png);
console.log(OUT, png.length, 'bytes');
