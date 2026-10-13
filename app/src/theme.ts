// Single source of truth for every color, font, size, spacing, radius and motion value.
// Components read tokens through `useTheme()` and never hardcode values.
// Design changes: edit this file first, then the component.
//
// Aesthetic: warm and calm, after Anthropic's Claude — ivory and charcoal surfaces, clay
// accent, olive/kraft/slate-blue supporting hues, a serif for titles and for Claude's
// own words (solutions, hints, chat), a geometric sans for the interface.
// Contrast was measured, not eyeballed: body and label text ≥ 4.5:1, chart marks ≥ 3:1.

import { useColorScheme, type TextStyle } from 'react-native';
import type { Subject } from './data/topics';

export type ColorScheme = 'light' | 'dark';

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textOnAccent: string;
  transparent: string;

  /** Filled buttons and selected states (white text on it is ≥ 4.5:1). */
  primary: string;
  /** Clay for text and icons on light surfaces (links, secondary labels). */
  primaryText: string;
  primarySoft: string;
  /** Brand clay for decoration only (flame, spark, confetti); not for text. */
  accent: string;
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

  /** XP bar fill (decoration); `xpText` is the readable tone on `xpTrack`. */
  xp: string;
  xpText: string;
  xpTrack: string;
  hintBackground: string;
  streak: string;
  streakSoft: string;

  tabBar: string;
  tabActive: string;
  tabInactive: string;

  // Camera / crop screens are always dark, regardless of system theme.
  cameraBackground: string;
  cameraForeground: string;
  cameraScrim: string;
  cropFrame: string;

  /** Celebration particles (correct answer, level up). */
  confetti: string[];
  /** Veil behind the result badge so it reads over busy content. */
  celebrationScrim: string;

  /** Badge medallions by tier, plus the muted look of a badge not earned yet. */
  badge: { bronze: string; silver: string; gold: string; ink: string; locked: string; lockedInk: string };

  /** Lumi, the assistant character (components/mascot): its own flat palette. */
  mascot: MascotColors;

  /**
   * Depth, as CSS box-shadow strings (RN New Architecture and the web both read them).
   * Light: soft warm shadows, like thick paper on a desk. Dark: a faint top-edge highlight
   * instead (raised glass), with deep shadows only for floating things.
   */
  shadow: { card: string; raised: string; floating: string; accent: string; none: string };
  /** Exam pills: TYT clay, AYT slate-blue, so the exam is clear at a glance. */
  exam: Record<'TYT' | 'AYT', { fg: string; bg: string }>;
  /** A control that can't be used yet: quiet paper-grey with readable text. */
  disabledBg: string;
  disabledFg: string;

  /** Avatar circle fills (initial in `textOnAccent`, all ≥ 4.5:1 under white). */
  avatar: Record<'clay' | 'kraft' | 'olive' | 'sky' | 'plum' | 'sand' | 'slate' | 'rose', string>;

  subject: Record<Subject, string>;

  /** Chart roles. The line/bar hue passes the dataviz checks (band, chroma, ≥3:1) on the surface. */
  chart: {
    line: string;
    /** Area wash under a line: the line hue at ~10%. */
    area: string;
    bar: string;
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
  /** The light on its antenna, its halo and highlight. */
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
  shadow: string;
}

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
};

const light: ColorTokens = {
  background: '#F4F2EC',
  surface: '#FFFEFB',
  surfaceAlt: '#EEEBE3',
  border: '#E4E1D8',
  text: '#141413',
  textMuted: '#6B6962',
  textOnAccent: '#FFFFFF',
  transparent: 'transparent',

  primary: '#B5573A',
  primaryText: '#A84F33',
  primarySoft: '#F6E8E1',
  accent: '#D97757',
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
  hintBackground: '#F7EFE2',
  streak: '#D97757',
  streakSoft: '#F6E8E1',

  tabBar: '#F5F4EE',
  tabActive: '#A84F33',
  tabInactive: '#6B6962',

  cameraBackground: '#000000',
  cameraForeground: '#FFFFFF',
  cameraScrim: 'rgba(0, 0, 0, 0.55)',
  cropFrame: '#FFFFFF',

  confetti: ['#D97757', '#C9954C', '#788C5D', '#6A9BCC', '#E4B9A3'],
  celebrationScrim: 'rgba(245, 244, 238, 0.72)',
  badge: { bronze: '#B87A45', silver: '#7D8794', gold: '#B8862F', ink: '#FFFFFF', locked: '#E4E1D8', lockedInk: '#8F8C84' },
  mascot: { ...MASCOT_BASE, shadow: 'rgba(0, 0, 0, 0.10)' },
  shadow: {
    card: '0px 1px 2px rgba(48, 36, 24, 0.06), 0px 4px 14px rgba(48, 36, 24, 0.05)',
    raised: '0px 2px 6px rgba(48, 36, 24, 0.07), 0px 14px 32px -10px rgba(48, 36, 24, 0.18)',
    floating: '0px 10px 24px rgba(48, 36, 24, 0.10), 0px 30px 60px -20px rgba(48, 36, 24, 0.28)',
    accent: '0px 8px 18px -8px rgba(181, 87, 58, 0.55)',
    none: '0px 0px 0px rgba(0, 0, 0, 0)',
  },
  exam: { TYT: { fg: '#A84F33', bg: '#F6E8E1' }, AYT: { fg: '#3F6D9C', bg: '#E5EDF6' } },
  disabledBg: '#ECE9E1',
  disabledFg: '#7A776F',
  avatar: {
    clay: '#B5573A',
    kraft: '#8F6328',
    olive: '#566F3D',
    sky: '#3F6D9C',
    plum: '#8A4F75',
    sand: '#7A6A4F',
    slate: '#56606B',
    rose: '#A8484F',
  },

  // Every subject has its own hue (TYT and AYT maths, Fen and Biyoloji no longer share one).
  subject: {
    'Türkçe': '#D97757',
    'Sosyal': '#C9954C',
    'Temel Matematik': '#6A9BCC',
    'Fen': '#788C5D',
    'Matematik': '#5468B0',
    'Fizik': '#2F8A87',
    'Kimya': '#B0739B',
    'Biyoloji': '#5E9442',
  },

  chart: {
    line: '#C96442',
    area: 'rgba(201, 100, 66, 0.10)',
    bar: '#C96442',
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
  transparent: 'transparent',

  primary: '#B5573A',
  primaryText: '#E08B6D',
  primarySoft: '#3B2A22',
  accent: '#D97757',
  success: '#A3B886',
  successSoft: '#2B3224',
  danger: '#E48A7D',
  dangerSoft: '#3D2622',
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
  hintBackground: '#322C24',
  streak: '#E08B6D',
  streakSoft: '#3B2A22',

  tabBar: '#1F1E1D',
  tabActive: '#E08B6D',
  tabInactive: '#908D84',

  cameraBackground: '#000000',
  cameraForeground: '#FFFFFF',
  cameraScrim: 'rgba(0, 0, 0, 0.55)',
  cropFrame: '#FFFFFF',

  confetti: ['#E08B6D', '#D4A27F', '#A3B886', '#8DB4DE', '#F0C6B3'],
  celebrationScrim: 'rgba(31, 30, 29, 0.72)',
  badge: { bronze: '#B87A45', silver: '#7D8794', gold: '#B8862F', ink: '#FFFFFF', locked: '#3B3A36', lockedInk: '#85827A' },
  mascot: { ...MASCOT_BASE, shadow: 'rgba(0, 0, 0, 0.45)' },
  shadow: {
    card: 'inset 0px 1px 0px rgba(255, 248, 240, 0.04)',
    raised: 'inset 0px 1px 0px rgba(255, 248, 240, 0.06), 0px 16px 40px -12px rgba(0, 0, 0, 0.55)',
    floating: 'inset 0px 1px 0px rgba(255, 248, 240, 0.07), 0px 24px 60px -16px rgba(0, 0, 0, 0.70)',
    accent: '0px 0px 0px rgba(0, 0, 0, 0)',
    none: '0px 0px 0px rgba(0, 0, 0, 0)',
  },
  exam: { TYT: { fg: '#E08B6D', bg: '#3B2A22' }, AYT: { fg: '#8DB4DE', bg: '#22303D' } },
  disabledBg: '#33312E',
  disabledFg: '#9D998F',
  avatar: {
    clay: '#B5573A',
    kraft: '#8F6328',
    olive: '#566F3D',
    sky: '#3F6D9C',
    plum: '#8A4F75',
    sand: '#7A6A4F',
    slate: '#56606B',
    rose: '#A8484F',
  },

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

  chart: {
    line: '#D4714F',
    area: 'rgba(212, 113, 79, 0.12)',
    bar: '#D4714F',
    grid: '#3B3A36',
    axisText: '#A8A59B',
    crosshair: '#A8A59B',
    markerRing: '#2A2927',
  },
};

/**
 * Font families, one per weight (iOS custom fonts don't synthesize weights). Loaded in
 * the root layout from @expo-google-fonts. Poppins and Lora are the open fonts of
 * Anthropic's brand guidelines.
 */
export const fonts = {
  sans: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semibold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
  },
  serif: {
    regular: 'Lora_400Regular',
    medium: 'Lora_500Medium',
    semibold: 'Lora_600SemiBold',
    bold: 'Lora_700Bold',
  },
} as const;

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

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 21,
  xxl: 30,
  display: 44,
  /** Hero numbers: the timer, the streak count. */
  numeral: 64,
} as const;

/** Line height as a multiple of the font size, per text style (tighter for big serif titles). */
export const lineRatio = {
  display: 1.18,
  title: 1.2,
  heading: 1.4,
  body: 1.47,
  label: 1.38,
  caption: 1.34,
  eyebrow: 1.34,
} as const;

/** Letter spacing for the serif display sizes (slightly tight, like editorial titles). */
export const letterSpacing = {
  display: -0.8,
  title: -0.4,
  normal: 0,
  /** Small uppercase labels above a title (date, section). */
  eyebrow: 1.2,
} as const;

/** Durations (ms) and springs for every animation. Reduced-motion users get fades only. */
export const motion = {
  duration: { fast: 160, base: 260, slow: 420, celebrate: 1400 },
  /** Delay between items appearing one after another. */
  stagger: 45,
  /** How far content travels when it fades in (pt). */
  rise: 10,
  spring: { damping: 16, stiffness: 190, mass: 0.9 },
  springBouncy: { damping: 11, stiffness: 220, mass: 0.8 },
  /** Scale of a pressed button or card, and how much it fades. */
  pressScale: 0.97,
  pressFade: 0.12,
  /** Sideways shake of the "wrong" badge: distance (pt) and step durations (ms). */
  shake: { distance: 8, steps: [50, 70, 60, 60] },
} as const;

/** Opacity of disabled controls. */
export const opacity = {
  disabled: 0.5,
} as const;

/**
 * Size classes. `window` decides navigation chrome (sidebar vs bottom tabs) and the
 * split two-pane screens; `content` is measured inside a screen and decides grids.
 */
export const breakpoints = {
  window: { sidebar: 1000, split: 960 },
  content: { regular: 560, wide: 860 },
} as const;

export const layout = {
  screenPadding: spacing.lg,
  /** Inside a card. */
  cardPadding: 20,
  /** Side padding once the window is tablet-sized. */
  screenPaddingRegular: spacing.xl,
  /** Comfortable reading width for single-column content (solutions, forms, chat). */
  readableWidth: 760,
  /** Cap for dashboards so cards don't stretch across a large iPad. */
  maxContentWidth: 1180,
  /** Tab sidebar on large windows. */
  sidebarWidth: 220,
  /** Width of the left pane in split screens, as a fraction. */
  splitLeft: 0.46,
  /** Minimum touch target (Apple HIG). */
  minTouch: 44,
  borderWidth: 1,
  progressHeight: 10,
  frameBorder: 2,
  shutterBorder: 4,
  iconSize: { sm: 18, md: 22, lg: 28, xl: 40 },
  /** Line icons are drawn at this stroke width (24-unit grid). */
  iconStroke: 1.8,
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
  /** Round timer controls (pause, stop). */
  roundControl: 68,
  /** Pomodoro ring diameter and stroke. */
  timerRing: 260,
  timerStroke: 10,
  /** Avatar circle on the leaderboard. */
  avatar: 40,
  /** Lumi, the assistant: in a note (home, empty states) and large (sign-in, celebrations). */
  mascot: { note: 84, hero: 150 },
  /** Lumi next to a chat reply, and the size of the "typing" dots. */
  chatAvatar: 36,
  chatDot: 7,
  chart: {
    lineWidth: 2,
    markerRadius: 4,
    ringWidth: 2,
    barThickness: 12,
    barEndRadius: 4,
    trendHeight: 180,
    sparkHeight: 44,
    axisWidth: 34,
    endLabelWidth: 44,
  },
} as const;

export interface Theme {
  scheme: ColorScheme;
  colors: ColorTokens;
  breakpoints: typeof breakpoints;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  letterSpacing: typeof letterSpacing;
  lineRatio: typeof lineRatio;
  fonts: typeof fonts;
  motion: typeof motion;
  opacity: typeof opacity;
  layout: typeof layout;
}

const shared = { breakpoints, spacing, radius, fontSize, lineRatio, letterSpacing, fonts, motion, opacity, layout };

const themes: Record<ColorScheme, Theme> = {
  light: { scheme: 'light', colors: light, ...shared },
  dark: { scheme: 'dark', colors: dark, ...shared },
};

export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export function subjectColor(theme: Theme, subject: string): string {
  return theme.colors.subject[subject as Subject] ?? theme.colors.primary;
}

/**
 * The look of a raised surface (cards, tiles, list rows): paper with a soft shadow in
 * light mode, a hairline edge and top highlight in dark mode, continuous corners.
 */
export function elevated(theme: Theme, level: 'card' | 'raised' | 'floating' = 'card') {
  const dark = theme.scheme === 'dark';
  return {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderCurve: 'continuous' as const,
    borderWidth: dark ? theme.layout.borderWidth : 0,
    borderColor: theme.colors.border,
    boxShadow: theme.colors.shadow[level],
  };
}
