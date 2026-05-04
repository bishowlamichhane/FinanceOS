import { useEffect, useState } from 'react';
import {
  Pressable,
  View,
  type ViewStyle,
  type StyleProp,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';
import { Text } from './Text';

export type SegmentedOption<V extends string> = {
  value: V;
  label: string;
};

export type SegmentedControlProps<V extends string> = {
  options: ReadonlyArray<SegmentedOption<V>>;
  value: V;
  onChange: (v: V) => void;
  style?: StyleProp<ViewStyle>;
  /** When set, the indicator pill takes this color. */
  accentColor?: string;
};

/**
 * SegmentedControl.
 *
 * Animated indicator slides between segments. Used in the add-transaction
 * sheet for the Expense / Income / Transfer toggle, and anywhere a user
 * picks one of a small set of options.
 */
export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  style,
  accentColor,
}: SegmentedControlProps<V>) {
  const theme = useTheme();
  const [widths, setWidths] = useState<number[]>(Array(options.length).fill(0));
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);

  const selectedIdx = options.findIndex((o) => o.value === value);

  useEffect(() => {
    if (selectedIdx < 0) return;
    if (widths.some((w) => w === 0)) return;
    const targetX = widths.slice(0, selectedIdx).reduce((acc, w) => acc + w, 0);
    const targetW = widths[selectedIdx] ?? 0;
    indicatorX.value = withTiming(targetX, {
      duration: 220,
      easing: Easing.bezier(0.2, 0, 0, 1),
    });
    indicatorW.value = withTiming(targetW, {
      duration: 220,
      easing: Easing.bezier(0.2, 0, 0, 1),
    });
  }, [selectedIdx, widths, indicatorX, indicatorW]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  // Use `surface` not `bgElevated` — surface is meaningfully lighter than the
  // surfaceSunken track bg in both themes, giving the active pill real lift.
  const fillColor = accentColor ?? theme.colors.surface;

  const onSegmentLayout = (i: number) => (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidths((prev) => {
      if (prev[i] === w) return prev;
      const next = [...prev];
      next[i] = w;
      return next;
    });
  };

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radius.lg,
          padding: 4,
          position: 'relative',
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 4,
            bottom: 4,
            left: 4,
            backgroundColor: fillColor,
            borderRadius: theme.radius.md,
            ...theme.elevation.sm,
          },
          indicatorStyle,
        ]}
      />
      {options.map((opt, i) => {
        const isSelected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (!isSelected) {
                haptics.selection();
                onChange(opt.value);
              }
            }}
            onLayout={onSegmentLayout(i)}
            style={{
              flex: 1,
              paddingVertical: theme.spacing.sm + 2,
              alignItems: 'center',
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={opt.label}
          >
            <Text
              variant={isSelected ? 'bodySemiBold' : 'bodySmMedium'}
              style={{
                color: isSelected ? theme.colors.text : theme.colors.textMuted,
                fontSize: 13,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}