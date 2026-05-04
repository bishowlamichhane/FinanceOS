import type { ReactNode } from 'react';
import { View, Pressable, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Landmark, Wifi } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { haptics } from '@/lib/haptics';
import type { CurrencyCode } from '@finance-os/utils';

export type AccountCardAccent = 'blue' | 'orange' | 'emerald' | 'violet';

export type AccountCardProps = {
  /** Brand label, shown top-right (e.g. "Nabil Bank"). */
  bankName: string;
  /** Account-type caption, shown above the balance (e.g. "SAVINGS ACCOUNT"). */
  accountName: string;
  /** Last 4 digits, displayed as "•••• 4421" bottom-left. */
  last4?: string | null;
  /** Pre-formatted balance string, displayed as the hero numeric. */
  balance: string;
  currency: CurrencyCode;
  accent?: AccountCardAccent;
  /** Top-left icon disc. Defaults to Landmark. */
  icon?: ReactNode;
  /** Whether to render the contactless glyph bottom-right. Default true. */
  contactless?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

const ACCENT_GRADIENTS: Record<AccountCardAccent, [string, string]> = {
  blue: ['#1E3A8A', '#1E40AF'],
  orange: ['#7C2D12', '#9A3412'],
  emerald: ['#166534', '#15803D'],
  violet: ['#4C1D95', '#5B21B6'],
};

/**
 * AccountCard — vibrant gradient bank-card.
 *
 * Layout mirrors the Nepal-localized reference:
 *
 *   ┌──────────────────────────────────────┐
 *   │  [icon]                Nabil Bank    │
 *   │                                      │
 *   │  SAVINGS ACCOUNT                     │
 *   │  NPR 842,000.50                      │
 *   │                                      │
 *   │  •••• 4421               (((•        │
 *   └──────────────────────────────────────┘
 *
 * Used in the Accounts list and Account details. Cash/wallet/credit go
 * elsewhere — these gradient cards are reserved for bank-like accounts.
 */
export function AccountCard({
  bankName,
  accountName,
  last4,
  balance,
  currency,
  accent = 'blue',
  icon,
  contactless = true,
  onPress,
  style,
}: AccountCardProps) {
  const theme = useTheme();
  const [from, to] = ACCENT_GRADIENTS[accent];

  const content = (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          height: theme.sizing.accountCardHeight,
          borderRadius: theme.radius.xxl,
          padding: theme.spacing.xl,
          justifyContent: 'space-between',
          overflow: 'hidden',
          ...theme.elevation.md,
        },
        style,
      ]}
    >
      {/* Decorative blurred halo (bottom-right) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -32,
          top: -32,
          width: 128,
          height: 128,
          borderRadius: 64,
          backgroundColor: 'rgba(255,255,255,0.06)',
        }}
      />

      {/* Top row: icon disc (left) + bank label (right) */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: theme.radius.md,
            backgroundColor: 'rgba(255,255,255,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon ?? <Landmark size={18} color="#FFFFFF" />}
        </View>
        <Text
          variant="labelCapsSm"
          color="#FFFFFF"
          style={{ opacity: 0.65 }}
          numberOfLines={1}
        >
          {bankName}
        </Text>
      </View>

      {/* Middle: account-type caption + balance */}
      <View style={{ gap: theme.spacing.xs }}>
        <Text
          variant="labelCapsSm"
          color="#FFFFFF"
          style={{ opacity: 0.7 }}
          uppercase
          numberOfLines={1}
        >
          {accountName}
        </Text>
        <Text variant="numericXl" color="#FFFFFF" numberOfLines={1}>
          {balance}
        </Text>
      </View>

      {/* Bottom row: last4 (left) + contactless glyph (right) */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {last4 ? (
          <Text variant="mono" color="#FFFFFF" style={{ opacity: 0.55 }}>
            •••• {last4}
          </Text>
        ) : (
          <View />
        )}
        {contactless ? (
          <Wifi
            size={18}
            color="#FFFFFF"
            style={{ opacity: 0.35, transform: [{ rotate: '90deg' }] }}
          />
        ) : null}
      </View>
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${bankName} ${accountName} ${balance} ${currency}`}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}
