// Single source of truth for every color, font, size, spacing, radius and motion value.
// Components read tokens through `useTheme()` and never hardcode values.
// Design changes: edit this file first, then the component.
//
// Aesthetic: warm and calm, after Anthropic's Claude — ivory and charcoal surfaces, clay
// accent, olive/kraft/slate-blue supporting hues, Lora (serif) for titles, big numbers and
// Lumi's own words, Poppins for the interface. Colors stay soft; every color or state change
// cross-fades. Contrast was measured: body and label text >= 4.5:1, chart marks >= 3:1.

import { useColorScheme, type TextStyle } from 'react-native';
import type { Subject } from './data/topics';

export type ColorScheme = 'light' | 'dark';

export interface ColorTokens {
  /** Kâğıt (paper) / night desk. */
  background: string;
  /** A sheet on the paper. */
  surface: string;
  /** Wells, inputs, thumbnails, tracks, the segmented track. */
  surfaceAlt: string;
  /** The 1 pt sheet edge, in both schemes. */
  border: string;
  /** Kurşun: body text is this, not grey. */
  text: string;
  /** Secondary lines only. */
  textMuted: string;
  /** White on the *Strong fills and avatars only. Never on `primary`: use `onPrimary`. */
  textOnAccent: string;
  /** Label and icon on a `primary` fill (white on graphite, ink on the dark-mode lamp). */
  onPrimary: string;
  transparent: string;

  /** The primary button fill (one per screen): graphite in light, the fosfor lamp in dark. */
  primary: string;
  /** Ghost and link labels (always with a leading icon), header tint, focus ring. */
  primaryText: string;
  /** Quiet selected fill, the user's chat bubble, a pressed row tint. */
  primarySoft: string;
  /** Fosfor: Lumi's light, the XP fill, badge discs, "you" and "today". Never text on light. */
  accent: string;
  /** A filled optik bubble (active tab, chosen answer, finished goal, selected chip). */
  mark: string;
  /** Icon or letter on a `mark`. */
  markInk: string;
  /** Printed outline of an empty bubble. Decorative: always beside a full-contrast label. */
  optik: string;
  /** Rails, ladder tracks and hairlines inside optik blocks. */
  optikSoft: string;
  /** The highlighter swipe. */
  highlight: string;
  /** Text sitting on a swipe. */
  highlightInk: string;
  /** Lumi's sticky note, its text and its lifted-corner shade. */
  note: string;
  noteInk: string;
  noteEdge: string;
  /** Lumi's speech bubble (MascotNote): the same paper as `note`. */
  bubble: string;
  /** Hint sheets (with a 3 pt fosfor left edge). */
  hintBackground: string;

  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  neutral: string;
  neutralSoft: string;
  /** Status fills under white text (selected result buttons, result badge). */
  successStrong: string;
  dangerStrong: string;
  neutralStrong: string;
  info: string;

  /** XP fill (fosfor); `xpText` is the readable tone for XP numbers; `xpTrack` the graphite groove. */
  xp: string;
  xpText: string;
  xpTrack: string;
  /** Lumi orange: an icon or fill only (never text). */
  streak: string;
  streakSoft: string;

  /** The floating optik strip is a sheet. */
  tabBar: string;
  tabActive: string;
  tabInactive: string;
  /** A control that can't be used yet: quiet paper-grey with readable text. */
  disabledBg: string;
  disabledFg: string;
  /** Timer focus mode: the darkened edges. */
  focusVignette: string;
  /** Veil behind the result badge so it reads over busy content. */
  celebrationScrim: string;

  // Camera / crop screens are always dark, regardless of system theme.
  cameraBackground: string;
  cameraForeground: string;
  cameraScrim: string;
  /** Fosfor crop handles. */
  cropFrame: string;

  /** Celebration pieces, drawn as highlighter strokes. */
  confetti: string[];

  /** Badge medallions by tier, the foil sheen, and the muted look of a badge not earned yet. */
  badge: { bronze: string; silver: string; gold: string; ink: string; locked: string; lockedInk: string; foil: string };

  /** Lumi, the assistant character (components/mascot): its own flat palette. */
  mascot: MascotColors;

  /**
   * Depth, as CSS box-shadow strings (RN New Architecture and the web both read them).
   * Paper lies flat (a 1 pt edge, almost no shadow); only objects float (strip, dock, note,
   * timer ear). Dark: a faint top-edge highlight, deep shadows only for floating things,
   * and a lamp glow around the fosfor CTA.
   */
  shadow: { card: string; raised: string; floating: string; accent: string; note: string; none: string };
  /** @deprecated Home's old goal rings; removed with TodayRings. */
  rings: { review: string; focus: string; solve: string };
  /** Exam pills: TYT in fosfor ink, AYT in violet, so the exam is clear at a glance. */
  exam: Record<'TYT' | 'AYT', { fg: string; bg: string }>;

  /** Avatar circle fills (initial in `textOnAccent`). The key names are stored server-side. */
  avatar: Record<'clay' | 'kraft' | 'olive' | 'sky' | 'plum' | 'sand' | 'slate' | 'rose', string>;

  /** Subject ink: dots, edges, meters, chart strokes. */
  subject: Record<Subject, string>;
  /** Subject highlighter tint (chip fills, swipes). Text on it is `text`, never the ink. */
  subjectSoft: Record<Subject, string>;

  /** Chart roles. Light: a pencil line. Dark: a glowing fosfor line. */
  chart: {
    line: string;
    /** Area wash under a line. */
    area: string;
    bar: string;
    /** Today's bar or point. */
    today: string;
    grid: string;
    axisText: string;
    crosshair: string;
    /** Ring around markers so they stay legible over lines. */
    markerRing: string;
  };
}

export interface MascotColors {
  body: string;
  shade: string;
  highlight: string;
  arm: string;
  foot: string;
  ink: string;
  eyeShine: string;
  cheek: string;
  /** The light on its antenna (it *is* the highlighter), its halo and highlight. */
  glow: string;
  glowSoft: string;
  glowShine: string;
  /** Props: headphones, caps; gold for crowns and pom-poms; paper for books and cups. */
  gear: string;
  gearSoft: string;
  gold: string;
  goldDeep: string;
  paper: string;
  paperShade: string;
  ruling: string;
  heart: string;
  water: string;
  steam: string;
  flame: string;
  accentBlue: string;
  accentGreen: string;
  /** The held highlighter: its body and cap. */
  marker: string;
  markerCap: string;
  shadow: string;
}

/** Lumi: a brighter tangerine, so it reads as made of highlighter colors. */
const MASCOT_BASE = {
  body: '#E07B54',
  shade: '#C9623F',
  highlight: '#F4A27F',
  arm: '#D96F4B',
  foot: '#B4553A',
  ink: '#2A1C17',
  eyeShine: '#FFFFFF',
  cheek: '#F59C93',
  glow: '#FFC94D',
  glowSoft: 'rgba(255, 201, 77, 0.28)',
  glowShine: '#FFF3C4',
  gear: '#3B3633',
  gearSoft: '#5A524C',
  gold: '#E9B23E',
  goldDeep: '#D39B2A',
  paper: '#FFF8EC',
  paperShade: '#F4ECDD',
  ruling: '#C9BDA8',
  heart: '#E5544B',
  water: '#7FB8E6',
  steam: '#B9B2A6',
  flame: '#F08A3C',
  accentBlue: '#6A9BCC',
  accentGreen: '#7FA36A',
  marker: '#D97757',
  markerCap: '#3B3633',
};

/** Avatar fills shared by both schemes (dark lifts the three darkest). */
const AVATAR_BASE = {
  clay: '#B5573A',
  kraft: '#8F6328',
  olive: '#566F3D',
  sky: '#3F6D9C',
  plum: '#8A4F75',
  sand: '#7A6A4F',
  slate: '#56606B',
  rose: '#A8484F',
};

const light: ColorTokens = {
  background: '#F4F2EC',
  surface: '#FFFEFB',
  surfaceAlt: '#EEEBE3',
  border: '#E4E1D8',
  text: '#141413',
  textMuted: '#6B6962',
  textOnAccent: '#FFFFFF',
  onPrimary: '#FFFFFF',
  transparent: 'transparent',

  primary: '#B5573A',
  primaryText: '#A84F33',
  primarySoft: '#F6E8E1',
  accent: '#D97757',
  mark: '#B5573A',
  markInk: '#FFFFFF',
  optik: '#D3CCBF',
  optikSoft: '#ECE7DD',
  highlight: '#F5D9CB',
  highlightInk: '#141413',
  note: '#F3EEE4',
  noteInk: '#141413',
  noteEdge: '#E6DFD2',
  bubble: '#F3EEE4',
  hintBackground: '#F7EFE2',

  success: '#566F3D',
  successSoft: '#E9EEDF',
  danger: '#A8443A',
  dangerSoft: '#F9EAE6',
  warning: '#8A5E1A',
  warningSoft: '#F6EDDB',
  neutral: '#66635C',
  neutralSoft: '#ECEAE2',
  successStrong: '#566F3D',
  dangerStrong: '#A8443A',
  neutralStrong: '#6E6B63',
  info: '#4F79A8',

  xp: '#C9954C',
  xpText: '#7E5616',
  xpTrack: '#EFE6D8',
  streak: '#D97757',
  streakSoft: '#F6E8E1',

  tabBar: '#FFFEFB',
  tabActive: '#A84F33',
  tabInactive: '#6B6962',
  disabledBg: '#ECE9E1',
  disabledFg: '#7A776F',
  focusVignette: 'rgba(20, 20, 19, 0.06)',
  celebrationScrim: 'rgba(245, 244, 238, 0.72)',

  cameraBackground: '#000000',
  cameraForeground: '#FFFFFF',
  cameraScrim: 'rgba(0, 0, 0, 0.55)',
  cropFrame: '#FFFFFF',

  confetti: ['#D97757', '#C9954C', '#788C5D', '#6A9BCC', '#E4B9A3'],
  badge: { gold: '#B8862F', silver: '#7D8794', bronze: '#B87A45', ink: '#FFFFFF', locked: '#E4E1D8', lockedInk: '#8F8C84', foil: '#F6E3D6' },
  mascot: { ...MASCOT_BASE, shadow: 'rgba(0, 0, 0, 0.10)' },
  shadow: {
    card: '0px 1px 2px rgba(48, 36, 24, 0.06), 0px 4px 14px rgba(48, 36, 24, 0.05)',
    raised: '0px 2px 6px rgba(48, 36, 24, 0.07), 0px 14px 32px -10px rgba(48, 36, 24, 0.18)',
    floating: '0px 10px 24px rgba(48, 36, 24, 0.10), 0px 30px 60px -20px rgba(48, 36, 24, 0.28)',
    accent: '0px 8px 18px -8px rgba(181, 87, 58, 0.45)',
    note: '0px 2px 6px rgba(48, 36, 24, 0.06), 0px 12px 24px -12px rgba(48, 36, 24, 0.16)',
    none: '0px 0px 0px rgba(0, 0, 0, 0)',
  },
  rings: { review: '#B5573A', focus: '#6F8A4E', solve: '#4F79A8' },
  exam: { TYT: { fg: '#A84F33', bg: '#F6E8E1' }, AYT: { fg: '#3F6D9C', bg: '#E5EDF6' } },
  avatar: AVATAR_BASE,

  subject: {
    'Türkçe': '#C4603D',
    'Sosyal': '#A8783A',
    'Temel Matematik': '#4A7AAE',
    'Fen': '#788C5D',
    'Matematik': '#5468B0',
    'Fizik': '#2F8A87',
    'Kimya': '#B0739B',
    'Biyoloji': '#5E9442',
  },
  subjectSoft: {
    'Türkçe': '#F6E3DA',
    'Sosyal': '#F2E7D6',
    'Temel Matematik': '#E2EAF3',
    'Fen': '#E8EDE0',
    'Matematik': '#E3E6F3',
    'Fizik': '#DDEEEC',
    'Kimya': '#F1E5EC',
    'Biyoloji': '#E4EFDD',
  },

  chart: {
    line: '#C96442',
    area: 'rgba(201, 100, 66, 0.10)',
    bar: '#C96442',
    today: '#D97757',
    grid: '#E4E1D8',
    axisText: '#6B6962',
    crosshair: '#6B6962',
    markerRing: '#FBFAF7',
  },
};

const dark: ColorTokens = {
  background: '#1A1917',
  surface: '#252422',
  surfaceAlt: '#302E2B',
  border: '#3B3A36',
  text: '#F3F0E9',
  textMuted: '#ABA79C',
  textOnAccent: '#FFFFFF',
  onPrimary: '#FFFFFF',
  transparent: 'transparent',

  primary: '#B5573A',
  primaryText: '#E08B6D',
  primarySoft: '#3B2A22',
  accent: '#D97757',
  mark: '#C2603F',
  markInk: '#FFFFFF',
  optik: '#4D4A44',
  optikSoft: '#33312D',
  highlight: '#5A3B2E',
  highlightInk: '#F3F0E9',
  // Dark mode: a dim warm paper note instead of a bright yellow block (soft palette).
  note: '#33312D',
  noteInk: '#F3F0E9',
  noteEdge: '#3F3C37',
  bubble: '#33312D',
  hintBackground: '#322C24',

  success: '#A3B886',
  successSoft: '#2B3224',
  danger: '#E48A7D',
  dangerSoft: '#3D2622',
  // Orange in dark, so a warning never reads as the fosfor CTA.
  warning: '#DDB377',
  warningSoft: '#3A3023',
  neutral: '#B3B0A6',
  neutralSoft: '#33322F',
  successStrong: '#5E7A44',
  dangerStrong: '#B04A3E',
  neutralStrong: '#76736A',
  info: '#8DB4DE',

  xp: '#D4A27F',
  xpText: '#E3B98F',
  xpTrack: '#3A332B',
  streak: '#E08B6D',
  streakSoft: '#3B2A22',

  tabBar: '#252422',
  tabActive: '#E08B6D',
  tabInactive: '#908D84',
  disabledBg: '#33312E',
  disabledFg: '#9D998F',
  focusVignette: 'rgba(0, 0, 0, 0.45)',
  celebrationScrim: 'rgba(31, 30, 29, 0.72)',

  cameraBackground: '#000000',
  cameraForeground: '#FFFFFF',
  cameraScrim: 'rgba(0, 0, 0, 0.55)',
  cropFrame: '#FFFFFF',

  confetti: ['#E08B6D', '#D4A27F', '#A3B886', '#8DB4DE', '#F0C6B3'],
  badge: { gold: '#B8862F', silver: '#7D8794', bronze: '#B87A45', ink: '#FFFFFF', locked: '#3B3A36', lockedInk: '#85827A', foil: '#F0C6B3' },
  mascot: { ...MASCOT_BASE, shadow: 'rgba(0, 0, 0, 0.45)' },
  shadow: {
    card: 'inset 0px 1px 0px rgba(255, 248, 240, 0.04)',
    raised: 'inset 0px 1px 0px rgba(255, 248, 240, 0.06), 0px 16px 40px -12px rgba(0, 0, 0, 0.55)',
    floating: 'inset 0px 1px 0px rgba(255, 248, 240, 0.07), 0px 24px 60px -16px rgba(0, 0, 0, 0.70)',
    accent: '0px 0px 0px rgba(0, 0, 0, 0)',
    note: '0px 16px 30px -14px rgba(0, 0, 0, 0.50)',
    none: '0px 0px 0px rgba(0, 0, 0, 0)',
  },
  rings: { review: '#E08B6D', focus: '#A3B886', solve: '#8DB4DE' },
  exam: { TYT: { fg: '#E08B6D', bg: '#3B2A22' }, AYT: { fg: '#8DB4DE', bg: '#22303D' } },
  avatar: AVATAR_BASE,

  subject: {
    'Türkçe': '#E08B6D',
    'Sosyal': '#D4A27F',
    'Temel Matematik': '#8DB4DE',
    'Fen': '#A3B886',
    'Matematik': '#9AA8E0',
    'Fizik': '#7CC4C0',
    'Kimya': '#C99BB8',
    'Biyoloji': '#9CC685',
  },
  subjectSoft: {
    'Türkçe': '#3B2A22',
    'Sosyal': '#3A3023',
    'Temel Matematik': '#22303D',
    'Fen': '#2B3224',
    'Matematik': '#272C3D',
    'Fizik': '#213634',
    'Kimya': '#352833',
    'Biyoloji': '#283325',
  },

  chart: {
    line: '#D4714F',
    area: 'rgba(212, 113, 79, 0.12)',
    bar: '#D4714F',
    today: '#E08B6D',
    grid: '#3B3A36',
    axisText: '#A8A59B',
    crosshair: '#A8A59B',
    markerRing: '#2A2927',
  },
};

/**
 * Font families, one per weight (iOS custom fonts don't synthesize weights). Loaded in the
 * root layout from @expo-google-fonts and inlined by the web preview. Poppins and Lora are
 * the open fonts of Anthropic's brand guidelines: Poppins for the interface, Lora for titles,
 * big numbers and Lumi's own words.
 */
const sans = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

const serif = {
  regular: 'Lora_400Regular',
  medium: 'Lora_500Medium',
  semibold: 'Lora_600SemiBold',
  bold: 'Lora_700Bold',
} as const;

export const fonts = {
  /** Poppins: the interface. */
  sans,
  /** Lora: titles and big numbers (the `display` text variants). */
  display: serif,
  /** Lora: Lumi's own words. Same faces as `display`. */
  serif,
} as const;

/** `serif` is a deprecated alias of `display`. */
export type FontKind = keyof typeof fonts;
export type FontWeightName = keyof typeof fonts.sans;

/** Style for a font family + weight (sets the family, never a synthetic weight). */
export function font(kind: FontKind, weight: FontWeightName = 'regular'): TextStyle {
  return { fontFamily: fonts[kind][weight] };
}

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Use with `borderCurve: 'continuous'` everywhere. */
export const radius = {
  /** The highlighter swipe, note corners. */
  xs: 4,
  /** Thumbnails, podium tops. */
  sm: 8,
  /** Inputs, small buttons, rows. */
  md: 12,
  /** Every button. */
  button: 14,
  /** Sheets, including the hero. */
  lg: 16,
  /** Floating objects: the strip, the dock, modal sheets, the timer ear, TimerPill. */
  xl: 24,
  /** Bubbles, chips, badges, the segmented thumb. */
  pill: 999,
} as const;

/**
 * Raw font sizes for text drawn outside AppText (SvgText, TextInput, tab labels), phone
 * sizes. `fontSizeTablet` has the same keys for windows ≥ 560 pt; pick the table with
 * `useFontScale()` (lib/layout.tsx).
 */
export const fontSize = {
  xxs: 11,
  xs: 13,
  sm: 14,
  md: 16,
  lg: 17,
  xl: 20,
  xxl: 30,
  display: 40,
  hero: 56,
  /** The timer clock. */
  numeral: 64,
} as const;

export const fontSizeTablet = {
  xxs: 12,
  xs: 14,
  sm: 15,
  md: 17,
  lg: 19,
  xl: 22,
  xxl: 40,
  display: 48,
  hero: 76,
  numeral: 96,
} as const;

/** One font-size table (`fontSize` or `fontSizeTablet`). */
export type FontScale = { readonly [K in keyof typeof fontSize]: number };

export type TypeVariant = 'hero' | 'numeral' | 'title' | 'stat' | 'numeric' | 'heading' | 'body' | 'note' | 'label' | 'caption' | 'micro';

export interface TypeStyle {
  /** `display` = Lora (titles and big numbers), `sans` = Poppins. */
  kind: 'sans' | 'display';
  weight: FontWeightName;
  /** Phone size, and the size once the window is ≥ 560 pt wide (never the content width). */
  size: number;
  sizeTablet: number;
  /** Line height as a multiple of the font size. */
  lineRatio: number;
  /** Letter spacing on phone and tablet. */
  tracking: number;
  trackingTablet: number;
  /** Tabular figures. */
  tabular: boolean;
  /** Dynamic Type cap (maxFontSizeMultiplier). */
  maxScale: number;
}

/**
 * The text styles AppText reads. Big numbers and titles are Lora (serif), everything else
 * Poppins. Units after a number are a separate label/caption, never inside the numeral
 * string. Lora needs real line height: never below 1.1 or ascenders clip (İ, Ş).
 */
export const typography: Record<TypeVariant, TypeStyle> = {
  /** YKS countdown, deneme net hero, review count. */
  hero: { kind: 'display', weight: 'semibold', size: fontSize.hero, sizeTablet: fontSizeTablet.hero, lineRatio: 1.15, tracking: -0.5, trackingTablet: -1.0, tabular: true, maxScale: 1.2 },
  /** The timer clock. */
  numeral: { kind: 'display', weight: 'regular', size: fontSize.numeral, sizeTablet: fontSizeTablet.numeral, lineRatio: 1.15, tracking: -1.0, trackingTablet: -1.0, tabular: true, maxScale: 1.2 },
  /** Screen titles, on tab and stack screens alike. */
  title: { kind: 'display', weight: 'semibold', size: fontSize.xxl, sizeTablet: fontSizeTablet.xxl, lineRatio: 1.2, tracking: -0.3, trackingTablet: -0.4, tabular: false, maxScale: 1.2 },
  /** Card numbers: 6, 82,25, 1275. */
  stat: { kind: 'display', weight: 'semibold', size: 28, sizeTablet: 34, lineRatio: 1.18, tracking: 0, trackingTablet: 0, tabular: true, maxScale: 1.3 },
  /** Inline numbers: 0/5, 12/50 dk, D Y B, XP, ranks, the clock in the timer ear. */
  numeric: { kind: 'sans', weight: 'semibold', size: 16, sizeTablet: 17, lineRatio: 1.35, tracking: 0, trackingTablet: 0, tabular: true, maxScale: 1.6 },
  /** Section headings on the paper, sheet titles. */
  heading: { kind: 'sans', weight: 'semibold', size: fontSize.lg, sizeTablet: fontSizeTablet.lg, lineRatio: 1.32, tracking: -0.2, trackingTablet: -0.2, tabular: false, maxScale: 1.6 },
  /** The default, in `text`. */
  body: { kind: 'sans', weight: 'regular', size: fontSize.md, sizeTablet: fontSizeTablet.md, lineRatio: 1.5, tracking: 0, trackingTablet: 0, tabular: false, maxScale: 1.6 },
  /** Lumi's notes and hints. */
  note: { kind: 'sans', weight: 'medium', size: 15, sizeTablet: 16, lineRatio: 1.45, tracking: 0, trackingTablet: 0, tabular: false, maxScale: 1.6 },
  /** Controls, row titles. */
  label: { kind: 'sans', weight: 'medium', size: fontSize.sm, sizeTablet: fontSizeTablet.sm, lineRatio: 1.36, tracking: 0, trackingTablet: 0, tabular: false, maxScale: 1.6 },
  /** Secondary lines (in `textMuted`). */
  caption: { kind: 'sans', weight: 'regular', size: fontSize.xs, sizeTablet: fontSizeTablet.xs, lineRatio: 1.38, tracking: 0, trackingTablet: 0, tabular: false, maxScale: 1.6 },
  /** Tab labels and badge text only. */
  micro: { kind: 'sans', weight: 'semibold', size: fontSize.xxs, sizeTablet: fontSizeTablet.xxs, lineRatio: 1.27, tracking: 0.1, trackingTablet: 0.1, tabular: false, maxScale: 1.6 },
};

/** @deprecated Read `typography[variant].lineRatio`. */
export const lineRatio = {
  display: typography.stat.lineRatio,
  title: typography.title.lineRatio,
  heading: typography.heading.lineRatio,
  body: typography.body.lineRatio,
  label: typography.label.lineRatio,
  caption: typography.caption.lineRatio,
  eyebrow: typography.label.lineRatio,
} as const;

/** @deprecated Read `typography[variant].tracking`. Eyebrows are sentence case now (no tracking). */
export const letterSpacing = {
  display: typography.stat.tracking,
  title: typography.title.tracking,
  normal: 0,
  eyebrow: 0,
} as const;

/** Bezier control points [x1, y1, x2, y2]. */
type Bezier = readonly [number, number, number, number];
interface SpringConfig {
  damping: number;
  stiffness: number;
  mass: number;
}

const springs = {
  press: { damping: 20, stiffness: 520, mass: 0.6 },
  settle: { damping: 16, stiffness: 190, mass: 0.9 },
  bouncy: { damping: 11, stiffness: 220, mass: 0.8 },
  /** Lumi touching down. */
  land: { damping: 9, stiffness: 260, mass: 0.7 },
  note: { damping: 14, stiffness: 260, mass: 0.8 },
  /** The segmented thumb, list reflow. */
  thumb: { damping: 18, stiffness: 260, mass: 0.8 },
} as const satisfies Record<string, SpringConfig>;

const verdict = {
  /** The pause between "Kodla" and the verdict, so the beat reads, and its haptic ticks. */
  dwell: 380,
  drumroll: [110, 220],
  checkDraw: 260,
  penCircle: 320,
  penSweepDeg: 380,
  penStartDeg: -30,
  shakeDistance: 6,
  shakeMs: 300,
} as const;

/** Bezier easings by role; `presets.ease(name)` turns one into Easing.bezier(...). */
const easing = {
  standard: [0.2, 0, 0, 1],
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
  /** The scribble fill of a bubble. */
  pencil: [0.45, 0.05, 0.55, 0.95],
  /** The highlighter swipe and Lumi's glide along it. */
  highlighter: [0.65, 0, 0.35, 1],
  /** Lumi's flight. */
  flight: [0.45, 0, 0.2, 1],
  /** Loops (replaces Easing.inOut(Easing.sin)). */
  breath: [0.37, 0, 0.63, 1],
} as const satisfies Record<string, Bezier>;

const press = { button: 0.96, card: 0.985, bubble: 0.9, row: 1, nudgeY: 1, fade: 0.08, rmOpacity: 0.72 } as const;

/** Durations (ms), easings and springs for every animation. Reduced-motion users get fades only. */
export const motion = {
  duration: { instant: 90, fast: 140, base: 220, slow: 360, page: 420, celebrate: 1400 },
  easing,
  springs,
  /** @deprecated alias of `springs.settle`. */
  spring: springs.settle,
  /** @deprecated alias of `springs.bouncy`. */
  springBouncy: springs.bouncy,
  /** Press feedback per PressableScale kind: scale, the button's sink (pt), the card fade and the reduced-motion opacity. */
  press,
  /** @deprecated alias of `press.button`. */
  pressScale: press.button,
  /** @deprecated alias of `press.fade`. */
  pressFade: press.fade,
  /** Delay between items appearing one after another, and the most items that stagger. */
  stagger: 40,
  staggerMax: 6,
  /** How far content travels when it fades in (pt). */
  rise: 8,
  /** The gap between the two selection ticks of the `grain` haptic (pencil on paper). */
  grainGap: 60,
  /** A bubble filling: zigzag strokes, then the solid fill; and its erase. */
  scribble: { ms: 200, fillFade: 90, eraseMs: 140, eraseScale: 0.82, strokes: 6 },
  verdict,
  /** @deprecated alias of `verdict.dwell`. */
  verdictDwell: verdict.dwell,
  /** @deprecated alias of `verdict.drumroll`. */
  drumroll: verdict.drumroll,
  /** @deprecated Sideways shake of the "wrong" badge; replaced by the red-pen loop (verdict). */
  shake: { distance: verdict.shakeDistance, steps: [50, 70, 60, 60] },
  highlight: { draw: 420, retract: 220, pressGrow: 140, strike: 260 },
  /** "Netleşme": two ghost copies converge on the real text. */
  focusPull: { ms: 420, ghostOffset: 4, ghostOpacity: 0.35, startScale: 1.06, startOpacity: 0.5 },
  odometer: { digitStagger: 30 },
  progress: { fill: 720, shine: 600 },
  tabs: { fade: 140, compact: 220, labelDrop: 6, wiggleDeg: 4, wiggleMs: 180, longPress: 450, keyboard: 200, compactVelocity: 900 },
  companion: {
    takeoffScale: 0.86,
    takeoffMs: 90,
    flightMin: 700,
    flightMax: 1150,
    msPerPt: 1.1,
    glideMs: 420,
    homeHopMs: 420,
    returnMs: 600,
    trailSpawnMs: 60,
    trailFadeMs: 360,
    noteFromScale: 0.92,
    noteFromDeg: -4,
    notePeelMs: 220,
    notePeelDeg: 6,
    notePeelRise: 8,
    holdBaseMs: 4000,
    holdPerCharMs: 55,
    holdMaxMs: 9000,
    firstLineDelayMs: 1200,
    quietAfterTouchMs: 1500,
    dwellMs: 4000,
    navQuietMs: 2000,
    rmFadeMs: 160,
    typePerWordMs: 22,
    typeMaxMs: 600,
    nestBlink: [4000, 7000],
    /** A perch shows its own still Lumi when the companion hasn't landed on it by then. */
    perchFallbackMs: 600,
  },
  mascot: {
    poseSpring: { damping: 13, stiffness: 140, mass: 0.8 },
    hopUp: 240,
    hopDown: 220,
    reactionMs: 1600,
    fidget: [2200, 5400],
    blinkMs: 110,
    enterFrom: 0.4,
    enterRise: 18,
    flapDeg: 18,
    flapPeriodMs: 140,
    fxPhaseMs: 750,
  },
  /**
   * A right answer's local burst: pieces (highlighter strokes w × h), how far they fly (pt)
   * and for how long (ms); the XP chip's rise and sideways sway (pt), its width, and where
   * the row's letter disc sits from the row's left edge.
   */
  inlineBurst: { particles: 12, distance: 64, ms: 760, rise: 44, sway: 14, chipWidth: 96, letterInset: 24, stroke: { w: 10, h: 3 } },
  /** Timer focus mode: how fast and how far the rest of the screen dims. */
  timerFocus: { dimMs: 600, dim: 0.4 },
} as const;

export type EasingName = keyof typeof motion.easing;
export type SpringName = keyof typeof motion.springs;

export const opacity = {
  /** Disabled controls. */
  disabled: 0.5,
  /** Loading placeholders breathe between these. */
  skeleton: { low: 0.45, high: 1 },
  /** The graph-paper band's lines, per scheme. */
  /** Graph-paper band; 0 = off (the warm Anthropic paper is plain). */
  kareli: { light: 0, dark: 0 },
  /** FocusPull ghosts and other echoes. */
  ghost: 0.35,
  /** Analysis content while it refetches. */
  analysisRefetch: 0.6,
  /** The camera's framing guide. */
  cameraGuide: 0.7,
} as const;

/**
 * Size classes. `window` decides chrome and type size (tablet ≥ 560), the 12-column wide
 * grid (landscape ≥ 1000) and split two-pane screens; `content` is measured inside a screen
 * and decides grids.
 */
export const breakpoints = {
  window: { tablet: 560, landscape: 1000, split: 960 },
  content: { regular: 560, wide: 860 },
} as const;

const minTouch = 44;
const borderWidth = 1;
const selectedBorder = 1.5;
const iconSize = { sm: 18, md: 22, lg: 28, xl: 40 } as const;
const iconStroke = 2.0;

export const layout = {
  /** Interaction basics: the minimum touch target (Apple HIG), hairlines, icon sizes. */
  system: { minTouch, borderWidth, selectedBorder, hitSlop: 8, iconSize, iconStroke },
  /** Window grid: 4 / 8 / 12 columns by window width (< 560, < 1000, ≥ 1000). */
  grid: {
    compact: { columns: 4, gutter: 12, margin: 16 },
    regular: { columns: 8, gutter: 20, margin: 28 },
    wide: { columns: 12, gutter: 20, margin: 32 },
  },
  /** Cap for tab screens (dashboards), so the title never jumps between tabs. */
  dashboardWidth: 1116,
  /** Comfortable reading width for single-column content (solutions, forms, chat). */
  readableWidth: 720,
  /** Inside a sheet. */
  sheetPadding: { compact: 16, tablet: 20 },
  /** The floating optik strip (navigation), its badge, the timer ear and the paper fade above it. */
  tabBar: {
    height: { compact: 66, tablet: 72 },
    compactHeight: 54,
    maxWidth: 520,
    sideInset: { compact: 12, tablet: 32 },
    bottomGap: 12,
    insetTrim: 8,
    bubble: { compact: { w: 52, h: 32 }, tablet: { w: 58, h: 36 } },
    itemMinWidth: { compact: 48, tablet: 72 },
    labelGap: 4,
    padY: 8,
    nestGap: { compact: 8, tablet: 12 },
    badge: { compact: 20, tablet: 22 },
    badgeRing: 2,
    ear: { height: 44, minWidth: 92, ring: 28, gap: 6 },
    fadeAbove: 56,
    reserveExtra: 16,
  },
  /** Lumi, the companion: size, hit area, its note, the flight trail and the landing. */
  companion: {
    size: { compact: 44, tablet: 56 },
    hit: { compact: 48, tablet: 56 },
    noteMaxWidth: { compact: 260, tablet: 320 },
    perchInset: 8,
    trailDots: 5,
    trailDot: { max: 5, min: 2 },
    arcLift: 0.35,
    arcLiftMax: 200,
    bankMaxDeg: 12,
    bobAmp: 3,
    hop: 20,
    haloScale: 1.8,
    ember: 6,
  },
  /** Optik bubbles (ellipses 1.6:1) by size, their printed outline and the scribble fill. */
  bubble: {
    dot: { w: 30, h: 20 },
    row: { w: 32, h: 22 },
    letter: { w: 52, h: 36 },
    outline: 1.6,
    scribbleStroke: 3.2,
    scribbleMinWidth: 28,
  },
  /** The highlighter swipe behind a line of text, and the graphite strike through it. */
  highlight: { heightRatio: 0.62, leadIn: 4, tail: 6, skewDeg: -8, rotateDeg: -1, passes: 2, radii: [3, 6, 4, 7], strikeWidth: 2 },
  /** Lumi's sticky note: tilt, the lifted corner, padding, and the hint sheet's fosfor edge. */
  note: { tiltDeg: -1.2, liftCorner: 18, padding: 14, edge: 3 },
  /** The graph-paper band behind headers. */
  kareli: { cell: 24, bandHeight: 220, heroShare: 0.45 },
  timer: {
    ring: { compact: 260, regular: 380, wide: 340 },
    stroke: 12,
    tick: { major: 10, minor: 5 },
    headDot: 14,
    roundControl: 68,
  },
  podium: { step: { compact: [96, 72, 56], tablet: [120, 92, 72] }, avatar: { first: 64, other: 52 } },
  /** Question photo thumbnails. */
  thumb: { compact: 56, card: { w: 88, h: 66 }, recent: 72 },
  /** The floating answer dock: its row height and its widest. */
  dock: { height: 64, maxWidth: 560 },
  question: { imageCap: { compact: 360, tablet: 420, split: 540 }, chatImageCap: 220 },
  /** Spaced-repetition intervals in days (mirrors the server). */
  ladder: { rungs: [1, 3, 7, 14, 30] },
  /**
   * Stacking, bottom to top: screen content (in-tree highlights and perches), the strip's
   * paper fade, the strip, the timer ear, the companion's note, the companion and its trail,
   * TimerPill; then InlineBurst and RewardBurst (CelebrationProvider), then native modals.
   */
  z: { strip: 10, ear: 11, companionNote: 20, companion: 30, timerPill: 40 },

  screenPadding: spacing.lg,
  /** @deprecated use `sheetPadding`. Inside a card. */
  cardPadding: 20,
  /** Side padding once the window is tablet-sized. */
  screenPaddingRegular: spacing.xl,
  /** @deprecated use `dashboardWidth`. */
  maxContentWidth: 1180,
  /** @deprecated the sidebar is gone; the optik strip is used at every width. */
  sidebarWidth: 220,
  /** Width of the left pane in split screens, as a fraction. */
  splitLeft: 0.46,
  /** Minimum touch target (Apple HIG). */
  minTouch,
  borderWidth,
  /** A selected outline (chips, secondary buttons). */
  selectedBorder,
  progressHeight: 10,
  frameBorder: 2,
  shutterBorder: 4,
  iconSize,
  /** Line icons are drawn at this stroke width (24-unit grid). */
  iconStroke,
  shutterSize: 76,
  /** Camera guide frame width as a share of the screen width (before fitting the height). */
  cameraFrameShare: 0.86,
  cropHandle: 44,
  cropMinSize: 80,
  /** Diameter of the answer-result badge (check / cross) and its glyph stroke (24-unit grid). */
  resultBadge: 96,
  resultStroke: 2.6,
  /** Confetti pieces: strips (long × short) and dots, with the strips' corner radius. */
  confetti: { long: 10, short: 5, dot: 7, radius: 2 },
  /** Size of the "thinking" spark loader. */
  spark: 56,
  /** Question photos: the tallest they show before "Tamamını gör", and the fade height. */
  questionImageCap: { compact: 150, regular: 360, large: 540 },
  questionImageFade: 72,
  /** Letter buttons in the dock (their touch area grows to `minTouch` with hit slop). */
  dockLetter: 40,
  /** Progress pips (hints used). */
  pip: 6,
  /**
   * Guided scroll: something new counts as "in view" when this much of it shows (pt); if
   * not, the page scrolls so it starts this far down the viewport (fraction).
   */
  revealPeek: 120,
  revealAt: 0.18,
  /** Round timer controls (pause, stop). */
  roundControl: 68,
  /** Pomodoro ring diameter and stroke. */
  timerRing: 260,
  timerStroke: 10,
  /** Avatar circle on the leaderboard. */
  avatar: 40,
  /** Lumi, the assistant: in a note (home, empty states) and large (sign-in, celebrations). */
  mascot: { note: 84, hero: 150 },
  /** @deprecated Home's three goal rings; removed with TodayRings. */
  todayRings: { size: 132, stroke: 11, gap: 4, dot: 10 },
  /** The little diamond under Lumi's speech bubble. */
  bubbleTail: 14,
  /** The scanning light over a photo while the AI reads it: its height. */
  scanBeam: 28,
  /** Lumi next to a chat reply, and the size of the "typing" dots. */
  chatAvatar: 36,
  chatDot: 7,
  chart: {
    lineWidth: 2,
    markerRadius: 4,
    ringWidth: 2,
    barThickness: 12,
    barEndRadius: 4,
    trendHeight: { compact: 180, tablet: 240 },
    sparkHeight: 44,
    axisWidth: 34,
    endLabelWidth: 44,
    /** The week's bars: bar width as a share of its slot, and the gap to the day label. */
    weekBar: { barShare: 0.5, labelGap: 6 },
  },
} as const;

export interface Theme {
  scheme: ColorScheme;
  colors: ColorTokens;
  breakpoints: typeof breakpoints;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontSizeTablet: typeof fontSizeTablet;
  typography: typeof typography;
  letterSpacing: typeof letterSpacing;
  lineRatio: typeof lineRatio;
  fonts: typeof fonts;
  motion: typeof motion;
  opacity: typeof opacity;
  layout: typeof layout;
}

const shared = { breakpoints, spacing, radius, fontSize, fontSizeTablet, typography, lineRatio, letterSpacing, fonts, motion, opacity, layout };

const themes: Record<ColorScheme, Theme> = {
  light: { scheme: 'light', colors: light, ...shared },
  dark: { scheme: 'dark', colors: dark, ...shared },
};

export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

/** A subject's ink (dots, edges, meters, chart strokes). */
export function subjectColor(theme: Theme, subject: string): string {
  return theme.colors.subject[subject as Subject] ?? theme.colors.primary;
}

/** A subject's highlighter tint (chip fills, swipes); text on it stays `text`. */
export function subjectSoftColor(theme: Theme, subject: string): string {
  return theme.colors.subjectSoft[subject as Subject] ?? theme.colors.primarySoft;
}

/**
 * How a surface sits on the paper:
 * - `flat`: a well in the paper (surfaceAlt, no edge, no shadow): steppers, chart wells, composer.
 * - `sheet` (alias `card`): every content sheet, a 1 pt edge and almost no shadow.
 * - `raised`: the segmented thumb, a pressed hero.
 * - `floating`: objects above the paper (strip, dock, ear, TimerPill, the companion's note frame);
 *   the strip swaps in `colors.tabBar`.
 * - `note`: Lumi's sticky note only (radius xs with the lifted bottom-right corner).
 */
export type ElevationLevel = 'flat' | 'sheet' | 'card' | 'raised' | 'floating' | 'note';

export interface ElevatedStyle {
  backgroundColor: string;
  borderRadius: number;
  borderBottomRightRadius?: number;
  borderCurve: 'continuous';
  borderWidth: number;
  borderColor: string;
  boxShadow: string;
}

export function elevated(theme: Theme, level: ElevationLevel = 'sheet'): ElevatedStyle {
  const { colors, radius: r, layout: l } = theme;
  switch (level) {
    case 'flat':
      return { backgroundColor: colors.surfaceAlt, borderRadius: r.lg, borderCurve: 'continuous', borderWidth: 0, borderColor: colors.transparent, boxShadow: colors.shadow.none };
    case 'note':
      return {
        backgroundColor: colors.note,
        borderRadius: r.xs,
        borderBottomRightRadius: l.note.liftCorner,
        borderCurve: 'continuous',
        borderWidth: 0,
        borderColor: colors.transparent,
        boxShadow: colors.shadow.note,
      };
    case 'floating':
      return { backgroundColor: colors.surface, borderRadius: r.xl, borderCurve: 'continuous', borderWidth: l.borderWidth, borderColor: colors.border, boxShadow: colors.shadow.floating };
    case 'raised':
      return { backgroundColor: colors.surface, borderRadius: r.lg, borderCurve: 'continuous', borderWidth: l.borderWidth, borderColor: colors.border, boxShadow: colors.shadow.raised };
    case 'sheet':
    case 'card':
    default:
      return { backgroundColor: colors.surface, borderRadius: r.lg, borderCurve: 'continuous', borderWidth: l.borderWidth, borderColor: colors.border, boxShadow: colors.shadow.card };
  }
}
