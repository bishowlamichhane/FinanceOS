import { Pressable, View, type ViewStyle, type StyleProp } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';
import { Text } from './Text';
import type { ReactNode } from 'react';

export type ChipProps = {
  label: string;
  selected?: boolean;
  /** Optional leading icon */
  icon?: ReactNode;
  /** When provided, renders a small × button on the right that calls this */
  onRemove?: () => void;
  /** Tap handler. */
  onPress?: () => void;
  disabled?: boolean;
  /** Override the active accent color (default: theme.primary). Used by category/tag chips. */
  accentColor?: string;
  /** Visual size. Default 'md'. */
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

/**
 * Chip — small interactive element.
 *
 * Used for:
 *   - Direction toggles (Expense / Income / Transfer) — but SegmentedControl is preferred there
 *   - Quick filter chips
 *   - Tag inputs (with onRemove)
 *   - Category quick-pick rows
 */
export function Chip({
  label,
  selected,
  icon,
  onRemove,
  onPress,
  disabled,
  accentColor,
  size = 'md',
  style,
}: ChipProps) {
  const theme = useTheme();
  const fillColor = accentColor ?? theme.colors.primary;
  const fillMutedColor = accentColor
    ? `${accentColor}22`
    : theme.colors.primaryMuted;

  const bg = selected ? fillMutedColor : theme.colors.surfaceSunken;
  const fg = selected ? fillColor : theme.colors.textMuted;
  const border = selected ? fillColor : 'transparent';

  const padX = size === 'sm' ? theme.spacing.sm : theme.spacing.md;
  const padY = size === 'sm' ? theme.spacing.xxs : theme.spacing.xs + 2;

  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              haptics.tap();
              onPress();
            }
          : undefined
      }
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: padX,
          paddingVertical: padY,
          borderRadius: theme.radius.pill,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          gap: theme.spacing.xs,
          opacity: pressed ? 0.7 : disabled ? 0.5 : 1,
        },
        style,
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
    >
      {icon ? <View>{icon}</View> : null}
      <Text variant={size === 'sm' ? 'caption' : 'bodySmMedium'} style={{ color: fg }}>
        {label}
      </Text>
      {onRemove ? (
        <Pressable
          onPress={() => {
            haptics.tap();
            onRemove();
          }}
          hitSlop={8}
          style={{ marginLeft: theme.spacing.xxs }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
        >
          <X size={12} color={fg} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}