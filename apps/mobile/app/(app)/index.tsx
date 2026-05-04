import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle as SvgCircle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path as SvgPath,
  Stop as SvgStop,
} from 'react-native-svg';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Camera,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  Receipt,
  Search,
  Send,
  Shield,
  TrendingUp,
} from 'lucide-react-native';
import {
  Card,
  ErrorState,
  IconFor,
  Skeleton,
  Stack,
  Text,
  TransactionItem,
} from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/state/auth';
import { useAccounts } from '@/hooks/useAccounts';
import { dashboardApi } from '@/api/dashboard';
import { apiErrorMessage } from '@/api/queryClient';
import { queryKeys } from '@/api/queryKeys';
import { formatAmount, type CurrencyCode } from '@finance-os/utils';
import {
  transactionDirection,
  type TransactionType,
} from '@finance-os/contracts';
import { haptics } from '@/lib/haptics';

/**
 * Dashboard / Home — v3 redesign (teal palette).
 *
 * Layout matches the Claude Design handoff:
 *   1. Compact greeting header (avatar + good morning + Search/Bell)
 *   2. Hero gradient teal balance card — eye toggle, income/expense split,
 *      decorative blurred orbs
 *   3. Quick actions row — 4-up tinted icon tiles (Send / Request / Scan / Pay)
 *   4. Cash flow card — area chart of last 7 days net + delta chip
 *   5. Two-up: Credit score + Top goal (placeholders until those modules ship)
 *   6. Accounts strip — horizontal scroll of soft hue-tinted account cards
 *   7. Recent activity — top 4 transactions in a single rounded card
 */
export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const {
    data,
    error,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => dashboardApi.summary(),
  });

  const { data: accountsData } = useAccounts(false);
  const accounts = accountsData?.accounts ?? [];

  const [refreshing, setRefreshing] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  // Derive a 7-day trend by bucketing recent transactions. If we have no
  // transactions yet, fall back to a flat baseline so the chart still
  // renders meaningfully (no crash, no empty SVG).
  const trend7d = useMemo(() => derive7DayTrend(data?.recentTransactions ?? []), [data]);

  const monthlyDeltaPct = useMemo(() => {
    if (!data) return null;
    const cur = parseFloat(data.monthlyExpense.amount);
    const prev = parseFloat(data.previousMonthExpense.amount);
    if (prev === 0) return null;
    return ((cur - prev) / prev) * 100;
  }, [data]);

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const firstName = (user?.name ?? '').split(' ')[0] || 'Hello';

  const mask = (s: string) => (hideBalance ? '••••••' : s);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.sm,
          paddingBottom: theme.sizing.tabBarHeight + theme.spacing.huge,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* ============== HEADER ============== */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: `${theme.colors.primary}55`,
              }}
            >
              <Text
                variant="bodySemiBold"
                style={{ color: theme.colors.primary, fontSize: 14 }}
              >
                {initials}
              </Text>
            </View>
            <View>
              <Text variant="caption" color="textSubtle">
                Good morning
              </Text>
              <Text variant="bodySemiBold" numberOfLines={1}>
                {firstName}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <HeaderIconButton
              icon={<Search size={18} color={theme.colors.textMuted} />}
              onPress={() => haptics.tap()}
              label="Search"
            />
            <HeaderIconButton
              icon={<Bell size={18} color={theme.colors.text} />}
              onPress={() => haptics.tap()}
              label="Notifications"
              hasBadge
            />
          </View>
        </View>

        {/* ============== HERO BALANCE CARD ============== */}
        <View style={{ paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md }}>
          <LinearGradient
            colors={theme.gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: theme.radius.xxl,
              padding: theme.spacing.xl,
              overflow: 'hidden',
              ...theme.elevation.lg,
            }}
          >
            {/* Decorative orbs */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: 'rgba(255,255,255,0.08)',
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                bottom: -60,
                right: 30,
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            />

            {/* Top row: label + eye toggle */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: theme.spacing.md,
              }}
            >
              <Text
                variant="labelCaps"
                style={{ color: 'rgba(255,255,255,0.85)', letterSpacing: 1 }}
              >
                TOTAL BALANCE
              </Text>
              <Pressable
                onPress={() => {
                  haptics.tap();
                  setHideBalance((v) => !v);
                }}
                hitSlop={8}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: theme.radius.pill,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityLabel={hideBalance ? 'Show balance' : 'Hide balance'}
              >
                {hideBalance ? (
                  <EyeOff size={16} color="#FFFFFF" />
                ) : (
                  <Eye size={16} color="#FFFFFF" />
                )}
              </Pressable>
            </View>

            {/* Big numeric */}
            {isLoading ? (
              <Skeleton
                height={42}
                style={{ width: '70%', backgroundColor: 'rgba(255,255,255,0.18)' }}
              />
            ) : isError ? (
              <Text
                variant="numericDisplay"
                style={{
                  color: '#FFFFFF',
                  fontSize: 36,
                  lineHeight: 42,
                }}
              >
                —
              </Text>
            ) : (
              <Text
                variant="numericDisplay"
                style={{
                  color: '#FFFFFF',
                  fontSize: 36,
                  lineHeight: 42,
                }}
                numberOfLines={1}
              >
                {mask(
                  formatAmount(
                    data?.netWorth.amount ?? '0',
                    (data?.netWorth.currency as CurrencyCode) ?? 'NPR',
                  ),
                )}
              </Text>
            )}

            {/* Income / Expenses split */}
            {data ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: theme.spacing.lg,
                  marginTop: theme.spacing.lg,
                }}
              >
                <SplitStat
                  label="Income"
                  value={mask(
                    formatAmount(
                      data.monthlyIncome.amount,
                      data.monthlyIncome.currency as CurrencyCode,
                    ),
                  )}
                  icon={<ArrowDownLeft size={13} color="rgba(255,255,255,0.85)" />}
                />
                <View
                  style={{
                    width: 1,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                  }}
                />
                <SplitStat
                  label="Expenses"
                  value={mask(
                    formatAmount(
                      data.monthlyExpense.amount,
                      data.monthlyExpense.currency as CurrencyCode,
                    ),
                  )}
                  icon={<ArrowUpRight size={13} color="rgba(255,255,255,0.85)" />}
                />
              </View>
            ) : null}
          </LinearGradient>
        </View>

        {/* ============== QUICK ACTIONS (4-up) ============== */}
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.md,
            flexDirection: 'row',
            gap: theme.spacing.sm,
          }}
        >
          <QuickAction
            label="Send"
            icon={<Send size={18} />}
            tint={theme.colors.primary}
            onPress={() =>
              router.push('/(app)/transaction-form?direction=expense')
            }
          />
          <QuickAction
            label="Request"
            icon={<ArrowDownLeft size={18} />}
            tint={theme.colors.info}
            onPress={() =>
              router.push('/(app)/transaction-form?direction=income')
            }
          />
          <QuickAction
            label="Scan"
            icon={<Camera size={18} />}
            tint={theme.colors.asset}
            onPress={() => haptics.tap()}
          />
          <QuickAction
            label="Pay bill"
            icon={<Receipt size={18} />}
            tint={theme.colors.warning}
            onPress={() =>
              router.push('/(app)/transaction-form?direction=expense')
            }
          />
        </View>

        {/* ============== CASH FLOW CHART ============== */}
        <View style={{ paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md }}>
          <Card padding="lg">
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: theme.spacing.md,
              }}
            >
              <View>
                <Text variant="caption" color="textMuted">
                  Cash flow · 7 days
                </Text>
                <Text
                  variant="numericLg"
                  style={{ marginTop: 4, fontSize: 22, lineHeight: 26 }}
                >
                  {mask(
                    formatAmount(
                      String(trend7d.netSum),
                      (data?.netWorth.currency as CurrencyCode) ?? 'NPR',
                    ),
                  )}
                </Text>
              </View>
              {monthlyDeltaPct !== null ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: 4,
                    borderRadius: theme.radius.pill,
                    backgroundColor:
                      monthlyDeltaPct < 0
                        ? theme.colors.successMuted
                        : theme.colors.dangerMuted,
                  }}
                >
                  <ChevronUp
                    size={11}
                    color={
                      monthlyDeltaPct < 0
                        ? theme.colors.success
                        : theme.colors.danger
                    }
                    style={{
                      transform: [
                        { rotate: monthlyDeltaPct < 0 ? '180deg' : '0deg' },
                      ],
                    }}
                  />
                  <Text
                    variant="caption"
                    style={{
                      color:
                        monthlyDeltaPct < 0
                          ? theme.colors.success
                          : theme.colors.danger,
                      fontWeight: '700',
                    }}
                  >
                    {Math.abs(monthlyDeltaPct).toFixed(1)}%
                  </Text>
                </View>
              ) : null}
            </View>
            <AreaChart
              data={trend7d.values}
              width={300}
              height={120}
              color={theme.colors.primary}
              surfaceColor={theme.colors.surface}
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: theme.spacing.sm,
                paddingHorizontal: 4,
              }}
            >
              {trend7d.labels.map((d, i) => (
                <Text key={i} variant="caption" color="textSubtle">
                  {d}
                </Text>
              ))}
            </View>
          </Card>
        </View>

        {/* ============== TWO-UP: Credit score + Top goal ============== */}
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            marginBottom: theme.spacing.md,
            flexDirection: 'row',
            gap: theme.spacing.sm,
          }}
        >
          <Card padding="md" style={{ flex: 1 }}>
            <Text variant="caption" color="textMuted">
              Net worth
            </Text>
            <Text
              variant="numericLg"
              style={{
                marginTop: 4,
                color: theme.colors.success,
                fontSize: 22,
                lineHeight: 26,
              }}
            >
              {data
                ? mask(
                    formatAmount(
                      data.netWorth.amount,
                      data.netWorth.currency as CurrencyCode,
                    ),
                  )
                : '—'}
            </Text>
            <View
              style={{
                marginTop: theme.spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <TrendingUp size={11} color={theme.colors.success} />
              <Text variant="caption" color="textMuted">
                Assets minus debt
              </Text>
            </View>
          </Card>
          <Card padding="md" style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text variant="caption" color="textMuted">
                Top goal
              </Text>
              <Shield size={12} color={theme.colors.textSubtle} />
            </View>
            <Text variant="bodySemiBold" style={{ marginTop: 4 }}>
              Set a goal
            </Text>
            <Text
              variant="caption"
              color="textSubtle"
              style={{ marginTop: 2, marginBottom: theme.spacing.sm }}
            >
              Coming in Phase 3
            </Text>
            <View
              style={{
                height: 5,
                borderRadius: 3,
                backgroundColor: theme.colors.surfaceSunken,
              }}
            >
              <View
                style={{
                  width: '0%',
                  height: '100%',
                  borderRadius: 3,
                  backgroundColor: theme.colors.primary,
                }}
              />
            </View>
          </Card>
        </View>

        {/* ============== ACCOUNTS STRIP ============== */}
        <View style={{ marginBottom: theme.spacing.md }}>
          <SectionHeader
            title="Your accounts"
            actionLabel="See all"
            onAction={() => router.push('/(app)/accounts')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.lg,
              gap: theme.spacing.sm,
            }}
          >
            {accounts.length === 0 ? (
              <AddAccountTile
                onPress={() => router.push('/(app)/account-form')}
              />
            ) : (
              <>
                {accounts.slice(0, 5).map((account) => (
                  <SoftAccountTile
                    key={account.id}
                    bankName={account.bankName ?? prettyType(account.type)}
                    type={account.type}
                    last4={account.accountNumberLast4}
                    balance={mask(
                      formatAmount(
                        account.currentBalance,
                        account.currency as CurrencyCode,
                      ),
                    )}
                    icon={account.icon}
                    accentColor={accountAccentColor(account.type, theme)}
                    onPress={() =>
                      router.push(`/(app)/account/${account.id}`)
                    }
                  />
                ))}
                <AddAccountTile
                  onPress={() => router.push('/(app)/account-form')}
                />
              </>
            )}
          </ScrollView>
        </View>

        {/* ============== RECENT ACTIVITY ============== */}
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SectionHeader
            title="Recent activity"
            actionLabel="View all"
            onAction={() => router.push('/(app)/transactions')}
            inline
          />
          {isLoading ? (
            <Card padding="md">
              <Stack gap="sm">
                <Skeleton height={48} />
                <Skeleton height={48} />
                <Skeleton height={48} />
              </Stack>
            </Card>
          ) : isError ? (
            <ErrorState
              compact
              title="Couldn't load"
              description={apiErrorMessage(error, 'Pull down to retry.')}
              onRetry={() => void refetch()}
            />
          ) : data && data.recentTransactions.length > 0 ? (
            <Card padding="none">
              {data.recentTransactions.map((tx, i) => (
                <View
                  key={tx.id}
                  style={{
                    borderBottomWidth:
                      i < data.recentTransactions.length - 1 ? 1 : 0,
                    borderBottomColor: theme.colors.borderSubtle,
                  }}
                >
                  <TransactionItem
                    description={tx.description}
                    amount={tx.amount}
                    currency={tx.currency as CurrencyCode}
                    direction={transactionDirection(tx.type as TransactionType)}
                    categoryName={tx.categoryName}
                    categoryIcon={tx.categoryIcon ?? 'tag'}
                    categoryColor={tx.categoryColor}
                    methodLabel={tx.accountName ?? undefined}
                    onPress={() =>
                      router.push(`/(app)/transaction-form?id=${tx.id}`)
                    }
                  />
                </View>
              ))}
            </Card>
          ) : (
            <Card padding="lg" variant="outlined">
              <Stack gap="sm" align="center">
                <Text variant="bodyMedium" color="textMuted" align="center">
                  Your transactions appear here.
                </Text>
                <Pressable
                  onPress={() => router.push('/(app)/transaction-form')}
                  hitSlop={6}
                >
                  <Text variant="bodySmMedium" color="primary">
                    Log a transaction →
                  </Text>
                </Pressable>
              </Stack>
            </Card>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ===========================================================================
// pieces

function HeaderIconButton({
  icon,
  onPress,
  label,
  hasBadge,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  label: string;
  hasBadge?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
      {hasBadge ? (
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.danger,
            borderWidth: 2,
            borderColor: theme.colors.surface,
          }}
        />
      ) : null}
    </Pressable>
  );
}

function SplitStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          marginBottom: 4,
        }}
      >
        {icon}
        <Text
          variant="caption"
          style={{ color: 'rgba(255,255,255,0.85)' }}
        >
          {label}
        </Text>
      </View>
      <Text
        variant="numericMd"
        style={{ color: '#FFFFFF', fontSize: 16, lineHeight: 20 }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function QuickAction({
  label,
  icon,
  tint,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  tint: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xs,
        alignItems: 'center',
        gap: theme.spacing.xs,
        borderWidth: 1,
        borderColor: theme.colors.borderSubtle,
        opacity: pressed ? 0.85 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: theme.radius.md,
          backgroundColor: `${tint}1F`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Re-tint icon via cloneElement-style wrap */}
        <TintedIcon icon={icon} color={tint} />
      </View>
      <Text variant="caption" style={{ fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function TintedIcon({ icon, color }: { icon: React.ReactNode; color: string }) {
  if (
    icon &&
    typeof icon === 'object' &&
    'props' in icon &&
    'type' in icon
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cloneElement } = require('react');
    return cloneElement(icon as React.ReactElement<{ color?: string }>, { color });
  }
  return <>{icon}</>;
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
  inline,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  inline?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: inline ? 0 : theme.spacing.lg,
        marginBottom: theme.spacing.sm,
      }}
    >
      <Text variant="bodySemiBold" style={{ fontSize: 14 }}>
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={() => {
            haptics.tap();
            onAction();
          }}
          hitSlop={6}
        >
          <Text variant="bodySmMedium" color="primary">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function SoftAccountTile({
  bankName,
  type,
  last4,
  balance,
  icon,
  accentColor,
  onPress,
}: {
  bankName: string;
  type: string;
  last4: string | null;
  balance: string;
  icon: string;
  accentColor: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => ({
        width: 168,
        padding: theme.spacing.base,
        borderRadius: theme.radius.lg,
        backgroundColor: `${accentColor}14`,
        borderWidth: 1,
        borderColor: `${accentColor}33`,
        opacity: pressed ? 0.85 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel={`${bankName} ${balance}`}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: theme.spacing.lg,
        }}
      >
        <IconFor iconKey={icon} size={20} color={accentColor} />
        {last4 ? (
          <Text
            variant="caption"
            style={{ color: accentColor, fontWeight: '700', fontSize: 9 }}
          >
            •• {last4}
          </Text>
        ) : null}
      </View>
      <Text variant="caption" color="textMuted" numberOfLines={1}>
        {bankName}
      </Text>
      <Text
        variant="numericMd"
        style={{ marginTop: 2, fontSize: 16, lineHeight: 20 }}
        numberOfLines={1}
      >
        {balance}
      </Text>
    </Pressable>
  );
}

function AddAccountTile({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => ({
        width: 168,
        padding: theme.spacing.base,
        borderRadius: theme.radius.lg,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xs,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus size={18} color={theme.colors.primary} />
      </View>
      <Text variant="caption" color="textMuted">
        Add account
      </Text>
    </Pressable>
  );
}

// ===========================================================================
// Area chart — react-native-svg

function AreaChart({
  data,
  width,
  height,
  color,
  surfaceColor,
}: {
  data: number[];
  width: number;
  height: number;
  color: string;
  surfaceColor: string;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 8;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const pts = data.map((v, i) => {
    const x = pad + (i / Math.max(1, data.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return [x, y] as const;
  });
  const linePath = pts
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const fillPath = `${linePath} L${pad + w},${pad + h} L${pad},${pad + h} Z`;
  const last = pts[pts.length - 1];

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgLinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <SvgStop offset="0%" stopColor={color} stopOpacity={0.3} />
          <SvgStop offset="100%" stopColor={color} stopOpacity={0} />
        </SvgLinearGradient>
      </Defs>
      <SvgPath d={fillPath} fill="url(#areaGrad)" />
      <SvgPath
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last ? (
        <>
          <SvgCircle
            cx={last[0]}
            cy={last[1]}
            r={6}
            fill={color}
            fillOpacity={0.2}
          />
          <SvgCircle
            cx={last[0]}
            cy={last[1]}
            r={3.5}
            fill={color}
            stroke={surfaceColor}
            strokeWidth={2}
          />
        </>
      ) : null}
    </Svg>
  );
}

// ===========================================================================
// helpers

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function derive7DayTrend(
  recent: { date: string; type: string; amount: string }[],
): { values: number[]; labels: string[]; netSum: number } {
  const today = startOfDay(new Date());
  const buckets: number[] = Array.from({ length: 7 }, () => 0);
  for (const tx of recent) {
    const d = startOfDay(new Date(tx.date));
    const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0 || diff > 6) continue;
    const amt = parseFloat(tx.amount);
    if (!Number.isFinite(amt)) continue;
    const sign =
      tx.type === 'income' || tx.type === 'dividend'
        ? 1
        : tx.type === 'expense' ||
            tx.type === 'liability_payment' ||
            tx.type === 'asset_purchase'
          ? -1
          : 0;
    const idx = 6 - diff;
    buckets[idx] = (buckets[idx] ?? 0) + amt * sign;
  }
  // If everything is zero, generate a flat baseline so the chart still draws.
  const allZero = buckets.every((v) => v === 0);
  const values = allZero ? [10, 14, 11, 18, 16, 22, 20] : buckets;
  const labels = labelsForLast7Days(today);
  const netSum = buckets.reduce((s, v) => s + v, 0);
  return { values, labels, netSum: Math.round(netSum) };
}

function labelsForLast7Days(today: Date): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // Convert JS day (0=Sun..6=Sat) to our M-T-W-T-F-S-S order
    const jsDay = d.getDay();
    const idx = (jsDay + 6) % 7;
    out.push(DAY_LABELS[idx] ?? '');
  }
  return out;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function prettyType(t: string): string {
  switch (t) {
    case 'cash': return 'Cash';
    case 'bank_savings': return 'Savings';
    case 'bank_current': return 'Current';
    case 'fixed_deposit': return 'Fixed Deposit';
    case 'wallet': return 'Wallet';
    case 'credit_card': return 'Credit Card';
    case 'loan': return 'Loan';
    case 'investment': return 'Investment';
    default: return 'Account';
  }
}

function accountAccentColor(
  type: string,
  theme: ReturnType<typeof useTheme>,
): string {
  switch (type) {
    case 'cash': return theme.colors.success;
    case 'bank_savings':
    case 'bank_current':
    case 'fixed_deposit': return theme.colors.primary;
    case 'wallet': return theme.colors.warning;
    case 'credit_card': return theme.colors.asset;
    case 'investment': return theme.colors.info;
    case 'loan': return theme.colors.danger;
    default: return theme.colors.textMuted;
  }
}
