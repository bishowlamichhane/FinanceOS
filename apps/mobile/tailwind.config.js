/* eslint-disable @typescript-eslint/no-require-imports */
const { darkTheme, lightTheme, palette, spacing, radius } = require('@finance-os/design-tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Raw palette — for cases where we need an exact value
        slate: palette.slate,
        teal: palette.teal,
        cyan: palette.cyan,
        green: palette.green,
        orange: palette.orange,
        amber: palette.amber,
        blue: palette.blue,
        purple: palette.purple,

        // Semantic — flip with the theme via runtime ThemeProvider.
        'd-bg': darkTheme.bg,
        'd-surface': darkTheme.surface,
        'd-text': darkTheme.text,
        'd-text-muted': darkTheme.textMuted,
        'd-border': darkTheme.border,
        'd-primary': darkTheme.primary,
        'd-accent': darkTheme.accent,
        'd-success': darkTheme.success,
        'd-danger': darkTheme.danger,

        'l-bg': lightTheme.bg,
        'l-surface': lightTheme.surface,
        'l-text': lightTheme.text,
        'l-text-muted': lightTheme.textMuted,
        'l-border': lightTheme.border,
        'l-primary': lightTheme.primary,
        'l-accent': lightTheme.accent,

        // Bank/wallet brand accents — saturated, used by AccountCard gradients
        'card-blue': palette.cardAccent.cardBlue,
        'card-orange': palette.cardAccent.cardOrange,
        'card-emerald': palette.cardAccent.cardEmerald,
        'card-violet': palette.cardAccent.cardViolet,
      },
      spacing: {
        'xxs': spacing.xxs,
        'xs': spacing.xs,
        'sm': spacing.sm,
        'md': spacing.md,
        'base': spacing.base,
        'lg': spacing.lg,
        'xl': spacing.xl,
        'xxl': spacing.xxl,
        'xxxl': spacing.xxxl,
        'huge': spacing.huge,
      },
      borderRadius: {
        'sm': radius.sm,
        'md': radius.md,
        'lg': radius.lg,
        'xl': radius.xl,
        'xxl': radius.xxl,
        'pill': radius.pill,
      },
      fontFamily: {
        display: ['Manrope_700Bold'],
        'display-extrabold': ['Manrope_800ExtraBold'],
        'display-semibold': ['Manrope_600SemiBold'],
        'display-medium': ['Manrope_500Medium'],
        body: ['Inter_400Regular'],
        'body-medium': ['Inter_500Medium'],
        'body-semibold': ['Inter_600SemiBold'],
        'body-bold': ['Inter_700Bold'],
        mono: ['JetBrainsMono_500Medium'],
      },
    },
  },
  plugins: [],
};
