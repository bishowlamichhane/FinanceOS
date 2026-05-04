import {
  Pressable,
  View,
  type ViewProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';
import type {
  ElevationToken,
  RadiusToken,
  SpacingToken,
} from '@finance-os/design-tokens';

export type CardProps = ViewProps & {
  /**
   * Variant:
   *   surface  — default, lifted card (elevation sm)
   *   elevated — sits higher, used for primary heroes
   *   sunken   — recessed, for grouping nested content
   *   outlined — border only, for empty states
   *   plain    — no fill, no border, no elevation (for grouping with own padding)
   */
  variant?: 'surface' | 'elevated' | 'sunken' | 'outlined' | 'plain';

  /** Inner padding. Pass `'none'` if children handle their own. Default 'lg' (20px). */
  padding?: SpacingToken | 'none';

  /** Corner radius. Default 'xl' (20px). */
  radius?: RadiusToken;

  /** Elevation override. Defaults match variant. */
  elevation?: ElevationToken;

  /**
   * When provided, makes the card pressable with a subtle scale-down on press.
   * Set this instead of wrapping a Card in your own <Pressable>.
   */
  onPress?: () => void;

  /** Accessibility label. */
  accessibilityLabel?: string;

  style?: StyleProp<ViewStyle>;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Card — the primary container.
 *
 * Phase 2 upgrades:
 *   - `plain` variant for layout-only grouping (no fill, no shadow)
 *   - Built-in `onPress` makes interactive cards a one-liner with proper
 *     scale animation and haptic feedback
 *   - Default padding bumped to 'lg' (20px) for better breathing room
 *   - Surface elevation slightly stronger so cards lift cleanly off bg
 */
export function Card({
  variant = 'surface',
  padding = 'lg',
  radius = 'xl',
  elevation,
  onPress,
  accessibilityLabel,
  style,
  children,
  ...rest
}: CardProps) {
  const theme = useTheme();

  const bgFor: Record<NonNullable<CardProps['variant']>, string> = {
    surface: theme.colors.surface,
    elevated: theme.colors.surfaceElevated,
    sunken: theme.colors.surfaceSunken,
    outlined: 'transparent',
    plain: 'transparent',
  };

  const defaultElevation: ElevationToken =
    variant === 'elevated' ? 'md' : variant === 'surface' ? 'sm' : 'none';
  const elevationToken: ElevationToken = elevation ?? defaultElevation;

  const baseStyle: ViewStyle = {
    backgroundColor: bgFor[variant],
    borderRadius: variant === 'plain' ? 0 : theme.radius[radius],
    padding: padding === 'none' ? 0 : theme.spacing[padding],
    borderWidth: variant === 'outlined' ? 1 : 0,
    borderColor: theme.colors.border,
    ...(variant === 'outlined' || variant === 'sunken' || variant === 'plain'
      ? {}
      : theme.elevation[elevationToken]),
  };

  // Pressable interactive variant
  if (onPress) {
    return <PressableCard
      style={baseStyle}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      outerStyle={style}
      {...rest}
    >
      {children}
    </PressableCard>;
  }

  return (
    <View style={[baseStyle, style]} {...rest}>
      {children}
    </View>
  );
}

function PressableCard({
  style,
  outerStyle,
  onPress,
  accessibilityLabel,
  children,
  ...rest
}: {
  style: ViewStyle;
  outerStyle?: StyleProp<ViewStyle>;
  onPress: () => void;
  accessibilityLabel?: string;
  children?: React.ReactNode;
} & ViewProps) {
  const scale = useSharedValue(1);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 18, stiffness: 350 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 350 });
      }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[style, animated, outerStyle]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}