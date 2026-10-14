// Builds src/components/math/mathHtml.generated.ts: one self-contained HTML page with
// KaTeX (JS, CSS, woff2 fonts as data URIs), marked, Lora and Poppins inlined, so math
// renders offline without any CDN. Re-run after upgrading katex or marked, or after editing
// this page's CSS or scripts/math-runtime.js:  npm run build:math
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

// Lora: the serif the app uses for Lumi's own words (solutions, hints, chat replies), and
// Poppins (the interface face) for the choice letters, as 'LumiSans'.
const loraDir = pkgDir('@expo-google-fonts/lora');
const poppinsDir = pkgDir('@expo-google-fonts/poppins');
const face = (family, dir, file, weight) =>
  `@font-face { font-family: '${family}'; font-style: normal; font-weight: ${weight}; font-display: block; ` +
  `src: url(data:font/ttf;base64,${fs.readFileSync(path.join(dir, file)).toString('base64')}) format("truetype"); }`;
const fontCss = [
  face('Lora', loraDir, '400Regular/Lora_400Regular.ttf', '400 500'),
  face('Lora', loraDir, '600SemiBold/Lora_600SemiBold.ttf', '600 800'),
  face('LumiSans', poppinsDir, '600SemiBold/Poppins_600SemiBold.ttf', '400 800'),
].join('\n');

// Defaults only; the app passes its theme colors, radii and durations in on every render
// (src/components/math/payload.ts). Every color change cross-fades over --fade-ms; verdict
// strokes are drawn by math-runtime.js with the Web Animations API.
const pageCss = `
:root {
  --text: #141413; --muted: #6B6962; --accent: #A84F33; --answer-bg: #F6E8E1; --border: #E4E1D8; --code-bg: #EEEBE3; --font-size: 16px;
  --surface: #FFFEFB; --mark: #B5573A; --mark-ink: #FFFFFF; --optik: #D3CCBF; --fosfor: #D97757; --highlight: #F5D9CB; --sweep-alpha: 0.6;
  --success: #566F3D; --success-strong: #566F3D; --success-soft: #E9EEDF; --on-status: #FFFFFF; --danger: #A8443A; --danger-soft: #F9EAE6;
  --r-choice: 12px; --r-sm: 8px; --r-xs: 4px; --bubble-w: 32px; --bubble-h: 22px; --bubble-line: 1.6px;
  --fade-ms: 220ms; --verdict-ms: 260ms; --pen-ms: 320ms; --sweep-ms: 420ms; --reveal-ms: 380ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1); --ease-breath: cubic-bezier(0.37, 0, 0.63, 1);
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
  transition: color var(--fade-ms) var(--ease-standard);
}
#content { padding: 1px 0; }
#content > :first-child { margin-top: 0; }
#content > :last-child { margin-bottom: 0; }
p { margin: 0 0 0.65em; }
ul, ol { margin: 0 0 0.65em; padding-left: 1.3em; }
li { margin: 0.2em 0; }
h1, h2, h3, h4 { font-size: 1.05em; font-weight: 600; margin: 0.8em 0 0.4em; }
strong { font-weight: 600; }
hr { border: none; border-top: 1px solid var(--border); margin: 0.9em 0; }
code { background: var(--code-bg); border-radius: var(--r-xs); padding: 0 0.25em; }
table { border-collapse: collapse; margin: 0 0 0.65em; }
th, td { border: 1px solid var(--border); padding: 0.25em 0.5em; }
blockquote { margin: 0.6em 0 0; padding: 0.6em 0.85em; border-left: 3px solid var(--fosfor); background: var(--answer-bg); border-radius: var(--r-sm); }
blockquote p:last-child { margin-bottom: 0; }
.katex { font-size: 1.08em; }

/* Answer choices: whole-width optik rows; the app passes the state in. Colors always
   cross-fade (--fade-ms); nothing cuts. */
.choices { display: flex; flex-direction: column; gap: 8px; margin: 0.4em 0 0; }
.choice {
  position: relative; isolation: isolate;
  display: flex; align-items: center; gap: 12px; width: 100%; min-height: 48px; box-sizing: border-box;
  padding: 8px 12px 8px 10px; margin: 0; text-align: left; font: inherit; color: var(--text);
  background-color: var(--surface); border: 1.5px solid var(--border); border-radius: var(--r-choice); cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition-property: transform, background-color, border-color, color, opacity;
  transition-duration: 140ms, var(--fade-ms), var(--fade-ms), var(--fade-ms), var(--fade-ms);
  transition-timing-function: var(--ease-standard);
}
.choice > * { position: relative; z-index: 1; }
.choice:active { transform: scale(0.985); }
.choice[disabled] { cursor: default; }
.choice[disabled]:active { transform: none; }
/* The letter is an optik bubble: printed outline, filled with graphite when coded. */
.choice .letter {
  flex: none; position: relative; width: var(--bubble-w); height: var(--bubble-h); box-sizing: border-box; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: var(--bubble-line) solid var(--optik); background-color: transparent; color: var(--text);
  font-family: 'LumiSans', system-ui, sans-serif; font-weight: 600; font-size: 0.82em; line-height: 1;
  transition: background-color var(--fade-ms) var(--ease-standard), border-color var(--fade-ms) var(--ease-standard), color var(--fade-ms) var(--ease-standard), transform 180ms var(--ease-standard);
}
.choice .ctext { flex: 1; min-width: 0; }
/* The check at the row's end, drawn on a verdict. */
.choice .mark { flex: none; width: 22px; height: 22px; color: var(--success); opacity: 0; transition: opacity var(--fade-ms) var(--ease-standard); }
.choice .mark path { fill: none; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.choice.correct .mark { opacity: 1; }
/* The red pen's loop around a wrong letter. */
.choice .pen { position: absolute; left: calc(-8px - var(--bubble-line)); top: calc(-8px - var(--bubble-line)); overflow: visible; pointer-events: none; opacity: 0; transition: opacity var(--fade-ms) var(--ease-standard); }
.choice .pen path { fill: none; stroke: var(--danger); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.choice.wrong .pen { opacity: 1; }
/* The fosfor sweep under a right row: a slanted highlighter band, soft. */
.choice .sweep {
  position: absolute; z-index: 0; left: 6px; right: 6px; top: 16%; bottom: 16%; pointer-events: none;
  background: var(--highlight); opacity: 0; border-radius: 3px 6px 4px 7px;
  transition: opacity var(--fade-ms) var(--ease-standard);
  transform: skewX(-8deg) rotate(-0.6deg); transform-origin: left center;
}
.choice.correct .sweep { opacity: var(--sweep-alpha); }

.choice.selected { background-color: var(--answer-bg); border-color: var(--optik); }
.choice.selected .letter { background-color: var(--mark); border-color: var(--mark); color: var(--mark-ink); }
.choice.correct { border-color: var(--success); }
.choice.correct .letter { border-color: var(--success); color: var(--success); }
.choice.correct.mine .letter { background-color: var(--success-strong); border-color: var(--success-strong); color: var(--on-status); }
.choice.wrong { background-color: var(--danger-soft); border-color: var(--danger); }
.choice.wrong .letter { background-color: var(--mark); border-color: var(--mark); color: var(--mark-ink); }
.choice.dim { opacity: 0.55; transition-delay: 0ms, 0ms, 0ms, 0ms, calc(var(--i, 0) * 30ms); }
/* After a wrong pick the right row waits a beat, so the eye travels from her answer to it. */
.choice.v-reveal, .choice.v-reveal .letter, .choice.v-reveal .mark { transition-delay: var(--reveal-ms); }
/* Picked: the letter nudges. Sealing (being graded): the letter breathes. */
.choice.v-pick .letter { animation: pick 260ms var(--ease-standard); }
.choice.sealing .letter { animation: breathe 720ms var(--ease-breath) infinite alternate; }
@keyframes pick { 50% { transform: scale(1.1); } }
@keyframes breathe { to { transform: scale(1.06); } }
/* Reduce motion: colors still cross-fade (shorter); nothing moves. */
.no-motion .choice, .no-motion .choice .letter { animation: none !important; }
.no-motion .choice:active { transform: none; }
/* Typing: words not yet "typed" take no space; the caret blinks at the end. */
.tw-hidden { display: none !important; }
.caret { display: inline-block; width: 0.5em; height: 1.05em; margin-left: 1px; vertical-align: -0.15em; border-radius: 2px; background: var(--accent); animation: blink 1s steps(2, start) infinite; }
@keyframes blink { to { visibility: hidden; } }
.no-motion .caret { animation: none; }
@media (prefers-reduced-motion: reduce) { .caret { animation: none; } }
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
