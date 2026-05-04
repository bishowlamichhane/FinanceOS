import { useMemo } from 'react';
import { TextInput, View, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import type { CurrencyCode } from '@finance-os/utils';

export type AmountInputProps = {
  /** Stringified amount, e.g. "1200.50" — caller controls formatting. */
  value: string;
  onChangeText: (v: string) => void;
  currency: CurrencyCode;
  /** Tinted by direction: positive (success), negative (default), or neutral. */
  intent?: 'positive' | 'negative' | 'neutral';
  /** Optional hint shown below the input. */
  hint?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
};

const SYMBOLS: Record<CurrencyCode, string> = {
  NPR: 'Rs',
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * AmountInput — hero-sized numeric entry.
 *
 * Sanitizes input to digits + a single decimal point + max 2dp.
 * Caller handles validation (min/max range, parsing).
 */
export function AmountInput({
  value,
  onChangeText,
  currency,
  intent = 'neutral',
  hint,
  error,
  style,
}: AmountInputProps) {
  const theme = useTheme();

  const color = useMemo(() => {
    switch (intent) {
      case 'positive':
        return theme.colors.success;
      case 'negative':
      case 'neutral':
      default:
        return theme.colors.text;
    }
  }, [intent, theme]);

  const handleChange = (text: string) => {
    let cleaned = text.replace(/[^\d.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot >= 0) {
      cleaned =
        cleaned.slice(0, firstDot + 1) +
        cleaned.slice(firstDot + 1).replace(/\./g, '');
    }
    if (firstDot >= 0 && cleaned.length > firstDot + 3) {
      cleaned = cleaned.slice(0, firstDot + 3);
    }
    onChangeText(cleaned);
  };

  const symbol = SYMBOLS[currency] ?? currency;

  return (
    <View style={style}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: theme.spacing.sm,
        }}
      >
        <Text variant="numericLg" style={{ color: theme.colors.textMuted, fontSize: 22 }}>
          {symbol}
        </Text>
        <TextInput
          value={value}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={theme.colors.textSubtle}
          style={{
            ...theme.typography.numericDisplay,
            color,
            minWidth: 80,
            padding: 0,
            textAlign: 'center',
          }}
          accessibilityLabel={`Amount in ${currency}`}
        />
      </View>

      {error ? (
        <Text
          variant="bodySm"
          color="danger"
          align="center"
          style={{ marginTop: theme.spacing.sm }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          variant="bodySm"
          color="textMuted"
          align="center"
          style={{ marginTop: theme.spacing.sm }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}