import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';

export type SkeletonProps = {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

/**
 * Skeleton placeholder. Animates a subtle opacity pulse so the screen feels
 * alive while data loads. Used inside StatCard, AccountCard, lists, etc.
 */
export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius: radius ?? theme.radius.md,
          backgroundColor: theme.colors.surfaceElevated,
        },
        animated,
        style,
      ]}
    />
  );
}

/** Convenience: stack of N skeleton lines */
export function SkeletonList({ count = 3, gap = 12 }: { count?: number; gap?: number }) {
  const theme = useTheme();
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          height={theme.sizing.transactionRowHeight - 16}
          radius={theme.radius.md}
        />
      ))}
    </View>
  );
}
