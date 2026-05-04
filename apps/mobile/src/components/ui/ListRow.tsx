import {
    Pressable,
    View,
    type ViewStyle,
    type StyleProp,
  } from 'react-native';
  import { ChevronRight } from 'lucide-react-native';
  import { useTheme } from '@/theme/ThemeProvider';
  import { haptics } from '@/lib/haptics';
  import { Text } from './Text';
  import type { ReactNode } from 'react';
  
  export type ListRowProps = {
    /** Title text (required). */
    title: string;
    /** Optional secondary text below title. */
    subtitle?: string;
    /** Left-side leading element (icon, avatar, color dot). */
    leading?: ReactNode;
    /** Right-side trailing element. Pass a Text node, a value, etc. */
    trailing?: ReactNode;
    /** When true, render a chevron-right after trailing (or in trailing's place). */
    showChevron?: boolean;
    /** Tap handler. When set, the row gets press feedback. */
    onPress?: () => void;
    /** Reserve a 36×36 slot for leading even when no leading is passed (alignment). */
    reserveLeading?: boolean;
    /** Color the title in danger color (used for "Delete" rows etc). */
    intent?: 'default' | 'danger';
    /** Disabled visual + interaction. */
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
  };
  
  /**
   * ListRow — the standard row.
   *
   *   <ListRow
   *     leading={<IconCircle><Wallet /></IconCircle>}
   *     title="Salary account"
   *     subtitle="Nabil Bank · •••• 4421"
   *     trailing={<Text variant="numericMd">Rs 1,24,500</Text>}
   *     onPress={...}
   *   />
   *
   *   <ListRow title="Sign out" intent="danger" leading={<LogOut />} onPress={...} />
   *
   * Built-in: 56px height (consistent), 16px horizontal padding, leading slot
   * is 36×36 reserved width so titles always align even if some rows have no
   * leading element (when reserveLeading=true).
   */
  export function ListRow({
    title,
    subtitle,
    leading,
    trailing,
    showChevron,
    onPress,
    reserveLeading = false,
    intent = 'default',
    disabled,
    style,
  }: ListRowProps) {
    const theme = useTheme();
  
    const Container = onPress && !disabled ? Pressable : View;
  
    const titleColor = intent === 'danger' ? theme.colors.danger : theme.colors.text;
  
    return (
      <Container
        onPress={
          onPress && !disabled
            ? () => {
                haptics.tap();
                onPress();
              }
            : undefined
        }
        style={({ pressed }: { pressed?: boolean } = {}) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.base,
            paddingVertical: theme.spacing.md,
            gap: theme.spacing.md,
            minHeight: 56,
            opacity: pressed ? 0.6 : disabled ? 0.5 : 1,
          },
          style,
        ]}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityState={{ disabled: !!disabled }}
      >
        {leading ? (
          <View>{leading}</View>
        ) : reserveLeading ? (
          <View style={{ width: 36, height: 36 }} />
        ) : null}
  
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            variant="bodyMedium"
            style={{ color: titleColor }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodySm" color="textMuted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
  
        {trailing ? <View>{trailing}</View> : null}
  
        {showChevron ? (
          <ChevronRight size={18} color={theme.colors.textSubtle} />
        ) : null}
      </Container>
    );
  }