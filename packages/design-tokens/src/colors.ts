/**
 * Finance OS — Color tokens (v3 — Teal redesign)
 *
 * Translated from the new Claude Design palette. The source uses `oklch()`
 * which RN doesn't parse natively; values below are the closest hex
 * equivalents in the perceptual neighborhood, often pulled from the
 * Tailwind scale.
 *
 * Three principles:
 *
 * 1. **Teal is the brand.** Single accent color, used for the gradient hero
 *    card, active tab tint, primary CTA, focus rings. No more split brand
 *    vs accent — the design uses primary for both jobs.
 *
 * 2. **Cool slate neutrals.** Surfaces sit on slate (subtle blue undertone),
 *    not warm zinc. Matches the design's `oklch(... 230)` hue family.
 *
 * 3. **Semantic colors stay.** income green / expense orange-red /
 *    warn amber / info blue / asset purple. Used for chips, deltas,
 *    category accents.
 */

export const palette = {
  // Slate scale — the dominant neutral. Cool blue undertone.
  slate: {
    25: '#F8FAFC',  // app bg in light mode
    50: '#F1F5F9',
    100: '#E2E8F0', // line/border in light
    200: '#CBD5E1',
    300: '#94A3B8',
    400: '#64748B', // textSubtle in light
    500: '#475569', // textMuted in light
    600: '#334155',
    700: '#1E293B', // surface in dark
    800: '#15202B', // surfaceSunken half-step
    900: '#0F172A', // text in light
    950: '#0B1220', // app bg in dark mode
  },
  // Teal — the brand. Active tab, CTAs, focus, hero gradient.
  teal: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',  // primary in dark
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',  // primary in light
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },
  // Cyan/blue — the second stop in the hero gradient.
  cyan: {
    500: '#06B6D4',
    600: '#0891B2',
    700: '#0E7490',
    800: '#155E75',  // gradient end stop in light
    900: '#164E63',
  },
  // Green — income / positive amounts only.
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    400: '#4ADE80', // income in dark
    500: '#22C55E',
    600: '#16A34A', // income in light
    700: '#15803D',
  },
  // Orange-red — expense / negative amounts. Warm coral, not harsh red.
  orange: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    400: '#FB923C', // expense in dark
    500: '#F97316',
    600: '#EA580C', // expense in light
    700: '#C2410C',
  },
  // Amber — warnings, pending, "near limit".
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    400: '#FBBF24', // warn in dark
    500: '#F59E0B', // warn in light
    600: '#D97706',
    700: '#B45309',
  },
  // Blue — info, transfers, secondary highlights.
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    400: '#60A5FA', // info in dark
    500: '#3B82F6',
    600: '#2563EB', // info in light
    700: '#1D4ED8',
  },
  // Purple — asset accent (real estate, vehicle, etc.) — used by Wallet later.
  purple: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    400: '#C084FC',
    500: '#A855F7',
    600: '#9333EA',
    700: '#7E22CE',
  },
  // Bank/wallet card brand accents — saturated, used by AccountCard gradients.
  // These are real bank brand colors, theme-independent.
  cardAccent: {
    cardBlue: '#3B6FE0',
    cardBlueDeep: '#1E40AF',
    cardOrange: '#D9532E',
    cardOrangeDeep: '#9A2D0F',
    cardEmerald: '#0E8E5C',
    cardViolet: '#5B3FD9',
  },
  black: '#000000',
  white: '#FFFFFF',
} as const;

/**
 * A gradient is just an ordered list of color stops. Components pass these
 * arrays directly to <LinearGradient colors={...}>.
 */
export type GradientStops = readonly [string, string, ...string[]];

export type ThemeGradients = {
  /** Hero balance card — the signature teal → cyan gradient. */
  hero: GradientStops;
  /** Vibrant accent — for special CTAs / featured cards. */
  accent: GradientStops;
  /** Soft success — for income / positive surfaces. */
  success: GradientStops;
  /** Warm amber — for warning / "tip" surfaces. */
  warm: GradientStops;
  /** Atmospheric glow — drape over the top of a screen for depth. */
  glow: GradientStops;
  /** Brand panel gradient (Profile banner etc.). */
  brand: GradientStops;
};

export type ThemeColors = {
  // Backgrounds
  bg: string;
  bgElevated: string;
  bgInverse: string;

  surface: string;
  surfaceElevated: string;
  surfaceSunken: string;
  surfaceInverse: string;

  /** Subtle teal-washed surface, for grouping. */
  surfaceTinted: string;
  /** Subtle warm-washed surface — tips, callouts. */
  surfaceWarm: string;
  /** Subtle success-washed surface — positive callouts. */
  surfaceSuccess: string;

  // Text
  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  textOnPrimary: string;
  textOnAccent: string;
  textOnSuccess: string;
  textOnWarning: string;
  textOnError: string;

  // Borders & dividers
  border: string;
  borderStrong: string;
  borderSubtle: string;

  // Brand — TEAL. Single accent. Hero, active tab, CTAs, focus.
  primary: string;
  primaryHover: string;
  primaryMuted: string;
  primaryStrong: string;

  // Accent — kept for backward compat with components I built before.
  // In this design it's just an alias of primary (also teal).
  accent: string;
  accentHover: string;
  accentMuted: string;
  accentStrong: string;

  // Status
  success: string;
  successMuted: string;
  successStrong: string;
  warning: string;
  warningMuted: string;
  warningStrong: string;
  /** Alias of warning, kept for code that still uses `warn`. */
  warn: string;
  warnMuted: string;
  danger: string;
  dangerMuted: string;
  dangerStrong: string;
  info: string;
  infoMuted: string;
  /** Asset accent — purple. New in v3 for the Wallet/Net-Worth screen. */
  asset: string;
  assetMuted: string;

  // Charts
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  chartGrid: string;
  chartAxis: string;

  // Bank/wallet brand accents
  cardAccentBlue: string;
  cardAccentOrange: string;
  cardAccentEmerald: string;
  cardAccentViolet: string;

  // Overlays + shadow base
  overlay: string;
  overlayStrong: string;
  shadow: string;
};

// =============================================================================
// LIGHT THEME — warm-cool slate, teal accent
// =============================================================================

export const lightTheme: ThemeColors = {
  bg: palette.slate[25],            // #F8FAFC
  bgElevated: palette.white,
  bgInverse: palette.slate[950],

  surface: palette.white,
  surfaceElevated: palette.white,
  surfaceSunken: palette.slate[50],
  surfaceInverse: palette.slate[950],

  surfaceTinted: '#ECFEFA',         // teal-50 lightened
  surfaceWarm: '#FFF8EC',
  surfaceSuccess: '#ECFDF3',

  text: palette.slate[900],
  textMuted: palette.slate[500],
  textSubtle: palette.slate[400],
  textInverse: palette.white,
  textOnPrimary: palette.white,
  textOnAccent: palette.white,
  textOnSuccess: palette.white,
  textOnWarning: palette.white,
  textOnError: palette.white,

  border: palette.slate[100],       // #E2E8F0
  borderStrong: palette.slate[200], // #CBD5E1
  borderSubtle: '#EEF2F6',

  primary: palette.teal[600],       // #0D9488
  primaryHover: palette.teal[700],
  primaryMuted: 'rgba(13, 148, 136, 0.08)',
  primaryStrong: palette.teal[800],

  accent: palette.teal[600],
  accentHover: palette.teal[700],
  accentMuted: 'rgba(13, 148, 136, 0.10)',
  accentStrong: palette.teal[800],

  success: palette.green[600],
  successMuted: palette.green[100],
  successStrong: palette.green[700],
  warning: palette.amber[500],
  warningMuted: palette.amber[100],
  warningStrong: palette.amber[600],
  warn: palette.amber[500],
  warnMuted: palette.amber[100],
  danger: palette.orange[600],
  dangerMuted: palette.orange[100],
  dangerStrong: palette.orange[700],
  info: palette.blue[600],
  infoMuted: palette.blue[100],
  asset: palette.purple[600],
  assetMuted: palette.purple[100],

  // Lead with teal, then balance across the rainbow
  chart1: palette.teal[600],
  chart2: palette.green[600],
  chart3: palette.amber[500],
  chart4: palette.blue[600],
  chart5: palette.orange[600],
  chartGrid: palette.slate[100],
  chartAxis: palette.slate[400],

  cardAccentBlue: palette.cardAccent.cardBlueDeep,
  cardAccentOrange: palette.cardAccent.cardOrangeDeep,
  cardAccentEmerald: palette.cardAccent.cardEmerald,
  cardAccentViolet: palette.cardAccent.cardViolet,

  overlay: 'rgba(15, 23, 42, 0.45)',
  overlayStrong: 'rgba(15, 23, 42, 0.65)',

  shadow: palette.slate[900],
};

// =============================================================================
// DARK THEME — deep slate, brighter teal accent
// =============================================================================

export const darkTheme: ThemeColors = {
  bg: '#1A2333',                    // mid slate — lighter than v3, no longer reads as black
  bgElevated: '#222D40',
  bgInverse: palette.slate[25],

  surface: '#28344A',               // card surface — clearly distinct from bg
  surfaceElevated: '#33405A',       // hovered / lifted card
  surfaceSunken: '#141B2A',
  surfaceInverse: palette.white,

  surfaceTinted: 'rgba(45, 212, 191, 0.12)',  // soft teal wash
  surfaceWarm: 'rgba(251, 191, 36, 0.12)',
  surfaceSuccess: 'rgba(74, 222, 128, 0.12)',

  text: '#F1F5F9',
  textMuted: palette.slate[300],    // #94A3B8
  textSubtle: palette.slate[400],   // #64748B
  textInverse: palette.slate[950],
  textOnPrimary: palette.slate[950],
  textOnAccent: palette.slate[950],
  textOnSuccess: palette.slate[950],
  textOnWarning: palette.slate[950],
  textOnError: palette.white,

  border: 'rgba(148, 163, 184, 0.14)',
  borderStrong: 'rgba(148, 163, 184, 0.22)',
  borderSubtle: 'rgba(148, 163, 184, 0.07)',

  primary: palette.teal[300],       // #5EEAD4 — bright soft teal
  primaryHover: palette.teal[200],
  primaryMuted: 'rgba(94, 234, 212, 0.14)',
  primaryStrong: palette.teal[400],

  accent: palette.teal[300],
  accentHover: palette.teal[200],
  accentMuted: 'rgba(94, 234, 212, 0.14)',
  accentStrong: palette.teal[400],

  success: palette.green[400],
  successMuted: 'rgba(74, 222, 128, 0.14)',
  successStrong: palette.green[500],
  warning: palette.amber[400],
  warningMuted: 'rgba(251, 191, 36, 0.14)',
  warningStrong: palette.amber[500],
  warn: palette.amber[400],
  warnMuted: 'rgba(251, 191, 36, 0.14)',
  danger: palette.orange[400],
  dangerMuted: 'rgba(251, 146, 60, 0.14)',
  dangerStrong: palette.orange[500],
  info: palette.blue[400],
  infoMuted: 'rgba(96, 165, 250, 0.14)',
  asset: palette.purple[400],
  assetMuted: 'rgba(192, 132, 252, 0.14)',

  chart1: palette.teal[300],
  chart2: palette.green[400],
  chart3: palette.amber[400],
  chart4: palette.blue[400],
  chart5: palette.orange[400],
  chartGrid: 'rgba(148, 163, 184, 0.07)',
  chartAxis: palette.slate[400],

  cardAccentBlue: palette.cardAccent.cardBlue,
  cardAccentOrange: palette.cardAccent.cardOrange,
  cardAccentEmerald: palette.cardAccent.cardEmerald,
  cardAccentViolet: palette.cardAccent.cardViolet,

  overlay: 'rgba(0, 0, 0, 0.55)',
  overlayStrong: 'rgba(0, 0, 0, 0.75)',

  shadow: palette.black,
};

export const themes = {
  dark: darkTheme,
  light: lightTheme,
} as const;

export type ThemeName = keyof typeof themes;

// =============================================================================
// GRADIENTS — the signature teal → cyan hero, plus accents per theme
// =============================================================================

export const lightGradients: ThemeGradients = {
  // The signature: teal-600 → cyan-800 — exactly the design's hero card
  hero: ['#0D9488', '#0E7490', '#155E75'],
  accent: ['#0D9488', '#0891B2', '#06B6D4'],
  success: ['#15803D', '#16A34A', '#22C55E'],
  warm: ['#FFF7ED', '#FED7AA', '#FDBA74'],
  glow: ['rgba(13, 148, 136, 0.08)', 'rgba(13, 148, 136, 0)'],
  brand: ['#0D9488', '#0891B2', '#0E7490'],
};

export const darkGradients: ThemeGradients = {
  hero: ['#0F766E', '#0E7490', '#155E75'],          // slightly deeper teal in dark
  accent: ['#0D9488', '#0891B2', '#06B6D4'],
  success: ['#15803D', '#16A34A', '#22C55E'],
  warm: ['#78350F', '#92400E', '#B45309'],
  glow: ['rgba(94, 234, 212, 0.10)', 'rgba(94, 234, 212, 0)'],
  brand: ['#0F766E', '#0891B2', '#06B6D4'],
};

export const gradients = {
  dark: darkGradients,
  light: lightGradients,
} as const;
