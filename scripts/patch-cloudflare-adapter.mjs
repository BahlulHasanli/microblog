/**
 * @astrojs/cloudflare adapterin cloudflare-module-loader.js faylında
 * "afterBuildCompleted" hook-unda ENOENT bug-ını düzəldir.
 *
 * Bug: WASM import-ları server build zamanı "replacements" massivinə yazılır.
 * Sonra client build-ın "generateBundle" hook-u eyni chunk adını tapıb
 * client-side fayl yolunu "replacement.fileName"-ə əlavə edir.
 * "afterBuildCompleted" isə bütün faylları dist/_worker.js/ altında axtarır,
 * lakin client chunk-ları dist/_astro/ altında olur → ENOENT.
 *
 * Həll: readFile-ı try/catch-ə sarıyırıq, ENOENT olanda faylı atlayırıq.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const target =
  "node_modules/@astrojs/cloudflare/dist/utils/cloudflare-module-loader.js";

if (!existsSync(target)) {
  console.log("[patch] cloudflare-module-loader.js tapılmadı, keçirik.");
  process.exit(0);
}

let code = readFileSync(target, "utf-8");

if (code.includes("PATCHED_ENOENT_FIX")) {
  console.log("[patch] artıq tətbiq edilib, keçirik.");
  process.exit(0);
}

const needle = `const contents = await fs.readFile(filepath, "utf-8");`;

if (!code.includes(needle)) {
  console.warn(
    "[patch] gözlənilən kod sətri tapılmadı — adapter versiyası dəyişib. Patch atlanır."
  );
  process.exit(0);
}

const replacement = `/* PATCHED_ENOENT_FIX */ let contents; try { contents = await fs.readFile(filepath, "utf-8"); } catch(_e) { if (_e.code === "ENOENT") continue; throw _e; }`;

code = code.replace(needle, replacement);
writeFileSync(target, code, "utf-8");
console.log("[patch] cloudflare-module-loader.js ENOENT fix tətbiq edildi.");
