import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export type BadgeIntent = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

export type BadgeProps = {
  label: string;
  intent?: BadgeIntent;
  variant?: 'soft' | 'solid' | 'outline';
  style?: ViewStyle;
};

export function Badge({ label, intent = 'neutral', variant = 'soft', style }: BadgeProps) {
  const theme = useTheme();

  const tones: Record<BadgeIntent, { bg: string; fg: string; border: string }> = {
    neutral: {
      bg: theme.colors.surfaceElevated,
      fg: theme.colors.textMuted,
      border: theme.colors.border,
    },
    success: {
      bg: theme.colors.successMuted,
      fg: theme.colors.success,
      border: theme.colors.success,
    },
    warning: {
      bg: theme.colors.warningMuted,
      fg: theme.colors.warning,
      border: theme.colors.warning,
    },
    danger: {
      bg: theme.colors.dangerMuted,
      fg: theme.colors.danger,
      border: theme.colors.danger,
    },
    info: {
      bg: theme.colors.infoMuted,
      fg: theme.colors.info,
      border: theme.colors.info,
    },
    primary: {
      bg: theme.colors.primaryMuted,
      fg: theme.colors.primary,
      border: theme.colors.primary,
    },
  };

  const tone = tones[intent];

  const baseStyle: ViewStyle = {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor:
      variant === 'solid' ? tone.fg : variant === 'outline' ? 'transparent' : tone.bg,
    borderWidth: variant === 'outline' ? 1 : 0,
    borderColor: tone.border,
  };

  return (
    <View style={[baseStyle, style]}>
      <Text
        variant="labelCapsSm"
        style={{
          color: variant === 'solid' ? theme.colors.bg : tone.fg,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
