/**
 * Finance OS — Typography
 *
 * Dual-font system per DESIGN.md:
 *  - Manrope: headlines, financial figures, numeric displays
 *  - Inter: body, labels, micro-copy
 *
 * Font weight names map to Expo Font load names. Loaded once at app boot.
 */

export const fontFamilies = {
  display: 'Manrope',
  displayBold: 'Manrope_700Bold',
  displayExtraBold: 'Manrope_800ExtraBold',
  displaySemiBold: 'Manrope_600SemiBold',
  displayMedium: 'Manrope_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  // Mono used for stuff like demat numbers, account suffixes (•••• 4421)
  mono: 'JetBrainsMono_500Medium',
} as const;

export type FontFamily = (typeof fontFamilies)[keyof typeof fontFamilies];

export type TextStyle = {
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
};

/**
 * Type scale.
 *
 * Naming follows function, not size. `numericDisplay` is for the big balance
 * card; `numericLg` for stat cards; `numericMd` for transaction amounts.
 *
 * Sizes are in pt/px (RN treats them equivalently).
 * lineHeight is absolute, not a multiplier.
 */
export const typography = {
  // Display — used sparingly (auth welcome, big empty states)
  display: {
    fontFamily: fontFamilies.displayExtraBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.8,
  },
  // Headers
  h1: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  h2: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  h4: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: 18,
    lineHeight: 24,
  },
  // Body
  bodyLg: {
    fontFamily: fontFamilies.body,
    fontSize: 17,
    lineHeight: 26,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  bodySemiBold: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  bodySm: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
  },
  bodySmMedium: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    lineHeight: 16,
  },
  // Caps — section headers, metadata. Heavy tracking, all uppercase via prop.
  labelCaps: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  labelCapsSm: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.1,
  },
  // Numeric — for money figures.
  numericDisplay: {
    fontFamily: fontFamilies.displayExtraBold,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.2,
  },
  numericXl: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  numericLg: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  numericMd: {
    fontFamily: fontFamilies.displaySemiBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  numericSm: {
    fontFamily: fontFamilies.displayMedium,
    fontSize: 14,
    lineHeight: 18,
  },
  // Mono — demat numbers, account suffixes, anything that should align tabularly
  mono: {
    fontFamily: fontFamilies.mono,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  monoSm: {
    fontFamily: fontFamilies.mono,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
} satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;
