import { Pressable, View, type ViewStyle, type StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, X } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';
import { Text } from './Text';
import type { ReactNode } from 'react';

export type ScreenHeaderProps = {
  /** Center-aligned title. */
  title?: string;

  /** Smaller text shown under the title. */
  subtitle?: string;

  /**
   * Left button:
   *   'back' (default if onBack provided) — chevron-left icon
   *   'close' — X icon (use for modal-style screens)
   *   'none' — render nothing on the left
   *   custom ReactNode — your own element
   */
  left?: 'back' | 'close' | 'none' | ReactNode;

  /** Called when the left button is pressed. Required if `left` is 'back' or 'close'. */
  onBack?: () => void;

  /** Right element. Pass a button, a text link, or null. */
  right?: ReactNode;

  /**
   * Title alignment. Default 'center' (iOS-style).
   * Use 'left' for the home/dashboard tab where the title is often a greeting.
   */
  align?: 'left' | 'center';

  /** Larger title style — used for tab roots ("Activity", "More"). Default false. */
  large?: boolean;

  /** Hide the bottom border. */
  hairline?: boolean;

  style?: StyleProp<ViewStyle>;
};

/**
 * ScreenHeader — consistent top of every screen.
 *
 *   <ScreenHeader title="Activity" large align="left" />
 *
 *   <ScreenHeader
 *     title="Add transaction"
 *     left="close"
 *     onBack={() => router.back()}
 *   />
 *
 *   <ScreenHeader
 *     title="Salary account"
 *     onBack={() => router.back()}
 *     right={<Pressable onPress={menu}><MoreHorizontal /></Pressable>}
 *   />
 */
export function ScreenHeader({
  title,
  subtitle,
  left,
  onBack,
  right,
  align = 'center',
  large = false,
  hairline = false,
  style,
}: ScreenHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Resolve left content
  let leftContent: ReactNode = null;
  if (left === 'back' || (left === undefined && onBack)) {
    leftContent = (
      <HeaderButton
        onPress={() => {
          if (onBack) {
            haptics.tap();
            onBack();
          }
        }}
        icon={<ChevronLeft size={20} color={theme.colors.text} />}
        accessibilityLabel="Back"
      />
    );
  } else if (left === 'close') {
    leftContent = (
      <HeaderButton
        onPress={() => {
          if (onBack) {
            haptics.tap();
            onBack();
          }
        }}
        icon={<X size={20} color={theme.colors.text} />}
        accessibilityLabel="Close"
      />
    );
  } else if (left && left !== 'none') {
    leftContent = left;
  }

  // For balance with no right content
  const showRightSpacer = !right && (leftContent !== null);

  return (
    <View
      style={[
        {
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.xl,
          paddingBottom: theme.spacing.md,
          backgroundColor: theme.colors.bg,
          borderBottomWidth: hairline ? 1 : 0,
          borderBottomColor: theme.colors.borderSubtle,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 40,
        }}
      >
        <View style={{ minWidth: 40, alignItems: 'flex-start' }}>{leftContent}</View>

        <View
          style={{
            flex: 1,
            alignItems: align === 'center' ? 'center' : 'flex-start',
            paddingHorizontal: align === 'center' ? theme.spacing.sm : theme.spacing.md,
          }}
        >
          {title ? (
            <Text variant={large ? 'h2' : 'h4'} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text variant="bodySm" color="textMuted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={{ minWidth: 40, alignItems: 'flex-end' }}>
          {right ?? (showRightSpacer ? <View style={{ width: 40 }} /> : null)}
        </View>
      </View>
    </View>
  );
}

function HeaderButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {icon}
    </Pressable>
  );
}