import { View, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export type DividerProps = {
  /** Thickness in pixels. Default 1. */
  thickness?: number;
  /** Inset from the start (e.g. for separators that align with text after an icon). */
  insetStart?: number;
  /** Inset from the end. */
  insetEnd?: number;
  /** 'subtle' = barely visible, 'default' = visible, 'strong' = high contrast. */
  intensity?: 'subtle' | 'default' | 'strong';
  /** Vertical orientation when rendered inside a horizontal Stack. */
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Divider — hairline separator.
 *
 * Use between rows in a list, between sections in a card. Default intensity
 * is 'subtle' which means it whispers rather than shouts.
 */
export function Divider({
  thickness = 1,
  insetStart = 0,
  insetEnd = 0,
  intensity = 'subtle',
  vertical = false,
  style,
}: DividerProps) {
  const theme = useTheme();
  const color =
    intensity === 'strong'
      ? theme.colors.borderStrong
      : intensity === 'default'
        ? theme.colors.border
        : theme.colors.borderSubtle;

  if (vertical) {
    return (
      <View
        style={[
          {
            width: thickness,
            alignSelf: 'stretch',
            backgroundColor: color,
            marginTop: insetStart,
            marginBottom: insetEnd,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        {
          height: thickness,
          backgroundColor: color,
          marginLeft: insetStart,
          marginRight: insetEnd,
        },
        style,
      ]}
    />
  );
}