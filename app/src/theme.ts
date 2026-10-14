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
  /** The scan's own white, which a clipped question photo fades into (the dark sheet left a grey smear). */
  photoPaper: string;

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
  /** The lighter core behind the face. */
  core: string;
  arm: string;
  foot: string;
  ink: string;
  eyeShine: string;
  cheek: string;
  /** The gold light in the flame's tip, its halo and highlight. */
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

/** Lumi: a clay flame (the app's accent clay) with a gold light in its tip. */
const MASCOT_BASE = {
  body: '#D97757',
  shade: '#C2603F',
  highlight: '#F4B094',
  core: '#EFA07D',
  arm: '#C2603F',
  foot: '#B5573A',
  ink: '#2A1C17',
  eyeShine: '#FFFFFF',
  cheek: '#F29C8C',
  glow: '#F0BE5E',
  glowSoft: 'rgba(240, 190, 94, 0.28)',
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
  photoPaper: '#FFFEFB',

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
  photoPaper: '#FFFFFF',

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
 * `useFontScale()` (lib/layout.tsx). The tablet table is read at arm's length on a 10–13"
 * iPad: nothing under 13, captions 15, labels 16, body 17, headings 20; the Lora display
 * sizes are unchanged.
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
  xxs: 13,
  xs: 15,
  sm: 16,
  md: 17,
  lg: 20,
  xl: 23,
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
export const typography: Record<TypeVariant, TypeStyle> & {
  /** How far Lora figures sit above their line box bottom, as a share of the size; aligns labels beside a big number. */
  figureDrop: number;
} = {
  /** YKS countdown, deneme net hero, review count. */
  hero: { kind: 'display', weight: 'semibold', size: fontSize.hero, sizeTablet: fontSizeTablet.hero, lineRatio: 1.15, tracking: -0.5, trackingTablet: -1.0, tabular: true, maxScale: 1.2 },
  /** The timer clock. */
  numeral: { kind: 'display', weight: 'regular', size: fontSize.numeral, sizeTablet: fontSizeTablet.numeral, lineRatio: 1.15, tracking: -1.0, trackingTablet: -1.0, tabular: true, maxScale: 1.2 },
  /** Screen titles, on tab and stack screens alike. */
  title: { kind: 'display', weight: 'semibold', size: fontSize.xxl, sizeTablet: fontSizeTablet.xxl, lineRatio: 1.2, tracking: -0.3, trackingTablet: -0.4, tabular: false, maxScale: 1.2 },
  /** Card numbers: 6, 82,25, 1275. */
  stat: { kind: 'display', weight: 'semibold', size: 28, sizeTablet: 34, lineRatio: 1.18, tracking: 0, trackingTablet: 0, tabular: true, maxScale: 1.3 },
  /** Inline numbers: 0/5, 12/50 dk, D Y B, XP, ranks, the clock in the timer ear. */
  numeric: { kind: 'sans', weight: 'semibold', size: 16, sizeTablet: 18, lineRatio: 1.35, tracking: 0, trackingTablet: 0, tabular: true, maxScale: 1.6 },
  /** Section headings on the paper, sheet titles. */
  heading: { kind: 'sans', weight: 'semibold', size: fontSize.lg, sizeTablet: fontSizeTablet.lg, lineRatio: 1.32, tracking: -0.2, trackingTablet: -0.2, tabular: false, maxScale: 1.6 },
  /** The default, in `text`. */
  body: { kind: 'sans', weight: 'regular', size: fontSize.md, sizeTablet: fontSizeTablet.md, lineRatio: 1.5, tracking: 0, trackingTablet: 0, tabular: false, maxScale: 1.6 },
  /** Lumi's notes and hints. */
  note: { kind: 'sans', weight: 'medium', size: 15, sizeTablet: 17, lineRatio: 1.45, tracking: 0, trackingTablet: 0, tabular: false, maxScale: 1.6 },
  /** Controls, row titles. */
  label: { kind: 'sans', weight: 'medium', size: fontSize.sm, sizeTablet: fontSizeTablet.sm, lineRatio: 1.36, tracking: 0, trackingTablet: 0, tabular: false, maxScale: 1.6 },
  /** Secondary lines (in `textMuted`). */
  caption: { kind: 'sans', weight: 'regular', size: fontSize.xs, sizeTablet: fontSizeTablet.xs, lineRatio: 1.38, tracking: 0, trackingTablet: 0, tabular: false, maxScale: 1.6 },
  /** Tab labels and badge text only. */
  micro: { kind: 'sans', weight: 'semibold', size: fontSize.xxs, sizeTablet: fontSizeTablet.xxs, lineRatio: 1.27, tracking: 0.1, trackingTablet: 0.1, tabular: false, maxScale: 1.6 },
  figureDrop: 0.12,
};

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
  /** The picked bubble breathing while the answer is graded. */
  sealScale: 1.06,
  /** How long after the dock leaves its pick rect still launches a burst (ms). */
  burstRectTtl: 5000,
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
  /** `rmFade`: the Reduce Motion cross-fade (spec 0.7 / 5.6). */
  duration: { instant: 90, fast: 140, base: 220, slow: 360, page: 420, celebrate: 1400, rmFade: 120 },
  easing,
  springs,
  /** Press feedback per PressableScale kind: scale, the button's sink (pt), the card fade and the reduced-motion opacity. */
  press,
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
  highlight: { draw: 420, retract: 220, pressGrow: 140, strike: 260 },
  /** "Netleşme": two ghost copies converge on the real text. */
  focusPull: { ms: 420, ghostOffset: 4, ghostOpacity: 0.35, startScale: 1.06, startOpacity: 0.5 },
  odometer: { digitStagger: 30 },
  /** `rmFlash`: the Reduce Motion level-wrap flash (spec 5.6). */
  progress: { fill: 720, shine: 600, rmFlash: 160 },
  /** `badgeFrom`: the badge pops from this scale. */
  tabs: { fade: 140, compact: 220, labelDrop: 6, wiggleDeg: 4, wiggleMs: 180, longPress: 450, keyboard: 200, compactVelocity: 900, badgeFrom: 0.6 },
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
    /** Perches register before Lumi hops after a route change. */
    routeSettleMs: 220,
    /** LiveMascot swaps back to Still this long after landing at the nest. */
    liveLingerMs: 2000,
    /** Eyes back to open after scrolling stops. */
    gazeResetMs: 600,
    /** Long-press Lumi: snooze.ask. */
    longPressMs: 400,
    /** How often the unsolicited-line scheduler looks. */
    tickMs: 500,
    /** The nest's breathing halo round the tip light. */
    haloBreathMs: 2400,
    /** Dragged away: Lumi slides off. */
    slideOutMs: 220,
    /** A scroll this far closes the note (pt). */
    scrollDismiss: 24,
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
    /**
     * The loops' shapes: amplitudes (grid units, degrees, scale) and timings (ms) per body and
     * arm motion, fidget and effect.
     */
    loops: {
      hop: { height: -10, pause: 520 },
      jump: { height: -22, pause: 220 },
      hopLand: 260,
      stretch: { sy: 1.06, sx: 0.96 },
      squash: { sy: 0.9, sx: 1.08, ms: 110, settle: 150 },
      droop: { sy: 0.985, syMs: 2200, rot: 2, rotMs: 2400 },
      sway: { rot: 4, sy: 1.02, ms: 900 },
      nod: { rot: 2.5, y: 1.5, ms: 480 },
      wobble: { rot: 6, ms: 700 },
      bob: { y: -5, sy: 1.02, ms: 650 },
      breathe: { sy: 1.045, sx: 0.975, y: -3, ms: 1300 },
      wave: { from: 14, to: -16, ms: 280 },
      wiggle: { from: -10, to: 12, ms: 220 },
      shake: { deg: 14, ms: 140 },
      gesture: { deg: 20, ms: 760 },
      tap: { deg: -6, ms: 160, rest: 700 },
      scribble: { deg: 6, ms: 110 },
      sip: { delay: 1800, deg: 14, ms: 420, hold: 700 },
      pop: { deg: 16, ms: 90, rest: 1100 },
      blink: { closed: 0.1, close: 70, open: 100, every: 3400 },
      blink2: { close: 60, open: 80, reopen: 90 },
      tipSway: { deg: 5, ms: 1500 },
      glow: { rest: 1.12, restMs: 1500, pulse: 1.35, pulseMs: 420, dimMs: 500 },
      talk: { from: 0.35, ms: 130 },
      fxMs: 1500,
      popSpring: { damping: 7, stiffness: 160 },
      enterSpring: { damping: 9, stiffness: 150, mass: 0.7 },
      bump: { up: 1.08, upMs: 110, down: 0.95, downMs: 120, spring: { damping: 8, stiffness: 200 } },
      idleArm: { deg: 5, ms: 1300 },
      fidgetSpring: { damping: 12, stiffness: 160 },
      look: { x: 5, back: -3, y: -1, hold: 700, settle: 500, yHold: 1200 },
      lookUp: { x: 4, y: -4, hold: 900 },
      fidgetHop: { y: -14, up: 200, down: 190, stretch: 1.05, squash: 0.9, squashMs: 90 },
      flick: { deg: -16, ms: 120, spring: { damping: 5, stiffness: 180 } },
      tilt: { deg: 7, hold: 900 },
      shiver: { deg: 5, ms: [90, 120, 120] },
      hello: { up: -122, low: -104, high: -136, ms: 170, times: 3, settle: 150, face: -2, faceHold: 1300 },
      /** How far the eyes shift toward `lookAt` (grid units). */
      lookAtShift: 4,
      /** Effect loops: travel (grid units), turn (degrees), scale and opacity ranges. */
      fx: {
        tear: { fall: 22 },
        sweat: { fall: 8, fade: 0.7 },
        zzz: { x: 8, rise: 14, from: 0.8, grow: 0.35 },
        hearts: { rise: 18, from: 0.7, grow: 0.4 },
        sparkles: { dim: 0.4, from: 0.5, grow: 0.7, turn: 90 },
        question: { bob: 3, turn: 8 },
        exclaim: { pulse: 0.06, bob: 1.5 },
        confetti: { fall: 26, fade: 0.8, turn: 10 },
        flame: { from: 0.9, flicker: 0.12, rate: 6, sway: 0.05 },
        steam: { opacity: 0.9, rise: 8, drift: 1.5 },
      },
    },
  },
  /**
   * A right answer's local burst: pieces (highlighter strokes w × h), how far they fly (pt)
   * and for how long (ms); the XP chip's rise and sideways sway (pt), its width, and where
   * the row's letter disc sits from the row's left edge.
   */
  inlineBurst: { particles: 12, distance: 64, ms: 760, rise: 44, sway: 14, chipWidth: 96, letterInset: 24, stroke: { w: 10, h: 3 } },
  /** Timer focus mode: how fast and how far the rest of the screen dims. */
  timerFocus: { dimMs: 600, dim: 0.4 },
  /** Screen scroll effects (design spec 5.2): the large title, the compact bar, the stack title, the band; `rmFade` is its Reduce Motion switch. */
  scroll: { titleRate: 0.5, titleFadeEnd: 64, barFrom: 48, barTo: 72, rmSwitch: 56, stackTitleFrom: 40, stackTitleTo: 72, bandRate: 0.35, bandFadeEnd: 160, rmFade: 120 },
  /** How long a revealed block that grows is kept in view (ms); how far up (pt) the page may drift before it counts as the student's own scroll. */
  reveal: { followMs: 1500, slop: 8 },
  /** The one-time foil sheen over a newly seen badge (spec 7.5). */
  badge: { foilMs: 700 },
  /** RewardBurst: the badge stamp coming down, ms from its rigid tap to the success haptic, how far the rays turn over the moment. */
  reward: { stamp: { fromScale: 1.3, fromDeg: -8 }, successAfter: 120, raySpinDeg: 24 },
  /** Podium steps rise 3, 2, 1 this far apart (ms); avatars drop from this height (pt). */
  podium: { stagger: 80, drop: 28 },
  /** The live streak flame's breath: lift in pt, scaleY gain, sway each way (deg). */
  flame: { rise: 1.5, stretch: 0.08, swayDeg: 2 },
  /** The timer ring: the fosfor head's breathing halo, and the arc's glide across each one-second tick. */
  timer: { headGlow: { ms: 1300, low: 0.35, high: 0.7, scale: 2.2 }, tickMs: 1000 },
} as const;

export type EasingName = keyof typeof motion.easing;
export type SpringName = keyof typeof motion.springs;

export const opacity = {
  /** Disabled controls. */
  disabled: 0.5,
  /** Loading placeholders breathe between these; the shimmer band's peak over surfaceAlt; Reduce Motion rests at `still`. */
  skeleton: { low: 0.45, high: 1, shimmer: 0.7, still: 0.5 },
  /** The graph-paper band's lines, per scheme. */
  /** Graph-paper band; 0 = off (the warm Anthropic paper is plain). */
  kareli: { light: 0, dark: 0 },
  /** FocusPull ghosts and other echoes. */
  ghost: 0.35,
  /** Analysis content while it refetches. */
  analysisRefetch: 0.6,
  /** The camera's framing guide. */
  cameraGuide: 0.7,
  /** The fosfor band that sweeps a photo while it is read: its soft peak. */
  scanBand: 0.5,
  /** Secondary text on the dark camera screens. */
  cameraCaption: 0.7,
  /** The foil sheen's soft band, never a flash: on a newly seen badge seal, and over RewardBurst's hero. */
  foil: { seal: 0.55, reward: 0.6 },
  /** The ghost button's press swipe under Reduce Motion (spec 5.1). */
  ghostSwipeRm: 0.6,
  /** Each light-mode Highlight ink pass (spec 3 Highlight). */
  highlightPass: 0.85,
  /** The paper fade over a clipped photo's bottom edge. */
  imageFade: 0.96,
  /** Soft tier-colored rays behind RewardBurst's hero. */
  rewardRay: 0.28,
  /** InlineBurst strokes: highlighter ink is translucent, never a solid flash. */
  burstStroke: 0.9,
  /** The nearest flight-trail dot; later ones fade by k/5. */
  trailDot: 0.8,
  /** The breathing halo round Lumi's tip light. */
  companionHalo: { low: 0.35, high: 1 },
  /**
   * A podium step's tier tint over the sheet: the winner's gold reads first; second and third
   * stay quieter but keep a body on the light paper, together with their hairline edge.
   */
  podiumTint: { first: { light: 0.3, dark: 0.36 }, other: { light: 0.2, dark: 0.18 } },
  /** The fosfor sweep under a right answer row; soft, and dark text stays readable. */
  rowSweep: { light: 0.6, dark: 0.22 },
  /** The soft white level-wrap sweep on a ProgressBar (spec 2.0 rule 4). */
  shine: 0.25,
  /** The paper fade behind the strip. */
  stripFade: { midAt: 0.45, mid: 0.75, end: 0.92 },
  /** The timer arc while paused. */
  timerPaused: 0.55,
  /** The breathing glow behind a live streak flame (and the scale it grows from). */
  flameGlow: { low: 0.12, high: 0.3, scaleFrom: 0.8 },
  /** The compact header bar's paper. */
  headerBar: 0.96,
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
/** Touch height per window: the HIG 44 on a phone, 48 on a tablet (read at arm's length). */
const touch = { compact: 44, tablet: 48 } as const;
const borderWidth = 1;
const selectedBorder = 1.5;
const iconSize = { sm: 18, md: 22, lg: 28, xl: 40 } as const;
const iconStroke = 2.0;

export const layout = {
  /** Interaction basics: the minimum touch target (Apple HIG), hairlines, icon sizes. */
  /** `iconStrokeBold`: Icon weight 'bold' (spec 3). */
  system: { minTouch, touch, borderWidth, selectedBorder, hitSlop: 8, iconSize, iconStroke, iconStrokeBold: 2.4 },
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
  sheetPadding: { compact: 16, tablet: 24 },
  /**
   * Screen anatomy: the gap between a screen's blocks, the gap from the title block to the
   * content, and the space kept under the last block on stack screens so Lumi's nest (bottom
   * right) never covers it.
   */
  screen: { gap: { compact: 16, tablet: 24 }, titleGap: { compact: 4, tablet: 6 }, afterTitle: { compact: 4, tablet: 8 }, nestClear: 16 },
  /**
   * A group of rows in one sheet (Card `group`, ListRow): a row's least height, its vertical
   * padding, the hairline divider's left inset past a leading element, and a leading slot.
   */
  group: { rowMinHeight: { compact: 52, tablet: 60 }, rowPadY: { compact: 10, tablet: 12 }, leading: { compact: 32, tablet: 36 } },
  /** Button label sizes (sm and md share one) per window. */
  button: { label: { compact: { md: 16, lg: 17 }, tablet: { md: 17, lg: 18 } } },
  /** The segmented control: on a tablet it hugs its labels up to this width; each segment's least width. */
  segmented: { maxWidth: 440, minSegment: { compact: 72, tablet: 104 } },
  /** Karne row (StatTile): a cell's side padding and the least width a cell keeps before the row folds. */
  karne: { cellPadX: { compact: 12, tablet: 14 }, cellPadY: { compact: 8, tablet: 12 }, minCell: { compact: 120, tablet: 128 } },
  /** The floating optik strip (navigation), its badge, the timer ear and the paper fade above it. */
  tabBar: {
    height: { compact: 66, tablet: 80 },
    compactHeight: 54,
    maxWidth: 560,
    /** Narrowest centered tablet strip; a narrower window (split view) sets it left with Lumi's nest beside it. */
    centeredMinWidth: 440,
    sideInset: { compact: 12, tablet: 32 },
    bottomGap: 12,
    insetTrim: 8,
    bubble: { compact: { w: 52, h: 32 }, tablet: { w: 64, h: 40 } },
    /** The tab icon inside the bubble. */
    icon: { compact: 22, tablet: 24 },
    /** Least tab width; the strip clamps it to its own width / tab count so all five always fit. */
    itemMinWidth: { compact: 48, tablet: 72 },
    labelGap: { compact: 4, tablet: 6 },
    padY: 8,
    nestGap: { compact: 8, tablet: 12 },
    badge: { compact: 20, tablet: 24 },
    badgeRing: 2,
    /** The timer ear; `ringStroke` is the ear / TimerPill ring's stroke, and its head dot's radius. */
    ear: { height: 44, minWidth: 92, ring: 28, gap: 6, ringStroke: 3 },
    fadeAbove: 56,
    reserveExtra: 16,
    /** Badge disc: left = bubble width - x, top = -y. */
    badgeOffset: { x: 10, y: 6 },
    /** Scrolling down past this offset compacts the phone strip. */
    compactAfter: 24,
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
    /** Drag-away thresholds. */
    drag: { slop: 6, awayVy: 0.8, awayVx: 0.8, edge: 32 },
    /** Landing squash (a spring brings it back to 1). */
    land: { y: 0.82, x: 1.1 },
    /** Glide start and end, × size before the target. */
    glideAt: { x: 0.3, y: 0.75 },
    /** The note's corner tucks under Lumi's feet, × size. */
    noteOverlap: 0.15,
    /** Room a note needs below Lumi before it goes above. */
    noteRoom: 160,
    /** A landing farther than this flies instead of hopping. */
    hopFar: 120,
    /** Route hops and returns fly a flatter arc. */
    routeHopLift: 0.5,
    /** The breathing tip-light halo's radius, × size, and the scale it breathes to. */
    haloDot: 0.2,
    haloBreathScale: 1.25,
    /** Progress between flight-trail dots; a dot's halo radius as a multiple of its core. */
    trailStep: 0.04,
    trailHalo: 2,
  },
  /** Optik bubbles (ellipses 1.6:1) by size, their printed outline and the scribble fill. */
  bubble: {
    dot: { w: 30, h: 20 },
    row: { w: 32, h: 22 },
    letter: { w: 52, h: 36 },
    outline: 1.6,
    scribbleStroke: 3.2,
    scribbleMinWidth: 28,
    /** Gap from a chosen color bubble to its ring. */
    selectRing: 4,
    /** Space between a bubble and the ring that marks "now". */
    ringGap: 2,
  },
  /** The highlighter swipe behind a line of text, and the graphite strike through it. */
  highlight: {
    heightRatio: 0.62,
    leadIn: 4,
    tail: 6,
    skewDeg: -8,
    rotateDeg: -1,
    passes: 2,
    radii: [3, 6, 4, 7],
    strikeWidth: 2,
    /** How far the second ink pass sits from the first (pt). */
    passShift: 1.5,
    /** Extra width for the ink copy: web layout reports whole pixels, so 35.4 arrives as 35. */
    copySlack: { web: 1, native: 0 },
  },
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
    /** Space between the track's inner edge and the ticks. */
    tickGap: 6,
    tickWidth: { major: 2, minor: 1.5 },
    /** A major tick every 5 minutes. */
    majorEvery: 5,
    /** One tick per planned minute, within these. */
    ticks: { min: 5, max: 60 },
    /** The clock never grows past this share of the ring. */
    numeralShare: 0.32,
  },
  podium: {
    step: { compact: [96, 72, 56], tablet: [120, 92, 72] },
    avatar: { first: 64, other: 52 },
    /** The winner's step is wider than the other two. */
    firstFlex: 1.3,
    /** A full iPad has the height to spare: the podium, the screen's primary, takes it, also beside the list in landscape. */
    tall: { step: [176, 136, 104], avatar: { first: 80, other: 64 } },
  },
  /** Question photo thumbnails; `accentEdge` is the subject-ink edge on a recent thumbnail. */
  thumb: { compact: 56, card: { w: 88, h: 66 }, recent: 72, accentEdge: 4 },
  /**
   * The floating answer dock: its row height and its widest; `inlineMin` is the least inner width
   * for the letters and the actions on one row (a wider measured row raises it).
   */
  dock: { height: 64, maxWidth: 560, inlineMin: 620 },
  question: { imageCap: { compact: 360, tablet: 420, split: 540 }, chatImageCap: 220 },
  /** Spaced-repetition intervals in days (mirrors the server). */
  ladder: {
    rungs: [1, 3, 7, 14, 30],
    /** The narrowest a rung column gets before the ladder scrolls; "30 gün" at 15 pt needs 60. */
    rungMin: { compact: 50, tablet: 60 },
    /** The optikSoft rail between the rung bubbles. */
    rail: 4,
  },
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
  /** Width of the left pane in split screens, as a fraction. */
  splitLeft: 0.46,
  /** Left pane of the question screen: the photo is what the student reads. */
  splitQuestion: 0.56,
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
    /** `wide`: landscape, where the trend fills the sheet beside the subjects. */
    trendHeight: { compact: 180, tablet: 240, wide: 380 },
    sparkHeight: 44,
    axisWidth: 34,
    endLabelWidth: 44,
    /** The week's bars: bar width as a share of its slot, and the gap to the day label. */
    weekBar: { barShare: 0.5, labelGap: 6 },
    /** The week's bar chart, labels included; an empty day still shows a `minBar` sliver. */
    weekHeight: { compact: 148, tablet: 196 },
    minBar: 2,
    /** TopicLossBars' value column: fits "88,88 net", so every track ends at the same x. */
    lossValueWidth: { compact: 72, tablet: 84 },
    /** The trend under a hero net (ExamSummary). */
    summaryHeight: { compact: 96, tablet: 136 },
    /** A growing sparkline stops at this × sparkHeight; past that the slack stays under it. */
    sparkGrowMax: 3,
  },
  /** Viewfinder (spec 3): 3 pt L-corners, 22 pt arms; `cameraArm` on the full-screen camera guide. */
  viewfinder: { stroke: 3, arm: 22, inset: 12, cameraArm: 36 },
  /** The camera guide is a 3:4 page, width over height. */
  cameraGuideRatio: 3 / 4,
  /** The fosfor band that sweeps the photo while it is read (height). */
  scanBand: 56,
  /** The first crop box sits this share inside the photo. */
  cropStartInset: 0.04,
  /** Pinch zoom in the full-screen photo (iOS). */
  photoViewer: { maxZoom: 4 },
  /** Sign-in (spec 7.10): the form's and the column's widest, Lumi's size, the graph-paper patch. */
  login: { form: 420, column: 480, hero: { wide: 180, compact: 120 }, patch: 460 },
  /** The ring's stroke on the logo's 100-unit grid (same as Logo.tsx). */
  logo: { stroke: 14 },
  /** A leaderboard row's avatar, read at arm's length on an iPad. */
  leaderboard: { rowAvatar: { compact: 40, tablet: 48 } },
  /** The identity sheet's avatar on Profile (spec 7.5). */
  avatarProfile: { compact: 56, tablet: 72 },
  /** An avatar's initial as a share of the disc (font size, line height). */
  avatarInitial: { size: 0.45, line: 0.6 },
  /** An auto-width lg primary never gets narrower. */
  cta: { minWidth: 240 },
  /** The "TYT" / "AYT" label column before a chip row. */
  chipRowLabel: 40,
  /** The subject-ink left edge of a card (spec 3 Card). */
  sheet: { accentEdge: 4 },
  /** The timer pill sits below the nav bar, so it never covers headerRight. */
  timerPill: { top: 52 },
  /** The progress bar's level-wrap sweep: its width as a share of the bar. */
  progress: { shineShare: 0.4 },
  /** The speech bubble's tail: a square of bubble paper turned into a diamond. */
  bubbleTailTurn: '45deg',
  /**
   * The chat (spec 7.6): the live Lumi in the assistant's header; the share of the hero patch, from
   * its center, where the graph paper is still unfaded; the intro Lumi's tallest share of the window
   * (so a short landscape iPad keeps the starters above the composer); landscape question chat: the
   * photo's share of the 12-column grid; the composer well's single-line height (56 matches
   * TextField on a tablet) and the most lines it grows to; starter sheets as tall as a two-line
   * question on a tall tablet window, a window from `promptTallMin` tall stacks each starter's icon
   * over its question (a shorter one lays them in a row), a row starter's least height; Lumi's Lora
   * words on a tablet (Lora's small x-height reads a size under the student's 17 pt Poppins; a
   * phone keeps body); the fade over the clipped end of the fact scroller; the student's bubble's
   * widest, as a share of the thread.
   */
  chat: {
    headerMascot: 32,
    patchClear: 0.5,
    heroShare: 0.18,
    photoColumns: 5,
    composerMin: { compact: 48, tablet: 56 },
    composerLines: 4,
    promptLines: 2,
    promptTallMin: 900,
    promptRow: 72,
    replySizeTablet: 18,
    edgeFade: 48,
    userBubbleMax: '85%',
  },
  /** Exam form: from this width the subject table has one-line rows; the Girdim column. */
  examForm: { tableFrom: 560, switchCol: 56 },
  /** An exam row: inline from this width; the net column fits "102,75 /120" (one fixed width, so every row's strip track has the same length). */
  examRow: { inlineFrom: 680, netCol: { compact: 88, tablet: 96 }, deltaCol: 76, stripShare: '30%' },
  /**
   * The sample question drawn in Solve's viewfinder: stem lines, and in the upright frame one line
   * per choice; the phone's wide frame gives the slip the frame's inner width, up to
   * compactMaxWidth, so the A–E row fits.
   */
  solveSketch: { compactMaxWidth: 240, lines: ['100%', '88%', '56%'], choices: ['58%', '44%', '64%', '50%', '38%'] },
  /**
   * Solve's capture sheet on a tablet: the upright viewfinder's share of its inner width (portrait,
   * and at most this much in landscape, where its height sets it); a landscape sheet puts the frame
   * on top once that makes it `onTopGain` times wider.
   */
  solveCapture: { frameShare: { regular: 0.44, wide: 0.5 }, onTopGain: 1.15 },
  /**
   * Badge seals: the foil sheen's band (share of the seal) and slant; the locked seal's progress arc
   * on the 100-unit grid (6 so it still reads at a 52–60 pt seal); the glyph as a share of the seal;
   * a profile seal, arc included; the measured width from which the seals sit three across
   * (narrower, "30 günlük seri" would break onto two lines, so they sit two across).
   */
  badge: { foil: { band: 0.34, tiltDeg: 20 }, arc: { radius: 57, stroke: 6, inset: 12 }, glyphShare: 0.38, seal: { compact: 52, tablet: 60 }, threeUp: 620 },
  /** RewardBurst: the sheen band's width as a share of the hero and its slant; the hero as a multiple of `resultBadge`. */
  reward: { foilBand: 0.42, foilDeg: 20, heroScale: 1.4 },
  /**
   * A wardrobe swatch column (the bubble, its caption and a lock line that keeps to one or two
   * clean lines); past `max` the swatches stay grouped beside the preview instead of spreading.
   */
  wardrobe: { itemWidth: { min: 96, max: 128 } },
  /**
   * Loading bones: a paragraph's line widths in turn (the last line of a block is `last`), a list
   * row's title and detail line, a page heading, the exam and subject badges above a question (pt),
   * the answer rows under a question photo, the shimmer band's width (pt).
   */
  bone: { text: ['92%', '100%', '84%', '96%', '70%'], last: '55%', title: '60%', detail: '85%', heading: '70%', badges: [48, 72], choices: 5, shimmerBand: 120 },
  /**
   * Home's goal rows (spec 7.1): the goal and its figure in their own columns, or the goal over its
   * figure; the content width from which the rows end in an action pill (else a chevron), and from
   * which goal and figure get columns; the figure columns are least widths, widened together to the
   * widest figure; a stretched row grows to at most maxShare × group.rowMinHeight.tablet.
   */
  goalRow: { label: 84, figure: 136, action: 120, stacked: { compact: 112, tablet: 128 }, pillMin: 628, columnsMin: 728, maxShare: 1.6 },
  /** The graphite check across the goals: its stroke and points (share of the box). */
  goalCheck: { stroke: 3, points: [[0.06, 0.55], [0.2, 0.9], [0.94, 0.08]] },
  /** Focus mode's vignette: where the edge shade starts, the gradient's reach, and the band over which its top edge fades in from nothing. */
  focusVignette: { clear: 0.55, radius: '75%', topFade: 96 },
  /** The streak flame's disc by streak tier (spec 7.1 Seri), and its glow as a share of the disc. */
  streakFlame: { tiers: [1, 7, 30], size: [44, 52, 60], glowShare: 0.78 },
} as const;

/** Home's dashboard behavior. */
export const home = {
  /** How far an iPad dashboard may stretch past its own height toward the strip. */
  stretchMax: 96,
  /** The window width from which the first name joins the greeting in the title. */
  titleNameMin: 760,
  /** Goal bubbles: Tekrar shows one per due question up to `reviewCap`; Odak is focusSteps × 10 min. */
  goalBubbles: { reviewCap: 10, focusSteps: 5 },
  /** Recent questions on Home. */
  recentCount: 3,
  /** Exams shown in Son deneme's sparkline. */
  lastExamPoints: 8,
  /** The content width from which Seri and Bu hafta sit side by side; the week's seven bubbles need it. */
  progressGridMin: 680,
  /** The width left of the thumbnails' caption from which "Örnek soruyu çöz" sits beside the heading. */
  solveHeadInline: 400,
} as const;

export const solve = {
  /** Recent questions on Solve: a phone shows `compact`; landscape fits as many rows as reach the strip, within wideMin..wideMax. */
  recentCount: { compact: 4, wideMin: 3, wideMax: 8 },
} as const;

export const question = {
  /** This many reviews with one result fold into one Geçmiş row. */
  historyFoldMin: 3,
} as const;

export const companion = {
  /** Rough minutes per due review, for "hepsi yaklaşık N dakika". */
  minutesPerReview: 1.2,
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
  fonts: typeof fonts;
  motion: typeof motion;
  opacity: typeof opacity;
  layout: typeof layout;
  home: typeof home;
  solve: typeof solve;
  question: typeof question;
  companion: typeof companion;
}

const shared = { breakpoints, spacing, radius, fontSize, fontSizeTablet, typography, fonts, motion, opacity, layout, home, solve, question, companion };

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
