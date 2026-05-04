import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hapticOnPress?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Button.
 *
 * - primary: emerald in dark / indigo-deep in light. Reserved for the
 *   single primary action per screen.
 * - secondary: surface-elevated with border. Pairs alongside primary.
 * - ghost: transparent. Used inside cards or for tertiary actions.
 * - danger: rose. Destructive only.
 *
 * Press animation: gentle scale-down via Reanimated for feel.
 * Haptics fire on press by default; opt out with hapticOnPress={false}.
 */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  fullWidth,
  leftIcon,
  rightIcon,
  style,
  onPress,
  hapticOnPress = true,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const sizing = useMemo(() => {
    switch (size) {
      case 'sm':
        return { height: theme.sizing.buttonHeightSm, padX: theme.spacing.base, gap: theme.spacing.xs };
      case 'lg':
        return { height: theme.sizing.buttonHeightLg, padX: theme.spacing.xl, gap: theme.spacing.sm };
      case 'md':
      default:
        return { height: theme.sizing.buttonHeight, padX: theme.spacing.lg, gap: theme.spacing.sm };
    }
  }, [size, theme]);

  const palette = useMemo(() => {
    const isDisabled = disabled || loading;
    switch (variant) {
      case 'primary':
        return {
          bg: isDisabled ? theme.colors.primaryMuted : theme.colors.primary,
          fg: isDisabled ? theme.colors.textMuted : theme.colors.textOnPrimary,
          border: 'transparent',
        };
      case 'secondary':
        return {
          bg: theme.colors.surface,
          fg: isDisabled ? theme.colors.textMuted : theme.colors.text,
          border: theme.colors.border,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          fg: isDisabled ? theme.colors.textMuted : theme.colors.text,
          border: 'transparent',
        };
      case 'danger':
        return {
          bg: isDisabled ? theme.colors.dangerMuted : theme.colors.danger,
          fg: theme.colors.textOnError,
          border: 'transparent',
        };
      case 'success':
        return {
          bg: isDisabled ? theme.colors.successMuted : theme.colors.success,
          fg: isDisabled ? theme.colors.textMuted : theme.colors.textOnSuccess,
          border: 'transparent',
        };
    }
  }, [variant, disabled, loading, theme]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const baseStyle: ViewStyle = {
    height: sizing.height,
    paddingHorizontal: sizing.padX,
    borderRadius: theme.radius.lg,
    backgroundColor: palette.bg,
    borderWidth: variant === 'secondary' ? 1 : 0,
    borderColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sizing.gap,
    opacity: disabled && !loading ? 0.6 : 1,
    width: fullWidth ? '100%' : undefined,
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled || loading}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 18, stiffness: 280 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 280 });
      }}
      onPress={(e) => {
        if (hapticOnPress) {
          if (variant === 'danger') haptics.warn();
          else haptics.tap();
        }
        onPress?.(e);
      }}
      style={[baseStyle, animatedStyle, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <>
          {leftIcon}
          <Text
            variant={size === 'sm' ? 'bodySmMedium' : 'bodySemiBold'}
            color={palette.fg}
            style={{ color: palette.fg }}
          >
            {label}
          </Text>
          {rightIcon}
        </>
      )}
    </AnimatedPressable>
  );
}
