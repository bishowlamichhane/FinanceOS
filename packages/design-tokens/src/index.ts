/**
 * @finance-os/design-tokens
 *
 * Single source of truth for visual language. Consumed by:
 *  - apps/mobile (theme provider)
 *  - tailwind.config (NativeWind)
 *  - any future web client
 *
 * Never inline a hex value, never inline a font family in app code.
 * Always reference a token here.
 */

export * from './colors';
export * from './typography';
export * from './spacing';

import {
  darkTheme,
  lightTheme,
  gradients,
  type ThemeColors,
  type ThemeGradients,
  type ThemeName,
} from './colors';
import { typography, type TypographyToken } from './typography';
import {
  spacing,
  radius,
  motion,
  sizing,
  buildElevation,
  type SpacingToken,
  type RadiusToken,
  type ElevationToken,
} from './spacing';

export type Theme = {
  name: ThemeName;
  colors: ThemeColors;
  gradients: ThemeGradients;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  motion: typeof motion;
  sizing: typeof sizing;
  elevation: ReturnType<typeof buildElevation>;
};

export const buildTheme = (name: ThemeName): Theme => {
  const colors = name === 'dark' ? darkTheme : lightTheme;
  return {
    name,
    colors,
    gradients: gradients[name],
    typography,
    spacing,
    radius,
    motion,
    sizing,
    elevation: buildElevation(colors.shadow),
  };
};

export type { TypographyToken, SpacingToken, RadiusToken, ElevationToken };
