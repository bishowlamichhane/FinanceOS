import { Pressable, View, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';
import { Text } from './Text';
import { IconFor } from './IconPicker';
import { formatAmount } from '@finance-os/utils';
import type { CurrencyCode } from '@finance-os/utils';

export type TransactionItemProps = {
  description: string;
  /** Raw amount string. The component prepends the sign based on direction. */
  amount: string;
  currency: CurrencyCode;
  /** Drives sign + color. */
  direction: 'income' | 'expense' | 'transfer' | 'neutral';
  categoryName?: string | null;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  /** Right side of the subtitle (legacy). Falls back when no methodLabel. */
  meta?: string;
  /** Label-caps line under the amount, e.g. "DEBIT CARD" or "NABIL BANK". */
  methodLabel?: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * TransactionItem — the row used in Activity, Dashboard, and Account detail.
 *
 * Layout:
 *
 *   ┌──┐  Bhat-Bhateni Supermarket               रू 4,250
 *   │○ │  GROCERIES • 2:45 PM                    DEBIT CARD
 *   └──┘
 *
 * - Icon container is a 44px rounded-md tile tinted by category color.
 * - Subtitle is rendered as label-caps for premium hierarchy.
 * - Amount uses numericLg with sign + color by direction.
 * - methodLabel is the optional sub-line under the amount (account/payment).
 */
export function TransactionItem({
  description,
  amount,
  currency,
  direction,
  categoryName,
  categoryIcon,
  categoryColor,
  meta,
  methodLabel,
  onPress,
  style,
}: TransactionItemProps) {
  const theme = useTheme();

  const amountColor =
    direction === 'income'
      ? theme.colors.success
      : direction === 'expense'
        ? theme.colors.text
        : theme.colors.textMuted;

  const tintColor = categoryColor ?? theme.colors.textSubtle;
  const subtitle =
    [categoryName, meta && !methodLabel ? meta : null]
      .filter(Boolean)
      .join(' • ') || ' ';
  const resolvedMethod = methodLabel ?? (meta && categoryName ? null : meta ?? null);

  const Container = onPress ? Pressable : View;

  return (
    <Container
      style={[
        {
          minHeight: theme.sizing.transactionRowHeight,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.base,
          paddingVertical: theme.spacing.sm,
          gap: theme.spacing.md,
        },
        style,
      ]}
      onPress={
        onPress
          ? () => {
              haptics.tap();
              onPress();
            }
          : undefined
      }
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radius.md,
          backgroundColor: `${tintColor}1F`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconFor iconKey={categoryIcon ?? 'tag'} size={20} color={tintColor} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodySemiBold" numberOfLines={1}>
          {description}
        </Text>
        <Text variant="labelCapsSm" color="textMuted" numberOfLines={1}>
          {subtitle.toUpperCase()}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text variant="numericMd" style={{ color: amountColor }} numberOfLines={1}>
          {direction === 'expense' ? '−' : direction === 'income' ? '+' : ''}
          {formatAmount(amount, currency)}
        </Text>
        {resolvedMethod ? (
          <Text variant="labelCapsSm" color="textSubtle" numberOfLines={1}>
            {resolvedMethod.toUpperCase()}
          </Text>
        ) : null}
      </View>
    </Container>
  );
}
