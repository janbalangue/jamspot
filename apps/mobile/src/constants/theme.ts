/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// JamSpot's web app (apps/web/app/globals.css) has no light/dark toggle —
// this dark violet palette is the only theme it ever renders. `light` and
// `dark` are kept identical here (rather than collapsed into one object) so
// every existing useTheme()/Colors[scheme] call site keeps working
// unmodified while always resolving to the same web-matching palette,
// regardless of the device's system appearance setting.
const jamspotPalette = {
  text: '#ede9ff',
  background: '#07070f',
  backgroundElement: '#141424',
  backgroundSelected: 'rgba(139, 92, 246, 0.25)',
  textSecondary: '#9088b0',
  primary: '#8b5cf6',
  primaryForeground: '#ffffff',
  card: '#0f0f1e',
  border: 'rgba(139, 92, 246, 0.15)',
} as const;

export const Colors = {
  light: jamspotPalette,
  dark: jamspotPalette,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * apps/web/components/ReviewCard.tsx is the one deliberate inversion in an
 * otherwise all-dark UI: review cards render as light "paper" cards
 * floating on the dark page (apps/web/app/globals.css's review-* tokens).
 * Kept separate from ThemeColor/useTheme since nothing else uses it.
 */
export const ReviewColors = {
  background: '#faf9ff',
  foreground: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
