import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { PinKeypad } from '@/components/PinKeypad';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/state/auth';
import { haptics } from '@/lib/haptics';

const PIN_LENGTH = 4;
type Phase = 'create' | 'confirm';

/**
 * Create PIN — 4 digits, two-step (enter + confirm).
 * Uses the shared PinKeypad component (3-col phone-dialer grid).
 */
export default function CreatePinScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setPin = useAuthStore((s) => s.setPin);

  const [phase, setPhase] = useState<Phase>('create');
  const [draft, setDraft] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // When the user fills the first PIN, transition to confirm
  useEffect(() => {
    if (phase === 'create' && draft.length === PIN_LENGTH) {
      setFirst(draft);
      setDraft('');
      setPhase('confirm');
      haptics.tap();
    } else if (phase === 'confirm' && draft.length === PIN_LENGTH) {
      void confirmPin(draft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, phase]);

  async function confirmPin(value: string) {
    if (value !== first) {
      haptics.error();
      setError("PINs didn't match. Try again.");
      setDraft('');
      setFirst('');
      setPhase('create');
      return;
    }
    setSubmitting(true);
    try {
      await setPin(value);
      haptics.success();
      router.replace('/(app)');
    } catch (err) {
      haptics.error();
      setError(err instanceof Error ? err.message : 'Could not save PIN.');
      setDraft('');
      setFirst('');
      setPhase('create');
    } finally {
      setSubmitting(false);
    }
  }

  function pressKey(digit: string) {
    if (submitting) return;
    if (draft.length >= PIN_LENGTH) return;
    setError(null);
    setDraft((d) => d + digit);
  }

  function backspace() {
    setDraft((d) => d.slice(0, -1));
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.bg,
        paddingTop: insets.top + theme.spacing.xxl,
        paddingBottom: Math.max(insets.bottom, theme.spacing.xl),
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="h1" align="center" style={{ fontSize: 28, lineHeight: 34 }}>
          {phase === 'create' ? 'Create a PIN' : 'Confirm your PIN'}
        </Text>
        <Text
          variant="body"
          color="textMuted"
          align="center"
          style={{ maxWidth: 320 }}
        >
          {phase === 'create'
            ? 'A 4-digit PIN keeps your finances locked when your device is open.'
            : 'Enter the same PIN again to confirm.'}
        </Text>
      </View>

      {/* Spacer pushes the keypad toward the bottom-half of the screen */}
      <View style={{ flex: 1 }} />

      {/* Keypad */}
      <PinKeypad
        filled={draft.length}
        length={PIN_LENGTH}
        onPressDigit={pressKey}
        onBackspace={backspace}
        disabled={submitting}
        error={error}
      />

      {/* Skip */}
      <Pressable
        onPress={() => router.replace('/(app)')}
        hitSlop={8}
        style={{
          alignItems: 'center',
          paddingVertical: theme.spacing.md,
          marginTop: theme.spacing.lg,
        }}
      >
        <Text variant="bodySmMedium" color="textMuted">
          Skip for now
        </Text>
      </Pressable>
    </View>
  );
}
