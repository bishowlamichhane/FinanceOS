import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  PieChart,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react-native';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';

/**
 * Welcome — first impression. Big teal hero, 3 feature bullets, CTA bar.
 *
 * Mirrors the design's premium fintech aesthetic: teal gradient hero card
 * with brand mark, tagline, three trust signals, then primary CTA + sign-in
 * link at the bottom.
 */
export default function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.bg,
      }}
    >
      {/* Atmospheric teal glow — always-on background tint */}
      <LinearGradient
        colors={[
          theme.gradients.glow[0],
          theme.gradients.glow[1],
        ]}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60%',
        }}
        pointerEvents="none"
      />

      <View
        style={{
          flex: 1,
          paddingTop: insets.top + theme.spacing.lg,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
        }}
      >
        {/* ============== HERO CARD ============== */}
        <LinearGradient
          colors={theme.gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: theme.radius.xxl,
            padding: theme.spacing.xl,
            paddingTop: theme.spacing.xxl,
            paddingBottom: theme.spacing.xxl,
            overflow: 'hidden',
            ...theme.elevation.lg,
          }}
        >
          {/* Decorative orbs */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: -60,
              left: -30,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: 'rgba(255,255,255,0.05)',
            }}
          />

          {/* Brand mark */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              marginBottom: theme.spacing.xxl,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: theme.radius.md,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)',
              }}
            >
              <Wallet size={18} color="#FFFFFF" />
            </View>
            <Text
              variant="labelCaps"
              style={{ color: 'rgba(255,255,255,0.85)', letterSpacing: 1.4 }}
            >
              FINANCE OS · NEPAL
            </Text>
          </View>

          {/* Tagline */}
          <Text
            variant="display"
            style={{
              color: '#FFFFFF',
              fontSize: 36,
              lineHeight: 42,
            }}
          >
            Your money,{'\n'}all in one place.
          </Text>
          <Text
            variant="bodyLg"
            style={{
              color: 'rgba(255,255,255,0.85)',
              marginTop: theme.spacing.md,
              fontSize: 16,
              lineHeight: 24,
            }}
          >
            Track every rupee across banks, wallets, NEPSE holdings, and goals — built for how you actually live.
          </Text>
        </LinearGradient>

        {/* ============== TRUST BULLETS ============== */}
        <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.sm }}>
          <Bullet
            icon={<ShieldCheck size={18} color={theme.colors.success} />}
            tint={theme.colors.success}
            title="Bank-grade security"
            body="Argon2 password hashing, biometric unlock, encrypted on-device storage."
          />
          <Bullet
            icon={<PieChart size={18} color={theme.colors.primary} />}
            tint={theme.colors.primary}
            title="Real numbers, not vanity"
            body="Net worth, cash flow, category breakdowns — wired to your actual data."
          />
          <Bullet
            icon={<Sparkles size={18} color={theme.colors.warning} />}
            tint={theme.colors.warning}
            title="Built for Nepal"
            body="NPR-first, Nabil/Global IME/eSewa/Khalti — no foreign-bank assumptions."
          />
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* ============== ACTIONS ============== */}
        <View style={{ gap: theme.spacing.sm }}>
          <Button
            label="Create your account"
            variant="primary"
            size="lg"
            fullWidth
            rightIcon={
              <ArrowRight size={18} color={theme.colors.textOnPrimary} />
            }
            onPress={() => {
              haptics.tap();
              router.push('/(auth)/register');
            }}
            style={{
              borderRadius: theme.radius.lg,
              shadowColor: theme.colors.primary,
              shadowOpacity: 0.35,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          />
          <Pressable
            onPress={() => {
              haptics.tap();
              router.push('/(auth)/login');
            }}
            hitSlop={8}
            style={{
              alignItems: 'center',
              paddingVertical: theme.spacing.md,
            }}
          >
            <Text variant="bodyMedium" color="textMuted">
              Already have an account?{' '}
              <Text variant="bodySemiBold" color="primary">
                Sign in
              </Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ===========================================================================

function Bullet({
  icon,
  tint,
  title,
  body,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  body: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.borderSubtle,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: theme.radius.md,
          backgroundColor: `${tint}1F`,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: `${tint}33`,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodySemiBold" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="bodySm" color="textMuted">
          {body}
        </Text>
      </View>
    </View>
  );
}
