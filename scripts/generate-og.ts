import { writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const width = 1200;
const height = 630;
const header = Buffer.from(`P6\n${width} ${height}\n255\n`);
const pixels = Buffer.alloc(width * height * 3);

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const i = (y * width + x) * 3;
    pixels[i] = 1;
    pixels[i + 1] = 3;
    pixels[i + 2] = 6;
    if (y > 250 && y < 380 && x > 90 && x < 1110) {
      pixels[i] = 207;
      pixels[i + 1] = 220;
      pixels[i + 2] = 234;
    }
    if (x < 6 || y < 6 || x > width - 7 || y > height - 7) {
      pixels[i] = 40;
      pixels[i + 1] = 225;
      pixels[i + 2] = 255;
    }
  }
}

const ppmPath = join(root, "public/og.ppm");
const pngPath = join(root, "public/og.png");
await writeFile(ppmPath, Buffer.concat([header, pixels]));
const result = spawnSync("sips", ["-s", "format", "png", ppmPath, "--out", pngPath], { encoding: "utf8" });
if (result.status !== 0) {
  console.log("sips unavailable; leaving public/og.svg as the preview image");
  process.exit(0);
}
console.log(`wrote ${pngPath}`);
