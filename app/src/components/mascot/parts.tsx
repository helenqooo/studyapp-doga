// Lumi's drawing, part by part, on a 200 × 200 grid (feet at y ≈ 184). Lumi is a little clay
// flame: a round body with a lick on its left, a lighter core behind the face, and a tip that
// sways on its own layer with the gold light inside it. Each function returns plain
// react-native-svg elements; Mascot.tsx stacks them in layers that move on their own.
// Flat 2D: solid fills, one shade and one highlight, no outlines.
import { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { MascotColors } from '../../theme';

export type EyeKind = 'open' | 'happy' | 'closed' | 'wide' | 'heart' | 'wink' | 'up' | 'down' | 'sad' | 'spiral';
export type BrowKind = 'sad' | 'focus' | 'raised' | 'worried';
export type MouthKind = 'smile' | 'grin' | 'o' | 'sad' | 'flat' | 'talk' | 'wavy' | 'small' | 'cat';
export type Accessory = 'headphones' | 'party' | 'crown' | 'cap' | 'glasses' | 'book' | 'cup' | 'pompoms' | 'pencil';
export type Effect = 'tear' | 'sweat' | 'zzz' | 'hearts' | 'sparkles' | 'question' | 'exclaim' | 'confetti' | 'flame' | 'steam';

export const ARM_LEN = 26;
export const PIVOT = { l: { x: 50, y: 138 }, r: { x: 150, y: 138 } } as const;
/** Where the character stands; tilts and squashes happen around this point. */
export const GROUND = { x: 100, y: 184 };
/** The eyes' centres; EYE_Y is also where a blink squashes them. */
const EYE = { l: 84, r: 116 };
export const EYE_Y = 134;
export const MOUTH = { x: 100, y: 152 };
/** The tip sways around this point, hidden inside the body. */
export const TIP_BASE = { x: 100, y: 100 };
/** The gold light inside the tip (the companion's trail and halo start here too). */
export const LIGHT = { x: 100, y: 47 };

const BODY = 'M80 84 C90 76 110 74 122 78 C146 86 160 104 160 128 C160 162 134 184 100 184 C66 184 40 162 40 128 C40 104 50 86 62 68 C64 78 70 86 80 84 Z';
const SHADE = 'M160 128 C160 162 134 184 100 184 C74 184 52 172 44 152 C62 168 84 172 104 170 C134 168 156 152 160 128 Z';
/** The hotter, lighter core behind the face. */
const CORE = 'M100 94 C114 112 134 126 134 148 C134 167 119 178 100 178 C81 178 66 167 66 148 C66 126 86 112 100 94 Z';
/** The tip: its lower half stays hidden behind the body however it sways. */
const TIP = 'M100 16 C108 34 126 50 127 72 C128 94 116 108 100 108 C84 108 72 94 73 72 C74 50 92 34 100 16 Z';

/** Where a hand ends up for an arm angle (0 = hanging straight down, + = clockwise). */
export function handAt(side: 'l' | 'r', angle: number) {
  const p = PIVOT[side];
  const t = (angle * Math.PI) / 180;
  return { x: p.x - Math.sin(t) * ARM_LEN, y: p.y + Math.cos(t) * ARM_LEN };
}

export function Shadow({ c, rx = 46 }: { c: MascotColors; rx?: number }) {
  return <Ellipse cx={100} cy={190} rx={rx} ry={6} fill={c.shadow} />;
}

export function Feet({ c }: { c: MascotColors }) {
  return (
    <G>
      <Ellipse cx={82} cy={184} rx={13} ry={7} fill={c.foot} />
      <Ellipse cx={118} cy={184} rx={13} ry={7} fill={c.foot} />
    </G>
  );
}

/** The flame's tip, drawn under the body; its layer sways and flares around TIP_BASE. */
export function Tip({ c }: { c: MascotColors }) {
  return <Path d={TIP} fill={c.body} />;
}

/** The gold light inside the tip; `halo` is the soft glow around it, kept inside the tip even when it pulses. */
export function TipLight({ c, halo = true }: { c: MascotColors; halo?: boolean }) {
  const { x, y } = LIGHT;
  return (
    <G>
      {halo ? <Ellipse cx={x} cy={y + 1} rx={10} ry={14} fill={c.glowSoft} /> : null}
      <Path d={`M${x} ${y - 13} C${x + 4} ${y - 6} ${x + 8} ${y - 1} ${x + 8} ${y + 4} C${x + 8} ${y + 9} ${x + 4} ${y + 11} ${x} ${y + 11} C${x - 4} ${y + 11} ${x - 8} ${y + 9} ${x - 8} ${y + 4} C${x - 8} ${y - 1} ${x - 4} ${y - 6} ${x} ${y - 13} Z`} fill={c.glow} />
      <Circle cx={x - 3} cy={y + 4} r={2.4} fill={c.glowShine} />
    </G>
  );
}

export function Body({ c, blush = false }: { c: MascotColors; blush?: boolean }) {
  return (
    <G>
      <Path d={BODY} fill={c.body} />
      <Path d={SHADE} fill={c.shade} />
      <Path d={CORE} fill={c.core} />
      <Ellipse cx={58} cy={106} rx={8} ry={5} fill={c.highlight} transform="rotate(-50 58 106)" />
      <Circle cx={52} cy={120} r={2.6} fill={c.highlight} />
      <Ellipse cx={72} cy={150} rx={8} ry={5} fill={c.cheek} opacity={blush ? 1 : 0.8} />
      <Ellipse cx={128} cy={150} rx={8} ry={5} fill={c.cheek} opacity={blush ? 1 : 0.8} />
    </G>
  );
}

export function Eyes({ c, kind }: { c: MascotColors; kind: EyeKind }) {
  const L = EYE.l;
  const R = EYE.r;
  const Y = EYE_Y;
  const dot = (x: number, y: number, rx = 7.5, ry = 10, key?: string) => (
    <G key={key}>
      <Ellipse cx={x} cy={y} rx={rx} ry={ry} fill={c.ink} />
      <Circle cx={x + 2.6} cy={y - 3.6} r={2.8} fill={c.eyeShine} />
    </G>
  );
  const arc = (x: number, key?: string) => (
    <Path key={key} d={`M${x - 7} ${Y + 2} Q${x} ${Y - 8} ${x + 7} ${Y + 2}`} stroke={c.ink} strokeWidth={3.6} fill="none" strokeLinecap="round" />
  );
  const line = (x: number, key?: string) => (
    <Path key={key} d={`M${x - 7} ${Y + 2} Q${x} ${Y + 6} ${x + 7} ${Y + 2}`} stroke={c.ink} strokeWidth={3.4} fill="none" strokeLinecap="round" />
  );
  const heart = (x: number, key?: string) => (
    <Path key={key} d={`M${x} ${Y + 7} C${x - 12} ${Y - 1} ${x - 7} ${Y - 11} ${x} ${Y - 4} C${x + 7} ${Y - 11} ${x + 12} ${Y - 1} ${x} ${Y + 7} Z`} fill={c.heart} />
  );
  const spiral = (x: number, key?: string) => (
    <Path
      key={key}
      d={`M${x} ${Y} m-1 0 a1.5 1.5 0 1 1 3 0 a3.5 3.5 0 1 1 -7 0 a5.5 5.5 0 1 1 11 0`}
      stroke={c.ink}
      strokeWidth={2.6}
      fill="none"
      strokeLinecap="round"
    />
  );
  switch (kind) {
    case 'happy':
      return <G>{[arc(L, 'l'), arc(R, 'r')]}</G>;
    case 'closed':
      return <G>{[line(L, 'l'), line(R, 'r')]}</G>;
    case 'wide':
      return <G>{[dot(L, Y, 9, 12, 'l'), dot(R, Y, 9, 12, 'r')]}</G>;
    case 'heart':
      return <G>{[heart(L, 'l'), heart(R, 'r')]}</G>;
    case 'wink':
      return <G>{[dot(L, Y, 7.5, 10, 'l'), arc(R, 'r')]}</G>;
    case 'up':
      return <G>{[dot(L + 1, Y - 3, 7.5, 10, 'l'), dot(R + 1, Y - 3, 7.5, 10, 'r')]}</G>;
    case 'down':
      return (
        <G>
          <Ellipse cx={L} cy={Y + 3} rx={7} ry={8} fill={c.ink} />
          <Ellipse cx={R} cy={Y + 3} rx={7} ry={8} fill={c.ink} />
        </G>
      );
    case 'sad':
      return <G>{[dot(L, Y + 2, 7, 9, 'l'), dot(R, Y + 2, 7, 9, 'r')]}</G>;
    case 'spiral':
      return <G>{[spiral(L, 'l'), spiral(R, 'r')]}</G>;
    default:
      return <G>{[dot(L, Y, 7.5, 10, 'l'), dot(R, Y, 7.5, 10, 'r')]}</G>;
  }
}

/** Eyes that blink (open dots) — the rest stay put. */
export const BLINKING_EYES: EyeKind[] = ['open', 'wide', 'up', 'sad', 'wink'];

export function Brows({ c, kind }: { c: MascotColors; kind: BrowKind }) {
  // [outer dx, outer dy, inner dx, inner dy] from the left eye's centre; the right brow mirrors it.
  const [ox, oy, ix, iy] = {
    sad: [-8, -12, 6, -18],
    focus: [-8, -14, 7, -10],
    raised: [-7, -19, 6, -22],
    worried: [-7, -13, 6, -18],
  }[kind];
  const d = `M${EYE.l + ox} ${EYE_Y + oy} L${EYE.l + ix} ${EYE_Y + iy} M${EYE.r - ox} ${EYE_Y + oy} L${EYE.r - ix} ${EYE_Y + iy}`;
  return <Path d={d} stroke={c.ink} strokeWidth={3.4} strokeLinecap="round" fill="none" />;
}

export function Mouth({ c, kind }: { c: MascotColors; kind: MouthKind }) {
  const ink = c.ink;
  const { x, y } = MOUTH;
  switch (kind) {
    case 'grin':
      return (
        <G>
          <Path d={`M${x - 10} ${y - 3} Q${x} ${y + 12} ${x + 10} ${y - 3} Z`} fill={ink} />
          <Path d={`M${x - 6} ${y + 4} Q${x} ${y + 9} ${x + 6} ${y + 4} Q${x} ${y + 1} ${x - 6} ${y + 4} Z`} fill={c.heart} />
        </G>
      );
    case 'o':
      return <Ellipse cx={x} cy={y + 2} rx={5.5} ry={7} fill={ink} />;
    case 'sad':
      return <Path d={`M${x - 7} ${y + 4} Q${x} ${y - 3} ${x + 7} ${y + 4}`} stroke={ink} strokeWidth={3.2} fill="none" strokeLinecap="round" />;
    case 'flat':
      return <Path d={`M${x - 6} ${y + 1} L${x + 6} ${y + 1}`} stroke={ink} strokeWidth={3.2} strokeLinecap="round" />;
    case 'talk':
      return <Path d={`M${x - 8} ${y - 4} Q${x} ${y + 10} ${x + 8} ${y - 4} Q${x} ${y - 1} ${x - 8} ${y - 4} Z`} fill={ink} />;
    case 'wavy':
      return <Path d={`M${x - 9} ${y + 2} q3 -4 6 0 t6 0 t6 0`} stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case 'small':
      return <Path d={`M${x - 4} ${y - 1} Q${x} ${y + 3} ${x + 4} ${y - 1}`} stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case 'cat':
      return <Path d={`M${x - 8} ${y - 2} q4 5 8 0 q4 5 8 0`} stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />;
    default:
      return <Path d={`M${x - 8} ${y - 3} Q${x} ${y + 5} ${x + 8} ${y - 3}`} stroke={ink} strokeWidth={3.4} fill="none" strokeLinecap="round" />;
  }
}

/** An arm hanging straight down from its shoulder; the layer (or `angle`) turns it. */
export function Arm({ c, side, angle = 0, held }: { c: MascotColors; side: 'l' | 'r'; angle?: number; held?: 'pompom' | 'pencil' | 'marker' }) {
  const p = PIVOT[side];
  const y = p.y + ARM_LEN;
  return (
    <G transform={angle ? `rotate(${angle} ${p.x} ${p.y})` : undefined}>
      <Rect x={p.x - 7} y={p.y - 6} width={14} height={ARM_LEN + 2} rx={7} fill={c.arm} />
      <Circle cx={p.x} cy={y} r={9.5} fill={c.arm} />
      {held === 'pompom' ? (
        <G>
          <Circle cx={p.x} cy={y + 6} r={15} fill={c.gold} />
          <Circle cx={p.x - 5} cy={y + 1} r={4} fill={c.paper} opacity={0.55} />
          <Path
            d={`M${p.x - 10} ${y + 12} l4 -6 M${p.x + 10} ${y + 12} l-4 -6 M${p.x} ${y + 18} l0 -7`}
            stroke={c.goldDeep}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </G>
      ) : null}
      {held === 'pencil' ? (
        <G transform={`rotate(150 ${p.x} ${y})`}>
          <Rect x={p.x - 5} y={y - 8} width={10} height={40} rx={2.5} fill={c.gold} />
          <Path d={`M${p.x - 5} ${y + 32} L${p.x} ${y + 42} L${p.x + 5} ${y + 32} Z`} fill={c.paperShade} />
          <Path d={`M${p.x - 1.6} ${y + 38.5} L${p.x} ${y + 42} L${p.x + 1.6} ${y + 38.5} Z`} fill={c.ink} />
          <Rect x={p.x - 5} y={y - 12} width={10} height={6} rx={2.5} fill={c.heart} />
        </G>
      ) : null}
      {held === 'marker' ? (
        // The highlighter: a stubby rounded body with a dark chisel cap, tip outward.
        <G transform={`rotate(150 ${p.x} ${y})`}>
          <Rect x={p.x - 6} y={y - 10} width={12} height={36} rx={5} fill={c.marker} />
          <Path d={`M${p.x - 5} ${y + 24} L${p.x + 5} ${y + 24} L${p.x + 4} ${y + 34} L${p.x - 4} ${y + 31} Z`} fill={c.markerCap} />
          <Rect x={p.x - 3.5} y={y - 6} width={3} height={24} rx={1.5} fill={c.glowShine} opacity={0.7} />
        </G>
      ) : null}
    </G>
  );
}

/** Things worn or held in front of the body (drawn above the face, under the arms). */
export function Worn({ c, item }: { c: MascotColors; item: Accessory }) {
  switch (item) {
    case 'headphones':
      return (
        <G>
          <Path d="M46 132 C42 62 158 62 154 132" stroke={c.gear} strokeWidth={7} fill="none" strokeLinecap="round" />
          <Rect x={34} y={116} width={18} height={30} rx={8} fill={c.gear} />
          <Rect x={148} y={116} width={18} height={30} rx={8} fill={c.gear} />
          <Rect x={38} y={122} width={8} height={18} rx={4} fill={c.body} />
          <Rect x={154} y={122} width={8} height={18} rx={4} fill={c.body} />
        </G>
      );
    case 'party':
      // Worn on the lick, leaning out, so the tip and its light stay clear.
      return (
        <G transform="rotate(-24 66 80)">
          <Path d="M50 82 L64 36 L80 80 Z" fill={c.accentBlue} />
          <Path d="M56 66 L71 61 M53 75 L76 69" stroke={c.paper} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={64} cy={35} r={6} fill={c.gold} />
        </G>
      );
    case 'crown':
      // Round the base of the tip: the flame rises out of it.
      return (
        <G>
          <Path d="M78 86 L74 64 L88 74 L100 64 L112 74 L126 64 L122 86 Z" fill={c.gold} />
          <Circle cx={100} cy={66} r={3.5} fill={c.heart} />
          <Rect x={77} y={81} width={46} height={7} rx={3} fill={c.goldDeep} />
        </G>
      );
    case 'cap':
      // The mortarboard sits low on the tip; the light pokes out above it.
      return (
        <G>
          <Path d="M62 74 L100 60 L138 74 L100 88 Z" fill={c.gear} />
          <Path d="M78 82 L78 94 Q100 104 122 94 L122 82 L100 88 Z" fill={c.gearSoft} />
          <Path d="M138 74 L138 94" stroke={c.gold} strokeWidth={3} />
          <Circle cx={138} cy={96} r={4} fill={c.gold} />
        </G>
      );
    case 'glasses':
      return (
        <G>
          <Circle cx={EYE.l} cy={EYE_Y} r={12.5} fill={c.paper} fillOpacity={0.18} stroke={c.gear} strokeWidth={3.5} />
          <Circle cx={EYE.r} cy={EYE_Y} r={12.5} fill={c.paper} fillOpacity={0.18} stroke={c.gear} strokeWidth={3.5} />
          <Path d={`M${EYE.l + 12.5} ${EYE_Y - 1} L${EYE.r - 12.5} ${EYE_Y - 1}`} stroke={c.gear} strokeWidth={3.5} />
        </G>
      );
    case 'book':
      return (
        <G>
          <Path d="M64 158 L100 166 L136 158 L136 186 L100 194 L64 186 Z" fill={c.accentBlue} />
          <Path d="M68 156 L100 163 L100 190 L68 183 Z" fill={c.paper} />
          <Path d="M132 156 L100 163 L100 190 L132 183 Z" fill={c.paperShade} />
          <Path d="M75 166 L94 170 M75 173 L94 177 M106 170 L125 166 M106 177 L125 173" stroke={c.ruling} strokeWidth={2} strokeLinecap="round" />
        </G>
      );
    default:
      return null;
  }
}

/** A cup, upright, with its top-left corner at (x, y). */
export function Cup({ c, x, y }: { c: MascotColors; x: number; y: number }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Rect x={0} y={0} width={22} height={22} rx={6} fill={c.paper} />
      <Path d="M22 6 q8 0 8 6 q0 6 -8 6" stroke={c.paper} strokeWidth={4} fill="none" />
      <Rect x={0} y={0} width={22} height={6} rx={3} fill={c.accentGreen} />
    </G>
  );
}

/** Small pictures around the character; each is animated on its own layer. */
export function EffectArt({ c, kind, index = 0 }: { c: MascotColors; kind: Effect; index?: number }) {
  switch (kind) {
    case 'tear':
      return <Path d={`M${EYE.l - 4} ${EYE_Y + 12} q-5 9 0 13 q5 -4 0 -13 Z`} fill={c.water} />;
    case 'sweat':
      return <Path d="M154 84 q-7 11 0 15 q7 -4 0 -15 Z" fill={c.water} />;
    case 'zzz':
      return index === 0 ? (
        <SvgText x={140} y={70} fontSize={20} fontWeight="700" fill={c.accentBlue}>
          z
        </SvgText>
      ) : (
        <SvgText x={152} y={52} fontSize={26} fontWeight="700" fill={c.accentBlue}>
          Z
        </SvgText>
      );
    case 'hearts':
      return index === 0 ? (
        <Path d="M150 70 c-8 -6 -5 -13 0 -9 c5 -4 8 3 0 9 Z" fill={c.heart} />
      ) : (
        <Path d="M40 62 c-10 -7 -6 -16 0 -11 c6 -5 10 4 0 11 Z" fill={c.heart} opacity={0.8} />
      );
    case 'sparkles':
      return index === 0 ? (
        <Path d="M36 66 l3 -9 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3 Z" fill={c.gold} />
      ) : (
        <Path d="M160 84 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 Z" fill={c.gold} />
      );
    case 'question':
      return (
        <SvgText x={146} y={66} fontSize={30} fontWeight="800" fill={c.accentBlue}>
          ?
        </SvgText>
      );
    case 'exclaim':
      return (
        <SvgText x={148} y={66} fontSize={32} fontWeight="800" fill={c.heart}>
          !
        </SvgText>
      );
    case 'confetti': {
      const pieces: [string, number, number, number][] = [
        [c.accentBlue, 30, 50, 20],
        [c.gold, 168, 44, -25],
        [c.accentGreen, 46, 26, 40],
        [c.heart, 150, 22, 10],
        [c.gold, 20, 96, -10],
        [c.accentBlue, 176, 100, 30],
      ];
      return (
        <G>
          {pieces.map(([fill, x, y, r], i) => (
            <Rect key={i} x={x} y={y} width={10} height={5} rx={2} fill={fill} transform={`rotate(${r} ${x} ${y})`} />
          ))}
        </G>
      );
    }
    case 'flame':
      return (
        <G>
          <Path d="M172 150 c-12 -10 -6 -22 0 -30 c2 8 10 10 8 20 c3 -2 4 -5 4 -8 c6 8 2 18 -12 18 Z" fill={c.flame} />
          <Path d="M174 148 c-5 -4 -3 -10 0 -13 c1 4 5 5 4 9 Z" fill={c.gold} />
        </G>
      );
    case 'steam':
      return <Path d={index === 0 ? 'M7 -6 q-4 -6 0 -12' : 'M15 -6 q-4 -6 0 -12'} stroke={c.steam} strokeWidth={2.5} fill="none" strokeLinecap="round" />;
    default:
      return null;
  }
}
