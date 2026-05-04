/**
 * Spacing — 4px base unit, named scale per DESIGN.md.
 *
 * Use named tokens (`spacing.md`), never raw numbers. This keeps rhythm
 * consistent across screens.
 */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16, // most common, default card padding
  lg: 20,
  xl: 24, // page horizontal margin, card-to-card gap
  xxl: 32,
  xxxl: 40,
  huge: 56,
  giant: 72,
} as const;

export type SpacingToken = keyof typeof spacing;

/**
 * Radius — five steps + pill.
 *
 * - sm/md: small UI (chips, badges)
 * - lg: inputs, buttons
 * - xl: cards
 * - xxl: hero cards, sheets
 * - pill: status badges, primary CTAs
 */
export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;

/**
 * Elevation — three levels for both platforms.
 *
 * RN doesn't natively support iOS-style + Android shadow + box-shadow web in
 * one prop. The design system Card primitive applies platform-correct values.
 */
export type ElevationStyle = {
  // iOS / web
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  // Android
  elevation: number;
};

// Elevation factory — uses the theme's shadow color so light & dark differ
export const buildElevation = (shadowColor: string) => ({
  none: {
    shadowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  // Soft card lift
  sm: {
    shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  // Default card shadow per DESIGN.md
  md: {
    shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  // Sheets, dropdowns
  lg: {
    shadowColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
  },
  // Modals
  xl: {
    shadowColor,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.16,
    shadowRadius: 40,
    elevation: 20,
  },
}) satisfies Record<string, ElevationStyle>;

export type ElevationToken = keyof ReturnType<typeof buildElevation>;

/**
 * Animation durations / easings.
 *
 * Reanimated easing values plugged in at usage site; this just centralizes
 * the timings so transitions feel consistent.
 */
export const motion = {
  duration: {
    instant: 100,
    fast: 180,
    base: 240,
    slow: 320,
    slower: 480,
  },
  // Standard "premium" easing — matches what fintech apps use
  easing: {
    standard: [0.2, 0.0, 0.0, 1.0] as const,
    accelerate: [0.4, 0.0, 1.0, 1.0] as const,
    decelerate: [0.0, 0.0, 0.2, 1.0] as const,
    emphasized: [0.2, 0.0, 0.0, 1.0] as const,
  },
} as const;

/**
 * Sizing — predictable component dimensions.
 */
export const sizing = {
  // Touch targets — 44 minimum per Apple HIG, 48 per Material
  touchTarget: 48,
  iconXs: 12,
  iconSm: 16,
  iconBase: 20,
  iconMd: 24,
  iconLg: 28,
  iconXl: 32,

  // Component dimensions
  inputHeight: 52,
  buttonHeight: 52,
  buttonHeightSm: 40,
  buttonHeightLg: 56,

  // Avatar
  avatarSm: 32,
  avatarMd: 40,
  avatarLg: 56,
  avatarXl: 80,

  // Lists
  transactionRowHeight: 64, // per DESIGN.md spec
  accountCardHeight: 180,

  // Charts
  chartHeightSm: 140,
  chartHeight: 200,
  chartHeightLg: 280,

  // Tab bar
  tabBarHeight: 64,
} as const;

export type SizingToken = keyof typeof sizing;
