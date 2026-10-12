// Builds a single self-contained HTML file of the app in demo mode (no server needed),
// for previewing in a browser, e.g. on an iPad. Everything is inlined: the JS bundle,
// fonts and images. Output: web-build/derece-preview.html (a page body, for hosts that
// add the document skeleton) and derece-preview-full.html (a complete document). Open
// them over http, e.g. `python3 -m http.server -d web-build`; from file:// the router
// can't reset the path and shows "Unmatched Route".
//
//   node scripts/build-web-preview.mjs
//
// .env is NOT read (EXPO_NO_DOTENV) and Metro gets a private, empty cache (inlined
// EXPO_PUBLIC_* values are not part of its cache key), so no server address or token
// from a dev build can end up in the file.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(appDir, 'web-build');
const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'derece-web-'));
const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'derece-metro-'));

const env = {
  ...process.env,
  // Metro keeps its cache under the temp dir; a fresh one forces a full transform.
  TMPDIR: cacheDir,
  TMP: cacheDir,
  TEMP: cacheDir,
  CI: '1',
  EXPO_NO_DOTENV: '1',
  EXPO_PUBLIC_DEMO: '1',
  EXPO_PUBLIC_API_URL: '',
  EXPO_PUBLIC_APP_TOKEN: '',
};
const result = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', exportDir], {
  cwd: appDir,
  env,
  stdio: 'inherit',
});
fs.rmSync(cacheDir, { recursive: true, force: true });
if (result.status !== 0) process.exit(result.status ?? 1);

const indexHtml = fs.readFileSync(path.join(exportDir, 'index.html'), 'utf8');
const entrySrc = indexHtml.match(/<script src="([^"]+)"/)?.[1];
if (!entrySrc) throw new Error('entry script not found in index.html');
let js = fs.readFileSync(path.join(exportDir, entrySrc), 'utf8');

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif' };
const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;

// Image assets are exported as { uri: "/assets/..." } objects; inline them.
let inlined = 0;
js = js.replace(/uri:"(\/assets\/[^"]+?(\.png|\.jpe?g|\.gif))"/g, (match, uri, ext) => {
  const file = path.join(exportDir, decodeURIComponent(uri));
  if (!fs.existsSync(file)) return match;
  inlined += 1;
  return `uri:"${dataUri(file, MIME[ext])}"`;
});

// Keep the bundle from closing or confusing the inline <script> element.
js = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// Fonts: same family names the app uses (see src/theme.ts), so no runtime loading is needed.
const FONTS = [
  ['poppins', '400Regular', 'Poppins_400Regular'],
  ['poppins', '500Medium', 'Poppins_500Medium'],
  ['poppins', '600SemiBold', 'Poppins_600SemiBold'],
  ['poppins', '700Bold', 'Poppins_700Bold'],
  ['lora', '400Regular', 'Lora_400Regular'],
  ['lora', '500Medium', 'Lora_500Medium'],
  ['lora', '600SemiBold', 'Lora_600SemiBold'],
  ['lora', '700Bold', 'Lora_700Bold'],
];
const fontCss = FONTS.map(([pkg, dir, family]) => {
  const file = path.join(appDir, 'node_modules/@expo-google-fonts', pkg, dir, `${family}.ttf`);
  return `@font-face{font-family:'${family}';src:url(${dataUri(file, 'font/ttf')}) format('truetype');font-display:block}`;
}).join('\n');

const page = `<title>Derece</title>
<style>
/* react-native-web root: one full-height app view. */
html { height: 100%; box-sizing: border-box; }
body { height: 100%; overflow: hidden; background: #F5F4EE; }
#root { display: flex; height: 100%; flex: 1; }
@media (prefers-color-scheme: dark) { body { background: #1F1E1D; } }
${fontCss}
</style>
<div id="root"></div>
<script>
window.__DERECE_INLINE_FONTS__ = true;
// The router reads the path; the preview is served from an arbitrary one, so start at "/".
try { if (location.pathname !== '/') history.replaceState(null, '', '/' + location.hash); } catch (e) {}
</script>
<script>${js}</script>
`;

// Safety net: nothing from a local .env may be in the preview. Checked before writing.
const dotenv = path.join(appDir, '.env');
if (fs.existsSync(dotenv)) {
  const text = fs.readFileSync(dotenv, 'utf8');
  for (const key of ['EXPO_PUBLIC_APP_TOKEN', 'EXPO_PUBLIC_API_URL']) {
    const raw = text.match(new RegExp(`^(?:export\\s+)?${key}=(.*)$`, 'm'))?.[1]?.trim();
    const value = raw?.replace(/^(['"])(.*)\1$/, '$2');
    if (value && page.includes(value)) {
      fs.rmSync(exportDir, { recursive: true, force: true });
      throw new Error(`${key} from .env leaked into the preview; nothing was written.`);
    }
  }
}

fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'derece-preview.html');
fs.writeFileSync(out, page);
fs.writeFileSync(
  path.join(outDir, 'derece-preview-full.html'),
  `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body style="margin:0">${page}</body></html>`,
);
fs.rmSync(path.join(outDir, 'derece-preview-local.html'), { force: true });
fs.rmSync(exportDir, { recursive: true, force: true });

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(`Wrote ${path.relative(appDir, out)} (${mb(Buffer.byteLength(page))}, ${inlined} images inlined)`);
