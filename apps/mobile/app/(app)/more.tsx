import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  BookOpen,
  Briefcase,
  ChevronRight,
  Database,
  FileDown,
  Folders,
  HelpCircle,
  KeyRound,
  Layers,
  LogOut,
  type LucideIcon,
  Moon,
  Receipt,
  Repeat,
  Shield,
  Smartphone,
  Sparkles,
  Sprout,
  Sun,
  Tags,
  Target,
  TrendingUp,
  User,
  Users,
  Wallet,
} from 'lucide-react-native';
import { Card, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useThemeControl } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/state/auth';
import { haptics } from '@/lib/haptics';
import type { ReactNode } from 'react';

/**
 * You — profile & settings hub.
 *
 * Layout matches the design's Profile screen:
 *   1. Profile header card — large avatar + name + email + Premium chip
 *   2. Stats row — Transactions / Goals / Streak (placeholder values for now)
 *   3. Three grouped settings cards: Account, Money, Preferences
 *   4. Sign out as a discrete row
 *   5. Versioned footer
 */
export default function YouScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { preference, setPreference } = useThemeControl();

  function cyclePreference() {
    haptics.tap();
    if (preference === 'system') setPreference('dark');
    else if (preference === 'dark') setPreference('light');
    else setPreference('system');
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          haptics.warn();
          await signOut();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  }

  const themeLabel =
    preference === 'system' ? 'Match system' : preference === 'dark' ? 'Dark' : 'Light';
  const ThemeIcon = preference === 'light' ? Sun : Moon;

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.md,
        paddingBottom: theme.sizing.tabBarHeight + theme.spacing.huge,
        gap: theme.spacing.md,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Page title */}
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <Text variant="h2" style={{ fontSize: 22 }}>
          Profile
        </Text>
      </View>

      {/* ============== PROFILE HEADER ============== */}
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <Card padding="lg" style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: `${theme.colors.primary}55`,
            }}
          >
            <Text
              variant="h3"
              style={{ color: theme.colors.primary, fontSize: 26 }}
            >
              {initials}
            </Text>
          </View>
          <Text variant="bodySemiBold" style={{ fontSize: 17 }} numberOfLines={1}>
            {user?.name ?? 'Guest'}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {user?.email ?? ''}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginTop: theme.spacing.xs,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: 4,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.primaryMuted,
              borderWidth: 1,
              borderColor: `${theme.colors.primary}55`,
            }}
          >
            <Shield size={11} color={theme.colors.primary} />
            <Text
              variant="labelCapsSm"
              style={{ color: theme.colors.primary, letterSpacing: 0.6 }}
            >
              FREE PLAN · MEMBER SINCE 2026
            </Text>
          </View>
        </Card>
      </View>

      {/* ============== STATS ROW ============== */}
      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          flexDirection: 'row',
          gap: theme.spacing.sm,
        }}
      >
        <StatTile value="—" label="Transactions" />
        <StatTile value="0" label="Goals" />
        <StatTile value="1mo" label="Streak" />
      </View>

      {/* ============== ACCOUNT GROUP ============== */}
      <SettingsGroup title="Account">
        <SettingRow
          icon={User}
          tint={theme.colors.primary}
          title="Personal information"
          onPress={() => haptics.tap()}
        />
        <SettingRow
          icon={Shield}
          tint={theme.colors.success}
          title="Linked banks"
          meta="—"
          onPress={() => router.push('/(app)/accounts')}
        />
        <SettingRow
          icon={TrendingUp}
          tint={theme.colors.info}
          title="Credit score"
          meta="—"
          onPress={() => haptics.tap()}
          isLast
        />
      </SettingsGroup>

      {/* ============== MONEY GROUP ============== */}
      <SettingsGroup title="Money">
        <SettingRow
          icon={Target}
          tint={theme.colors.primary}
          title="Budgets"
          onPress={() => router.push('/(app)/budget')}
        />
        <SettingRow
          icon={Briefcase}
          tint={theme.colors.asset}
          title="Assets"
          onPress={() => router.push('/(app)/assets')}
        />
        <SettingRow
          icon={Sprout}
          tint={theme.colors.success}
          title="Goals"
          phase="Phase 3"
          onPress={() => router.push('/(app)/goals')}
        />
        <SettingRow
          icon={Receipt}
          tint={theme.colors.warning}
          title="Bills"
          phase="Phase 5"
          onPress={() => router.push('/(app)/bills')}
        />
        <SettingRow
          icon={Repeat}
          tint={theme.colors.info}
          title="Subscriptions"
          phase="Phase 5"
          onPress={() => router.push('/(app)/subscriptions')}
        />
        <SettingRow
          icon={Folders}
          tint={theme.colors.warning}
          title="Categories"
          onPress={() => router.push('/(app)/categories')}
        />
        <SettingRow
          icon={Tags}
          tint={theme.colors.warning}
          title="Tags"
          onPress={() => router.push('/(app)/tags')}
        />
        <SettingRow
          icon={Users}
          tint={theme.colors.asset}
          title="Shared wallet"
          phase="Phase 5"
          onPress={() => router.push('/(app)/shared')}
        />
        <SettingRow
          icon={Layers}
          tint={theme.colors.asset}
          title="Investments"
          phase="Phase 4"
          onPress={() => router.push('/(app)/investments')}
          isLast
        />
      </SettingsGroup>

      {/* ============== PREFERENCES GROUP ============== */}
      <SettingsGroup title="Preferences">
        <SettingRow
          icon={ThemeIcon}
          tint={theme.colors.primary}
          title="Theme"
          meta={themeLabel}
          onPress={cyclePreference}
        />
        <SettingRow
          icon={Bell}
          tint={theme.colors.danger}
          title="Notifications"
          phase="Phase 5"
          onPress={() => haptics.tap()}
        />
        <SettingRow
          icon={KeyRound}
          tint={theme.colors.info}
          title="Security & privacy"
          phase="Phase 5"
          onPress={() => haptics.tap()}
        />
        <SettingRow
          icon={Smartphone}
          tint={theme.colors.info}
          title="Active sessions"
          phase="Phase 5"
          onPress={() => haptics.tap()}
        />
        <SettingRow
          icon={Wallet}
          tint={theme.colors.success}
          title="Currency"
          meta="NPR"
          onPress={() => haptics.tap()}
        />
        <SettingRow
          icon={Database}
          tint={theme.colors.success}
          title="Import history"
          phase="Phase 5"
          onPress={() => haptics.tap()}
        />
        <SettingRow
          icon={FileDown}
          tint={theme.colors.success}
          title="Export your data"
          phase="Phase 5"
          onPress={() => haptics.tap()}
        />
        <SettingRow
          icon={Sparkles}
          tint={theme.colors.warning}
          title="What's new"
          onPress={() => haptics.tap()}
        />
        <SettingRow
          icon={BookOpen}
          tint={theme.colors.textMuted}
          title="Help & support"
          onPress={() => haptics.tap()}
        />
        <SettingRow
          icon={HelpCircle}
          tint={theme.colors.textMuted}
          title="About Finance OS"
          onPress={() => haptics.tap()}
          isLast
        />
      </SettingsGroup>

      {/* ============== SIGN OUT ============== */}
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <Pressable
          onPress={confirmSignOut}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.sm,
            paddingVertical: theme.spacing.md,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            opacity: pressed ? 0.7 : 1,
          })}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <LogOut size={16} color={theme.colors.danger} />
          <Text variant="bodySemiBold" color="danger">
            Sign out
          </Text>
        </Pressable>
      </View>

      {/* Version footer */}
      <Text
        variant="caption"
        color="textSubtle"
        align="center"
        style={{ marginTop: theme.spacing.lg }}
      >
        Finance OS · v0.1.0 · Made for Nepal
      </Text>
    </ScrollView>
  );
}

// ===========================================================================
// pieces

function StatTile({ value, label }: { value: string; label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.borderSubtle,
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
      }}
    >
      <Text variant="numericLg" style={{ fontSize: 18, lineHeight: 22 }}>
        {value}
      </Text>
      <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: theme.spacing.lg }}>
      <Text
        variant="labelCapsSm"
        color="textMuted"
        style={{ marginBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.xxs }}
      >
        {title.toUpperCase()}
      </Text>
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.borderSubtle,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

function SettingRow({
  icon: Icon,
  tint,
  title,
  meta,
  phase,
  onPress,
  isLast,
}: {
  icon: LucideIcon;
  tint: string;
  title: string;
  meta?: string;
  phase?: string;
  onPress?: () => void;
  isLast?: boolean;
}) {
  const theme = useTheme();
  return (
    <>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {({ pressed }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.base,
              gap: theme.spacing.md,
              opacity: pressed ? 0.65 : 1,
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
              }}
            >
              <Icon size={18} color={tint} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodyMedium" numberOfLines={1}>
                {title}
              </Text>
            </View>
            {meta ? (
              <Text variant="bodySmMedium" color="textMuted" numberOfLines={1}>
                {meta}
              </Text>
            ) : phase ? (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: theme.colors.surfaceSunken,
                  borderWidth: 1,
                  borderColor: theme.colors.borderSubtle,
                }}
              >
                <Text
                  variant="labelCapsSm"
                  color="textSubtle"
                  style={{ fontSize: 9, letterSpacing: 0.6 }}
                >
                  {phase.toUpperCase()}
                </Text>
              </View>
            ) : null}
            {onPress ? (
              <ChevronRight size={16} color={theme.colors.textSubtle} />
            ) : null}
          </View>
        )}
      </Pressable>
      {!isLast ? (
        <View
          style={{
            height: 1,
            backgroundColor: theme.colors.borderSubtle,
            marginLeft: 36 + theme.spacing.base + theme.spacing.md,
          }}
        />
      ) : null}
    </>
  );
}
