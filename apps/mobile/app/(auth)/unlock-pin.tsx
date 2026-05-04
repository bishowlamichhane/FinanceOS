import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { Fingerprint, ScanFace } from 'lucide-react-native';
import { Text } from '@/components/ui';
import { PinKeypad } from '@/components/PinKeypad';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/state/auth';
import { haptics } from '@/lib/haptics';

const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 5;

/**
 * Unlock — PIN entry + biometric fast-path.
 *
 * On mount: if biometric is available, auto-prompts ONCE. If user dismisses
 * or it fails, they fall through to PIN entry. The biometric icon at the
 * bottom-left of the keypad re-triggers the prompt.
 */
export default function UnlockPinScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const verifyPin = useAuthStore((s) => s.verifyPin);
  const unlock = useAuthStore((s) => s.unlock);
  const signOut = useAuthStore((s) => s.signOut);
  const userName = useAuthStore((s) => s.user?.name ?? 'there');

  const [draft, setDraft] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'finger' | null>(null);
  const [autoTried, setAutoTried] = useState(false);

  // Detect biometric capability + type
  useEffect(() => {
    let alive = true;
    void (async () => {
      const has = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!alive) return;
      if (has && enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const isFace = types.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
        );
        setBiometricAvailable(true);
        setBiometricType(isFace ? 'face' : 'finger');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Auto-prompt biometric once on first mount
  useEffect(() => {
    if (biometricAvailable && !autoTried) {
      setAutoTried(true);
      void tryBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricAvailable]);

  async function tryBiometric() {
    haptics.tap();
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Finance OS',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: true,
      });
      if (result.success) {
        haptics.success();
        unlock();
        router.replace('/(app)');
      }
    } catch {
      /* ignore — user can fall back to PIN */
    }
  }

  async function checkPin(value: string) {
    const ok = await verifyPin(value);
    if (ok) {
      haptics.success();
      unlock();
      router.replace('/(app)');
      return;
    }
    haptics.error();
    setDraft('');
    const next = attempts + 1;
    setAttempts(next);
    if (next >= MAX_ATTEMPTS) {
      setError('Too many attempts. Please sign in again.');
      setTimeout(() => {
        void signOut();
        router.replace('/(auth)/welcome');
      }, 1200);
      return;
    }
    setError(
      `Incorrect PIN. ${MAX_ATTEMPTS - next} attempt${
        MAX_ATTEMPTS - next === 1 ? '' : 's'
      } left.`,
    );
  }

  useEffect(() => {
    if (draft.length === PIN_LENGTH) {
      void checkPin(draft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  function pressKey(digit: string) {
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
      <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="h2" align="center" style={{ fontSize: 24, lineHeight: 30 }}>
          Welcome back, {userName.split(' ')[0]}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          Enter your PIN to unlock.
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <PinKeypad
        filled={draft.length}
        length={PIN_LENGTH}
        onPressDigit={pressKey}
        onBackspace={backspace}
        error={error}
        bottomLeft={
          biometricAvailable ? (
            <Pressable
              onPress={tryBiometric}
              accessibilityRole="button"
              accessibilityLabel={
                biometricType === 'face' ? 'Unlock with Face ID' : 'Unlock with fingerprint'
              }
              style={({ pressed }) => ({
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: theme.colors.primaryMuted,
                borderWidth: 1,
                borderColor: `${theme.colors.primary}55`,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              {biometricType === 'face' ? (
                <ScanFace size={26} color={theme.colors.primary} />
              ) : (
                <Fingerprint size={26} color={theme.colors.primary} />
              )}
            </Pressable>
          ) : null
        }
      />

      <Pressable
        onPress={async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        }}
        hitSlop={8}
        style={{
          alignItems: 'center',
          paddingVertical: theme.spacing.md,
          marginTop: theme.spacing.lg,
        }}
      >
        <Text variant="bodySmMedium" color="textMuted">
          Use a different account
        </Text>
      </Pressable>
    </View>
  );
}
