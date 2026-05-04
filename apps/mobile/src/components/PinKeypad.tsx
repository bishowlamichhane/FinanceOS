import { Pressable, View } from 'react-native';
import { Delete } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import type { ReactNode } from 'react';

export type PinKeypadProps = {
  /** Current PIN draft length (drives the dot indicator). */
  filled: number;
  /** Total PIN length (default 4). */
  length?: number;
  onPressDigit: (digit: string) => void;
  onBackspace: () => void;
  /** Optional left-of-zero key — used for the biometric button on the unlock screen. */
  bottomLeft?: ReactNode;
  /** Disable taps while submitting. */
  disabled?: boolean;
  /** Error message rendered above the keypad. */
  error?: string | null;
};

/**
 * PinKeypad — phone-dialer style 3-column grid with PIN dots above.
 *
 *   ●  ●  ○  ○
 *
 *   1   2   3
 *   4   5   6
 *   7   8   9
 *  [biom] 0  ⌫
 *
 * Uses flex: 1 on each key so widths are deterministic across screen sizes
 * (the old flexWrap+gap layout collapsed all keys onto one line on some
 * Android renders).
 */
export function PinKeypad({
  filled,
  length = 4,
  onPressDigit,
  onBackspace,
  bottomLeft,
  disabled,
  error,
}: PinKeypadProps) {
  const theme = useTheme();

  return (
    <View style={{ width: '100%', alignItems: 'center', gap: theme.spacing.xl }}>
      {/* PIN dots */}
      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing.md,
        }}
      >
        {Array.from({ length }).map((_, i) => {
          const isFilled = i < filled;
          return (
            <View
              key={i}
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: isFilled ? theme.colors.primary : 'transparent',
                borderWidth: 2,
                borderColor: isFilled ? theme.colors.primary : theme.colors.borderStrong,
              }}
            />
          );
        })}
      </View>

      {/* Error slot — fixed-height so the keypad doesn't jump */}
      <View style={{ height: 18, justifyContent: 'center' }}>
        {error ? (
          <Text variant="bodySm" color="danger" align="center">
            {error}
          </Text>
        ) : null}
      </View>

      {/* Keypad — 4 rows of 3 keys each */}
      <View style={{ width: '100%', maxWidth: 320, gap: theme.spacing.sm }}>
        <KeyRow>
          <DigitKey digit="1" onPress={onPressDigit} disabled={disabled} />
          <DigitKey digit="2" onPress={onPressDigit} disabled={disabled} />
          <DigitKey digit="3" onPress={onPressDigit} disabled={disabled} />
        </KeyRow>
        <KeyRow>
          <DigitKey digit="4" onPress={onPressDigit} disabled={disabled} />
          <DigitKey digit="5" onPress={onPressDigit} disabled={disabled} />
          <DigitKey digit="6" onPress={onPressDigit} disabled={disabled} />
        </KeyRow>
        <KeyRow>
          <DigitKey digit="7" onPress={onPressDigit} disabled={disabled} />
          <DigitKey digit="8" onPress={onPressDigit} disabled={disabled} />
          <DigitKey digit="9" onPress={onPressDigit} disabled={disabled} />
        </KeyRow>
        <KeyRow>
          {/* Bottom-left slot: biometric button on unlock, blank on create */}
          {bottomLeft ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              {bottomLeft}
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <DigitKey digit="0" onPress={onPressDigit} disabled={disabled} />
          <BackspaceKey
            onPress={onBackspace}
            disabled={disabled || filled === 0}
          />
        </KeyRow>
      </View>
    </View>
  );
}

// ===========================================================================

function KeyRow({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>{children}</View>
  );
}

function DigitKey({
  digit,
  onPress,
  disabled,
}: {
  digit: string;
  onPress: (d: string) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        haptics.tap();
        onPress(digit);
      }}
      disabled={disabled}
      android_ripple={{ color: theme.colors.borderSubtle, borderless: true }}
      style={({ pressed }) => ({
        flex: 1,
        height: 64,
        borderRadius: theme.radius.lg,
        backgroundColor: pressed ? theme.colors.surfaceElevated : theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.borderSubtle,
        alignItems: 'center',
        justifyContent: 'center',
      })}
      accessibilityRole="button"
      accessibilityLabel={`Digit ${digit}`}
    >
      <Text
        variant="numericLg"
        style={{ fontSize: 26, lineHeight: 30, color: theme.colors.text }}
      >
        {digit}
      </Text>
    </Pressable>
  );
}

function BackspaceKey({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        haptics.tap();
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        height: 64,
        borderRadius: theme.radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel="Backspace"
    >
      <Delete size={24} color={theme.colors.textMuted} />
    </Pressable>
  );
}
