// Single source of truth for every color, font size, spacing and radius in the app.
// Components read tokens through `useTheme()` and never hardcode values.
// Design changes: edit this file first, then the component.

import { useColorScheme } from 'react-native';
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

  primary: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  neutral: string;
  neutralSoft: string;

  xp: string;
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

  subject: Record<Subject, string>;
}

const light: ColorTokens = {
  background: '#F5F4FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEDF8',
  border: '#E3E0F0',
  text: '#1C1A2E',
  textMuted: '#6E6B85',
  textOnAccent: '#FFFFFF',
  transparent: 'transparent',

  primary: '#6C5CE7',
  primarySoft: '#ECE9FD',
  success: '#1F9D5C',
  successSoft: '#E3F6EC',
  danger: '#E5484D',
  dangerSoft: '#FDEBEC',
  warning: '#C77700',
  warningSoft: '#FFF3DC',
  neutral: '#5F6B7A',
  neutralSoft: '#EDF0F4',

  xp: '#F5A524',
  xpTrack: '#F3E9D6',
  hintBackground: '#FFF6E0',
  streak: '#FF7A1A',
  streakSoft: '#FFEBDC',

  tabBar: '#FFFFFF',
  tabActive: '#6C5CE7',
  tabInactive: '#9C99B0',

  cameraBackground: '#000000',
  cameraForeground: '#FFFFFF',
  cameraScrim: 'rgba(0, 0, 0, 0.55)',
  cropFrame: '#FFFFFF',

  subject: {
    'Türkçe': '#E5484D',
    'Sosyal': '#C77700',
    'Temel Matematik': '#6C5CE7',
    'Fen': '#12A594',
    'Matematik': '#6C5CE7',
    'Fizik': '#2F80ED',
    'Kimya': '#12A594',
    'Biyoloji': '#30A46C',
  },
};

const dark: ColorTokens = {
  background: '#0F0E17',
  surface: '#1A1926',
  surfaceAlt: '#242233',
  border: '#2E2C40',
  text: '#F2F1F8',
  textMuted: '#A09EB5',
  textOnAccent: '#FFFFFF',
  transparent: 'transparent',

  primary: '#8B7CF6',
  primarySoft: '#2A2550',
  success: '#3CC47C',
  successSoft: '#173326',
  danger: '#FF6B6F',
  dangerSoft: '#3A1D21',
  warning: '#F5B544',
  warningSoft: '#3A2D14',
  neutral: '#A7B1BE',
  neutralSoft: '#262A33',

  xp: '#FFC14D',
  xpTrack: '#3A3220',
  hintBackground: '#2E2818',
  streak: '#FF8F3D',
  streakSoft: '#3A2416',

  tabBar: '#15141F',
  tabActive: '#8B7CF6',
  tabInactive: '#6F6C85',

  cameraBackground: '#000000',
  cameraForeground: '#FFFFFF',
  cameraScrim: 'rgba(0, 0, 0, 0.55)',
  cropFrame: '#FFFFFF',

  subject: {
    'Türkçe': '#FF6B6F',
    'Sosyal': '#F5B544',
    'Temel Matematik': '#8B7CF6',
    'Fen': '#2EC4B6',
    'Matematik': '#8B7CF6',
    'Fizik': '#5B9DFF',
    'Kimya': '#2EC4B6',
    'Biyoloji': '#4CC98A',
  },
};

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
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 40,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

export const layout = {
  screenPadding: spacing.lg,
  /** Minimum touch target (Apple HIG). */
  minTouch: 44,
  borderWidth: 1,
  progressHeight: 12,
  frameBorder: 2,
  shutterBorder: 4,
  iconSize: { sm: 18, md: 22, lg: 28, xl: 40 },
  shutterSize: 76,
  cropHandle: 44,
  cropMinSize: 80,
} as const;

export interface Theme {
  scheme: ColorScheme;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  layout: typeof layout;
}

const themes: Record<ColorScheme, Theme> = {
  light: { scheme: 'light', colors: light, spacing, radius, fontSize, fontWeight, layout },
  dark: { scheme: 'dark', colors: dark, spacing, radius, fontSize, fontWeight, layout },
};

export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export function subjectColor(theme: Theme, subject: string): string {
  return theme.colors.subject[subject as Subject] ?? theme.colors.primary;
}
