// Lumi's drawing, part by part, on a 200 × 200 grid (feet at y ≈ 184). Each function
// returns plain react-native-svg elements; Mascot.tsx stacks them in layers that move on
// their own. Flat 2D: solid fills, one shade and one highlight, no outlines.
import { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { MascotColors } from '../../theme';

export type EyeKind = 'open' | 'happy' | 'closed' | 'wide' | 'heart' | 'wink' | 'up' | 'down' | 'sad' | 'spiral';
export type BrowKind = 'sad' | 'focus' | 'raised' | 'worried';
export type MouthKind = 'smile' | 'grin' | 'o' | 'sad' | 'flat' | 'talk' | 'wavy' | 'small' | 'cat';
export type Accessory = 'headphones' | 'party' | 'crown' | 'cap' | 'glasses' | 'book' | 'cup' | 'pompoms' | 'pencil';
export type Effect = 'tear' | 'sweat' | 'zzz' | 'hearts' | 'sparkles' | 'question' | 'exclaim' | 'confetti' | 'flame' | 'steam';

export const ARM_LEN = 30;
export const PIVOT = { l: { x: 44, y: 124 }, r: { x: 156, y: 124 } } as const;
/** Where the character stands; tilts and squashes happen around this point. */
export const GROUND = { x: 100, y: 184 };
export const EYE_Y = 112;
export const MOUTH = { x: 100, y: 128 };
export const ANTENNA_BASE = { x: 108, y: 62 };
export const LIGHT = { x: 118, y: 31 };

const BODY = 'M100 60 C138 60 164 94 164 134 C164 166 138 184 100 184 C62 184 36 166 36 134 C36 94 62 60 100 60 Z';
const SHADE = 'M164 134 C164 166 138 184 100 184 C70 184 47 171 39 150 C58 166 82 172 104 171 C134 169 156 155 164 134 Z';

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
      <Ellipse cx={80} cy={184} rx={14} ry={8} fill={c.foot} />
      <Ellipse cx={120} cy={184} rx={14} ry={8} fill={c.foot} />
    </G>
  );
}

export function AntennaStem({ c }: { c: MascotColors }) {
  return <Path d="M108 62 Q104 46 116 34" stroke={c.shade} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
}

/** The light on the antenna; `halo` is the soft glow around it. */
export function AntennaLight({ c, halo = true }: { c: MascotColors; halo?: boolean }) {
  return (
    <G>
      {halo ? <Circle cx={LIGHT.x} cy={LIGHT.y} r={14} fill={c.glowSoft} /> : null}
      <Circle cx={LIGHT.x} cy={LIGHT.y} r={8} fill={c.glow} />
      <Circle cx={LIGHT.x - 2.5} cy={LIGHT.y - 2.5} r={2.4} fill={c.glowShine} />
    </G>
  );
}

export function Body({ c, blush = false }: { c: MascotColors; blush?: boolean }) {
  return (
    <G>
      <Path d={BODY} fill={c.body} />
      <Path d={SHADE} fill={c.shade} />
      <Ellipse cx={68} cy={84} rx={11} ry={6} fill={c.highlight} transform="rotate(-35 68 84)" />
      <Circle cx={58} cy={98} r={3} fill={c.highlight} />
      <Ellipse cx={64} cy={128} rx={9} ry={5.5} fill={c.cheek} opacity={blush ? 1 : 0.8} />
      <Ellipse cx={136} cy={128} rx={9} ry={5.5} fill={c.cheek} opacity={blush ? 1 : 0.8} />
    </G>
  );
}

export function Eyes({ c, kind }: { c: MascotColors; kind: EyeKind }) {
  const L = 80;
  const R = 120;
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
  const b = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1} L${x2} ${y2}`;
  const d = {
    sad: `${b(72, 100, 86, 94)} ${b(128, 100, 114, 94)}`,
    focus: `${b(72, 98, 87, 102)} ${b(128, 98, 113, 102)}`,
    raised: `${b(73, 93, 86, 90)} ${b(114, 90, 127, 93)}`,
    worried: `${b(73, 99, 86, 94)} ${b(114, 94, 127, 99)}`,
  }[kind];
  return <Path d={d} stroke={c.ink} strokeWidth={3.4} strokeLinecap="round" fill="none" />;
}

export function Mouth({ c, kind }: { c: MascotColors; kind: MouthKind }) {
  const ink = c.ink;
  switch (kind) {
    case 'grin':
      return (
        <G>
          <Path d="M90 125 Q100 140 110 125 Z" fill={ink} />
          <Path d="M94 132 Q100 137 106 132 Q100 129 94 132 Z" fill={c.heart} />
        </G>
      );
    case 'o':
      return <Ellipse cx={100} cy={130} rx={5.5} ry={7} fill={ink} />;
    case 'sad':
      return <Path d="M93 132 Q100 125 107 132" stroke={ink} strokeWidth={3.2} fill="none" strokeLinecap="round" />;
    case 'flat':
      return <Path d="M94 129 L106 129" stroke={ink} strokeWidth={3.2} strokeLinecap="round" />;
    case 'talk':
      return <Path d="M92 124 Q100 138 108 124 Q100 127 92 124 Z" fill={ink} />;
    case 'wavy':
      return <Path d="M91 130 q3 -4 6 0 t6 0 t6 0" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case 'small':
      return <Path d="M96 127 Q100 131 104 127" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case 'cat':
      return <Path d="M92 126 q4 5 8 0 q4 5 8 0" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />;
    default:
      return <Path d="M92 125 Q100 133 108 125" stroke={ink} strokeWidth={3.4} fill="none" strokeLinecap="round" />;
  }
}

/** An arm hanging straight down from its shoulder; the layer (or `angle`) turns it. */
export function Arm({ c, side, angle = 0, held }: { c: MascotColors; side: 'l' | 'r'; angle?: number; held?: 'pompom' | 'pencil' }) {
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
    </G>
  );
}

/** Things worn or held in front of the body (drawn above the face, under the arms). */
export function Worn({ c, item }: { c: MascotColors; item: Accessory }) {
  switch (item) {
    case 'headphones':
      return (
        <G>
          <Path d="M44 118 C40 56 160 56 156 118" stroke={c.gear} strokeWidth={7} fill="none" strokeLinecap="round" />
          <Rect x={32} y={102} width={18} height={30} rx={8} fill={c.gear} />
          <Rect x={150} y={102} width={18} height={30} rx={8} fill={c.gear} />
          <Rect x={36} y={108} width={8} height={18} rx={4} fill={c.body} />
          <Rect x={156} y={108} width={8} height={18} rx={4} fill={c.body} />
        </G>
      );
    case 'party':
      return (
        <G>
          <Path d="M70 70 L84 26 L100 64 Z" fill={c.accentBlue} />
          <Path d="M76 52 L91 47 M73 61 L96 55" stroke={c.paper} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={84} cy={25} r={6} fill={c.gold} />
        </G>
      );
    case 'crown':
      return (
        <G>
          <Path d="M74 66 L70 40 L84 52 L94 34 L104 52 L118 40 L114 66 Z" fill={c.gold} />
          <Circle cx={94} cy={34} r={3.5} fill={c.heart} />
          <Rect x={74} y={62} width={40} height={7} rx={3} fill={c.goldDeep} />
        </G>
      );
    case 'cap':
      return (
        <G>
          <Path d="M60 52 L100 36 L140 52 L100 68 Z" fill={c.gear} />
          <Path d="M78 60 L78 72 Q100 82 122 72 L122 60 L100 68 Z" fill={c.gearSoft} />
          <Path d="M140 52 L140 72" stroke={c.gold} strokeWidth={3} />
          <Circle cx={140} cy={74} r={4} fill={c.gold} />
        </G>
      );
    case 'glasses':
      return (
        <G>
          <Circle cx={80} cy={112} r={13} fill={c.paper} fillOpacity={0.18} stroke={c.gear} strokeWidth={3.5} />
          <Circle cx={120} cy={112} r={13} fill={c.paper} fillOpacity={0.18} stroke={c.gear} strokeWidth={3.5} />
          <Path d="M93 111 L107 111" stroke={c.gear} strokeWidth={3.5} />
        </G>
      );
    case 'book':
      return (
        <G>
          <Path d="M64 142 L100 150 L136 142 L136 172 L100 180 L64 172 Z" fill={c.accentBlue} />
          <Path d="M68 140 L100 147 L100 176 L68 169 Z" fill={c.paper} />
          <Path d="M132 140 L100 147 L100 176 L132 169 Z" fill={c.paperShade} />
          <Path d="M75 150 L94 154 M75 157 L94 161 M106 154 L125 150 M106 161 L125 157" stroke={c.ruling} strokeWidth={2} strokeLinecap="round" />
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
      return <Path d="M74 124 q-5 9 0 13 q5 -4 0 -13 Z" fill={c.water} />;
    case 'sweat':
      return <Path d="M148 76 q-7 11 0 15 q7 -4 0 -15 Z" fill={c.water} />;
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
        <Path d="M38 70 l3 -9 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3 Z" fill={c.gold} />
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
