/**
 * Derives web logo assets from the master brand files in assets/brand/source.
 * The masters are chrome on black; "unscreen" converts black to transparency
 * (alpha = brightest channel) so the marks composite cleanly on any dark surface.
 * Usage: node scripts/brand-assets.mjs
 */
import sharp from "sharp";

const SRC = "assets/brand/source";
const OUT = "assets/brand";

async function unscreen(file, region, black = 8) {
  const { data, info } = await sharp(file).extract(region).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const c = [data[i], data[i + 1], data[i + 2]].map((v) => Math.max(0, v - black) * (255 / (255 - black)));
    const a = Math.max(...c);
    out[j] = a ? Math.min(255, (c[0] / a) * 255) : 0;
    out[j + 1] = a ? Math.min(255, (c[1] / a) * 255) : 0;
    out[j + 2] = a ? Math.min(255, (c[2] / a) * 255) : 0;
    out[j + 3] = a;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 6 });
}

const EMBLEM = { left: 180, top: 120, width: 830, height: 820 };
const LOCKUP = { left: 150, top: 120, width: 920, height: 950 };
const WORDMARK = { left: 170, top: 250, width: 1660, height: 285 };

await (await unscreen(`${SRC}/lockup-chrome-dark.webp`, EMBLEM, 22)).resize({ width: 512 }).png().toFile(`${OUT}/emblem.png`);
await (await unscreen(`${SRC}/lockup-chrome-dark.webp`, LOCKUP, 22)).resize({ width: 800 }).png().toFile(`${OUT}/lockup.png`);
await (await unscreen(`${SRC}/wordmark-chrome-dark.webp`, WORDMARK, 12)).resize({ height: 120 }).png().toFile(`${OUT}/wordmark.png`);

// App icons: emblem on the site's obsidian background.
const emblem = await sharp(`${OUT}/emblem.png`).resize({ width: 440, height: 440, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
const bg = { create: { width: 512, height: 512, channels: 4, background: "#07080a" } };
const icon = await sharp(bg).composite([{ input: emblem, gravity: "center" }]).png().toBuffer();
await sharp(icon).toFile("app/icon.png");
await sharp(icon).resize(180).png().toFile("app/apple-icon.png");
console.log("brand assets written");
