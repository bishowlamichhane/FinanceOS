import { View, type ViewProps, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { SpacingToken } from '@finance-os/design-tokens';

export type StackProps = ViewProps & {
  /**
   * Direction. Defaults to 'vertical'.
   *   vertical → flexDirection: 'column'  (rows stacked top-to-bottom)
   *   horizontal → flexDirection: 'row'   (items side-by-side)
   */
  direction?: 'vertical' | 'horizontal';

  /** Gap between children. Use a spacing token, or default to 'md' (12px). */
  gap?: SpacingToken | number;

  /** Cross-axis alignment. */
  align?: 'start' | 'center' | 'end' | 'stretch';

  /** Main-axis distribution. */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

  /** Wrap children when they overflow (horizontal stacks). */
  wrap?: boolean;

  /** When true, children stretch to fill height/width. */
  fill?: boolean;

  style?: StyleProp<ViewStyle>;
};

const ALIGN_MAP: Record<NonNullable<StackProps['align']>, ViewStyle['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const JUSTIFY_MAP: Record<NonNullable<StackProps['justify']>, ViewStyle['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

/**
 * Stack — the layout primitive.
 *
 * Use this instead of `<View style={{ flexDirection, gap }}>` blocks. It
 * keeps spacing consistent across screens because gap values come from the
 * spacing scale, not arbitrary numbers.
 *
 *   <Stack gap="lg">
 *     <Card>...</Card>
 *     <Card>...</Card>
 *   </Stack>
 *
 *   <Stack direction="horizontal" gap="sm" align="center">
 *     <Icon />
 *     <Text>Hello</Text>
 *   </Stack>
 *
 * Why this exists: most "cards sticking together" bugs come from forgetting
 * to set parent gap. With Stack, the gap is baked into the wrapper so you
 * physically can't forget.
 */
export function Stack({
  direction = 'vertical',
  gap = 'md',
  align,
  justify,
  wrap,
  fill,
  style,
  children,
  ...rest
}: StackProps) {
  const theme = useTheme();
  const gapValue = typeof gap === 'number' ? gap : theme.spacing[gap];

  const layoutStyle: ViewStyle = {
    flexDirection: direction === 'horizontal' ? 'row' : 'column',
    gap: gapValue,
    alignItems: align ? ALIGN_MAP[align] : undefined,
    justifyContent: justify ? JUSTIFY_MAP[justify] : undefined,
    flexWrap: wrap ? 'wrap' : 'nowrap',
    ...(fill ? { flex: 1 } : {}),
  };

  return (
    <View style={[layoutStyle, style]} {...rest}>
      {children}
    </View>
  );
}