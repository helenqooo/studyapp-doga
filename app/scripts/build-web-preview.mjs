// Builds a single self-contained HTML file of the app in demo mode (no server needed),
// for previewing in a browser, e.g. on an iPad. Everything is inlined: the JS bundle,
// fonts and images. Output in web-build/:
//   derece-preview.html       page body, for hosts that add the document skeleton
//   derece-preview-full.html  a complete document
//   pwa/                      an installable web app (manifest, icons, offline service
//                             worker): host the folder at the ROOT of an https site, open
//                             it in Safari, Share → Add to Home Screen.
// Open them over http, e.g. `python3 -m http.server -d web-build`; from file:// the router
// can't reset the path and shows "Unmatched Route".
//
//   node scripts/build-web-preview.mjs
//
// .env is NOT read (EXPO_NO_DOTENV) and Metro gets a private, empty cache (inlined
// EXPO_PUBLIC_* values are not part of its cache key), so no server address or token
// from a dev build can end up in the file.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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

// Fonts: the vendored TTFs in assets/fonts under the same family names the app uses
// (theme.fonts, FONT_FILES in src/app/_layout.tsx), so no runtime loading is needed.
const FONTS = [
  ['BeVietnamPro-Regular.ttf', 'BeVietnamPro_400Regular'],
  ['BeVietnamPro-Medium.ttf', 'BeVietnamPro_500Medium'],
  ['BeVietnamPro-SemiBold.ttf', 'BeVietnamPro_600SemiBold'],
  ['BeVietnamPro-Bold.ttf', 'BeVietnamPro_700Bold'],
  ['BarlowCondensed-Medium.ttf', 'BarlowCondensed_500Medium'],
  ['BarlowCondensed-SemiBold.ttf', 'BarlowCondensed_600SemiBold'],
  ['BarlowCondensed-Bold.ttf', 'BarlowCondensed_700Bold'],
  ['BarlowCondensed-ExtraBold.ttf', 'BarlowCondensed_800ExtraBold'],
];
const fontCss = FONTS.map(([fileName, family]) => {
  const file = path.join(appDir, 'assets', 'fonts', fileName);
  return `@font-face{font-family:'${family}';src:url(${dataUri(file, 'font/ttf')}) format('truetype');font-display:block}`;
}).join('\n');

const appName = JSON.parse(fs.readFileSync(path.join(appDir, 'app.json'), 'utf8')).expo.name;
const page = `<title>${appName}</title>
<style>
/* react-native-web root: one full-height app view. */
html { height: 100%; box-sizing: border-box; }
body { height: 100%; overflow: hidden; background: #EEF1F5; }
#root { display: flex; height: 100%; flex: 1; }
@media (prefers-color-scheme: dark) { body { background: #161A21; } }
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

// Installable web app: same page plus a manifest, icons and an offline cache.
const pwaDir = path.join(outDir, 'pwa');
fs.rmSync(pwaDir, { recursive: true, force: true });
fs.mkdirSync(path.join(pwaDir, 'icons'), { recursive: true });
for (const f of fs.readdirSync(path.join(appDir, 'assets', 'pwa'))) {
  fs.copyFileSync(path.join(appDir, 'assets', 'pwa', f), path.join(pwaDir, 'icons', f));
}
// theme.ts colors.background (light paper, dark night desk).
const PAPER = '#EEF1F5';
const NIGHT = '#161A21';
fs.writeFileSync(
  path.join(pwaDir, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: appName,
      short_name: appName,
      lang: 'tr',
      start_url: './',
      scope: './',
      display: 'standalone',
      orientation: 'any',
      background_color: PAPER,
      theme_color: PAPER,
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  ),
);
const version = createHash('sha256').update(page).digest('hex').slice(0, 12);
fs.writeFileSync(
  path.join(pwaDir, 'sw.js'),
  `// Offline cache for the installed web app. A new build gets a new cache name.
const CACHE = '${appName.toLowerCase()}-${version}';
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Pages: network first (updates arrive), the cached app when offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); return res; }).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
`,
);
fs.writeFileSync(
  path.join(pwaDir, 'index.html'),
  `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${PAPER}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="${NIGHT}" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="${appName}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" href="icons/icon-192.png">
</head><body style="margin:0">${page}
<script>if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});</script>
</body></html>`,
);

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(`Wrote ${path.relative(appDir, out)} (${mb(Buffer.byteLength(page))}, ${inlined} images inlined) and web-build/pwa/`);
