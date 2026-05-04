import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { TypographyToken } from '@finance-os/design-tokens';

export type TextColorToken =
  | 'text'
  | 'textMuted'
  | 'textSubtle'
  | 'textInverse'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export type TextProps = RNTextProps & {
  variant?: TypographyToken;
  color?: TextColorToken | string; // string accepts raw hex if needed
  align?: 'left' | 'center' | 'right';
  uppercase?: boolean;
  numberOfLines?: number;
};

/**
 * <Text variant="numericLg" color="success">+ Rs 12,400</Text>
 *
 * Always reach for this rather than React Native's <Text>. It enforces our
 * type scale and theme-aware coloring.
 */
export function Text({
  variant = 'body',
  color = 'text',
  align,
  uppercase,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const tokenStyle = theme.typography[variant];

  const resolvedColor: string = isThemeColor(color) ? theme.colors[color] : color;

  const composed: TextStyle = {
    ...tokenStyle,
    color: resolvedColor,
    ...(align ? { textAlign: align } : {}),
    ...(uppercase ? { textTransform: 'uppercase' } : {}),
  };

  return <RNText {...rest} style={[composed, style]} />;
}

function isThemeColor(c: string): c is TextColorToken {
  return [
    'text',
    'textMuted',
    'textSubtle',
    'textInverse',
    'primary',
    'success',
    'warning',
    'danger',
    'info',
  ].includes(c);
}
