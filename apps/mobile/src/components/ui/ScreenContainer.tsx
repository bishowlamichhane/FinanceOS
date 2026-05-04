import { useMemo } from 'react';
import {
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';

export type ScreenContainerProps = {
  /**
   * Render mode:
   *   'scroll' (default) — scrollable content, recommended for most screens
   *   'flex' — fixed layout, use when the screen has a list (FlatList/SectionList) inside
   *
   * If your screen has a list, set `flex` and let the list handle its own scrolling.
   */
  variant?: 'scroll' | 'flex';

  /** Apply default horizontal padding (24px). Pass false for full-bleed screens. */
  edgePadding?: boolean;

  /** Apply top safe-area inset. Default true. Set false when paired with a custom header. */
  applyTopInset?: boolean;

  /** Apply bottom safe-area inset. Default true. */
  applyBottomInset?: boolean;

  /** Extra padding above and beyond the safe area, e.g. for a tab bar offset. */
  bottomPadding?: number;

  /** Pass-through scroll view props when variant is 'scroll'. */
  scrollProps?: Omit<ScrollViewProps, 'children'>;

  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/**
 * ScreenContainer — root wrapper for every screen.
 *
 * Replaces the repeated `<View style={{ flex: 1, backgroundColor }}>` +
 * `useSafeAreaInsets` + `paddingHorizontal: theme.spacing.xl` pattern.
 *
 *   <ScreenContainer>
 *     <ScreenHeader title="Settings" />
 *     <Stack gap="lg">
 *       <Card>...</Card>
 *     </Stack>
 *   </ScreenContainer>
 */
export function ScreenContainer({
  variant = 'scroll',
  edgePadding = true,
  applyTopInset = false, // ScreenHeader handles top inset; default false here
  applyBottomInset = true,
  bottomPadding = 0,
  scrollProps,
  style,
  contentStyle,
  children,
}: ScreenContainerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const padTop = applyTopInset ? insets.top : 0;
  const padBottom = (applyBottomInset ? insets.bottom : 0) + bottomPadding;

  const paddingStyle = useMemo<ViewStyle>(
    () => ({
      paddingHorizontal: edgePadding ? theme.spacing.xl : 0,
      paddingTop: padTop,
      paddingBottom: padBottom,
    }),
    [edgePadding, padTop, padBottom, theme.spacing.xl],
  );

  if (variant === 'flex') {
    return (
      <View style={[{ flex: 1, backgroundColor: theme.colors.bg }, style]}>
        <View style={[{ flex: 1 }, paddingStyle, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: theme.colors.bg }, style]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        {...scrollProps}
        contentContainerStyle={[
          paddingStyle,
          scrollProps?.contentContainerStyle,
          contentStyle,
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}