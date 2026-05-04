import { Pressable, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';
import type { ReactNode } from 'react';

export type FabProps = {
  icon: ReactNode;
  onPress: () => void;
  /** Override placement; defaults to bottom-right inside safe area. */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Floating Action Button.
 *
 *   <Fab
 *     icon={<Plus size={26} color={theme.colors.textOnPrimary} />}
 *     onPress={...}
 *     style={{ bottom: insets.bottom + theme.spacing.xl }}
 *   />
 */
export function Fab({ icon, onPress, style, accessibilityLabel }: FabProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.92, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 320 });
      }}
      onPress={() => {
        haptics.press();
        onPress();
      }}
      style={[
        {
          position: 'absolute',
          right: theme.spacing.xl,
          width: 56,
          height: 56,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          ...theme.elevation.lg,
        },
        animated,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Add'}
    >
      {icon}
    </AnimatedPressable>
  );
}