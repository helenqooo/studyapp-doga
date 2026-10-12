// Builds a single self-contained HTML file of the app in demo mode (no server needed),
// for previewing in a browser, e.g. on an iPad. Everything is inlined: the JS bundle,
// fonts and images. Output: web-build/derece-preview.html (+ a -local.html twin wrapped
// in a full document for opening straight from disk).
//
//   node scripts/build-web-preview.mjs
//
// .env is NOT read (EXPO_NO_DOTENV), so no server address or token ends up in the file.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(appDir, 'web-build');
const exportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'derece-web-'));

const env = {
  ...process.env,
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

fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'derece-preview.html');
fs.writeFileSync(out, page);
fs.writeFileSync(
  path.join(outDir, 'derece-preview-local.html'),
  `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body style="margin:0">${page}</body></html>`,
);
fs.rmSync(exportDir, { recursive: true, force: true });

// Safety net: the token from a local .env must never be in the preview.
const dotenv = path.join(appDir, '.env');
if (fs.existsSync(dotenv)) {
  const token = fs.readFileSync(dotenv, 'utf8').match(/^EXPO_PUBLIC_APP_TOKEN=(.+)$/m)?.[1]?.trim();
  if (token && page.includes(token)) {
    fs.rmSync(out);
    throw new Error('APP_TOKEN leaked into the preview; aborting.');
  }
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(`Wrote ${path.relative(appDir, out)} (${mb(Buffer.byteLength(page))}, ${inlined} images inlined)`);
