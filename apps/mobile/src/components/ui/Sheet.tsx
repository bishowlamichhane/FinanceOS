import { useEffect } from 'react';
import { Modal, Pressable, View, type ViewStyle, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export type SheetProps = ViewProps & {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  /** Optional sticky footer; receives the same horizontal padding */
  footer?: React.ReactNode;
  /** Set false to disable backdrop-dismiss */
  dismissOnBackdrop?: boolean;
  contentStyle?: ViewStyle;
};

/**
 * Sheet — bottom-anchored modal.
 *
 * Used for quick actions, add-transaction (Phase 2), filter pickers, etc.
 * Animates with a fade-in backdrop + slide-up content. Respects safe area.
 */
export function Sheet({
  visible,
  onDismiss,
  title,
  footer,
  dismissOnBackdrop = true,
  children,
  contentStyle,
  ...rest
}: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translate = useSharedValue(40);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: theme.motion.duration.base });
      translate.value = withTiming(0, {
        duration: theme.motion.duration.base,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      opacity.value = withTiming(0, { duration: theme.motion.duration.fast });
      translate.value = withTiming(40, { duration: theme.motion.duration.fast });
    }
  }, [visible, opacity, translate, theme]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      onRequestClose={onDismiss}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: theme.colors.overlay,
            justifyContent: 'flex-end',
          },
          backdropStyle,
        ]}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={dismissOnBackdrop ? onDismiss : undefined}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />

        <Animated.View
          {...rest}
          style={[
            {
              backgroundColor: theme.colors.bgElevated,
              borderTopLeftRadius: theme.radius.xxl,
              borderTopRightRadius: theme.radius.xxl,
              paddingTop: theme.spacing.md,
              paddingBottom: Math.max(insets.bottom, theme.spacing.xl),
              ...theme.elevation.xl,
            },
            sheetStyle,
            contentStyle,
          ]}
        >
          {/* drag handle */}
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.colors.borderStrong,
              marginBottom: theme.spacing.md,
            }}
          />

          {title ? (
            <Text
              variant="h4"
              align="center"
              style={{
                paddingHorizontal: theme.spacing.xl,
                marginBottom: theme.spacing.lg,
              }}
            >
              {title}
            </Text>
          ) : null}

          <View style={{ paddingHorizontal: theme.spacing.xl }}>{children}</View>

          {footer ? (
            <View
              style={{
                paddingHorizontal: theme.spacing.xl,
                paddingTop: theme.spacing.md,
                borderTopWidth: 1,
                borderColor: theme.colors.borderSubtle,
                marginTop: theme.spacing.lg,
              }}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
