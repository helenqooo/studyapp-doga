// Builds src/components/math/mathHtml.generated.ts: one self-contained HTML page with
// KaTeX (JS, CSS, woff2 fonts as data URIs) and marked inlined, so math renders offline
// without any CDN. Re-run after upgrading katex or marked:  npm run build:math
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = (name) => path.dirname(require.resolve(`${name}/package.json`));
const katexDist = path.join(pkgDir('katex'), 'dist');
const markedUmd = path.join(pkgDir('marked'), 'lib', 'marked.umd.js');

const read = (p) => fs.readFileSync(p, 'utf8');

// Keep only the woff2 source of each @font-face and inline it.
const katexCss = read(path.join(katexDist, 'katex.min.css')).replace(
  /src:url\(fonts\/([^)]+?)\.woff2\) format\("woff2"\)(?:,url\([^)]+\) format\("[^"]+"\))*/g,
  (_, name) => {
    const font = fs.readFileSync(path.join(katexDist, 'fonts', `${name}.woff2`)).toString('base64');
    return `src:url(data:font/woff2;base64,${font}) format("woff2")`;
  },
);
if (/url\(fonts\//.test(katexCss)) {
  throw new Error('Some KaTeX font URLs were not inlined; the CSS format may have changed.');
}

// Lora: the serif the app uses for Claude's own words (solutions, hints, chat replies).
const loraDir = pkgDir('@expo-google-fonts/lora');
const loraFace = (file, weight) =>
  `@font-face { font-family: 'Lora'; font-style: normal; font-weight: ${weight}; font-display: block; ` +
  `src: url(data:font/ttf;base64,${fs.readFileSync(path.join(loraDir, file)).toString('base64')}) format("truetype"); }`;
const fontCss = [loraFace('400Regular/Lora_400Regular.ttf', '400 500'), loraFace('600SemiBold/Lora_600SemiBold.ttf', '600 800')].join('\n');

// Defaults only; the app passes its theme colors in on every render.
const pageCss = `
:root {
  --text: #141413; --muted: #6B6962; --accent: #A84F33; --answer-bg: #F6E8E1; --border: #E4E1D8; --code-bg: #EEECE4; --font-size: 16px;
  --surface: #FFFFFF; --on-accent: #FFFFFF; --success: #566F3D; --success-soft: #E9EEDF; --danger: #A8443A; --danger-soft: #F9EAE6;
}
html, body { margin: 0; padding: 0; background: transparent; }
body {
  color: var(--text);
  font-family: 'Lora', Georgia, serif;
  font-size: var(--font-size);
  line-height: 1.6;
  -webkit-text-size-adjust: 100%;
  overflow-wrap: anywhere;
  -webkit-user-select: text;
}
#content { padding: 1px 0; }
#content > :first-child { margin-top: 0; }
#content > :last-child { margin-bottom: 0; }
p { margin: 0 0 0.65em; }
ul, ol { margin: 0 0 0.65em; padding-left: 1.3em; }
li { margin: 0.2em 0; }
h1, h2, h3, h4 { font-size: 1.05em; margin: 0.8em 0 0.4em; }
strong { font-weight: 600; }
hr { border: none; border-top: 1px solid var(--border); margin: 0.9em 0; }
code { background: var(--code-bg); border-radius: 4px; padding: 0 0.25em; }
table { border-collapse: collapse; margin: 0 0 0.65em; }
th, td { border: 1px solid var(--border); padding: 0.25em 0.5em; }
blockquote { margin: 0.6em 0 0; padding: 0.6em 0.85em; border-left: 4px solid var(--accent); background: var(--answer-bg); border-radius: 8px; }
blockquote p:last-child { margin-bottom: 0; }
.katex { font-size: 1.08em; }
/* Answer choices: whole-width buttons; the app passes the state in. */
.choices { display: flex; flex-direction: column; gap: 8px; margin: 0.4em 0 0; }
.choice {
  display: flex; align-items: center; gap: 12px; width: 100%; min-height: 48px; box-sizing: border-box;
  padding: 8px 12px 8px 8px; margin: 0; text-align: left; font: inherit; color: var(--text);
  background: var(--surface); border: 1.5px solid var(--border); border-radius: 14px; cursor: pointer;
  -webkit-tap-highlight-color: transparent; transition: transform 140ms ease, background-color 160ms ease, border-color 160ms ease, opacity 160ms ease;
}
.choice:active { transform: scale(0.98); }
.choice[disabled] { cursor: default; }
.choice[disabled]:active { transform: none; }
.choice .letter {
  flex: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: var(--code-bg); color: var(--text); font-family: -apple-system, 'Poppins', system-ui, sans-serif; font-weight: 600; font-size: 0.92em;
}
.choice .ctext { flex: 1; min-width: 0; }
.choice .mark { flex: none; font-weight: 700; font-family: -apple-system, system-ui, sans-serif; }
.choice.selected { border-color: var(--accent); background: var(--answer-bg); }
.choice.selected .letter { background: var(--accent); color: var(--on-accent); }
.choice.correct { border-color: var(--success); background: var(--success-soft); }
.choice.correct .letter { background: var(--success); color: var(--on-accent); }
.choice.correct .mark { color: var(--success); }
.choice.wrong { border-color: var(--danger); background: var(--danger-soft); }
.choice.wrong .letter { background: var(--danger); color: var(--on-accent); }
.choice.wrong .mark { color: var(--danger); }
.choice.dim { opacity: 0.55; }
/* Typing: words not yet "typed" take no space; the caret blinks at the end. */
.tw-hidden { display: none !important; }
.caret { display: inline-block; width: 0.5em; height: 1.05em; margin-left: 1px; vertical-align: -0.15em; border-radius: 2px; background: var(--accent); animation: blink 1s steps(2, start) infinite; }
@keyframes blink { to { visibility: hidden; } }
@media (prefers-reduced-motion: reduce) { .choice { transition: none; } .caret { animation: none; } }
.katex-display { margin: 0.5em 0; overflow-x: auto; overflow-y: hidden; padding: 2px 0; }
`;

const safeScript = (js) => js.replace(/<\/script/gi, '<\\/script');

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>${fontCss}</style>
<style>${katexCss}</style>
<style>${pageCss}</style>
</head><body><div id="content"></div>
<script>${safeScript(read(path.join(katexDist, 'katex.min.js')))}</script>
<script>${safeScript(read(markedUmd))}</script>
<script>${safeScript(read(path.join(appRoot, 'scripts', 'math-runtime.js')))}</script>
</body></html>`;

const outDir = path.join(appRoot, 'src', 'components', 'math');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'mathHtml.generated.ts');
fs.writeFileSync(
  out,
  `// GENERATED by scripts/build-math-html.mjs — do not edit. Run \`npm run build:math\`.\n` +
    `// KaTeX + marked bundled offline for the MathView WebView.\n` +
    `export const MATH_HTML = ${JSON.stringify(html)};\n`,
);
console.log(`Wrote ${path.relative(appRoot, out)} (${(html.length / 1024).toFixed(0)} KB)`);
