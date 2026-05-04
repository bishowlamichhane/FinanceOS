import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Banknote,
  Car,
  ChevronUp,
  Coins,
  Cpu,
  CreditCard,
  Filter,
  Home as HomeIcon,
  Landmark,
  Plus,
  Search,
  Shield,
  Sparkles,
  Tag,
  TrendingUp,
  Wallet as WalletIcon,
} from 'lucide-react-native';
import {
  Card,
  EmptyState,
  ErrorState,
  IconFor,
  SkeletonList,
  Stack,
  Text,
} from '@/components/ui';
import { useAccounts } from '@/hooks/useAccounts';
import { useAssets } from '@/hooks/useAssets';
import { useTheme } from '@/theme/ThemeProvider';
import { apiErrorMessage } from '@/api/queryClient';
import { haptics } from '@/lib/haptics';
import { formatAmount, type CurrencyCode } from '@finance-os/utils';
import type { Account, Asset, AssetType } from '@finance-os/contracts';

/**
 * Wallet — accounts + assets snapshot.
 *
 * Layout matches the design's net-worth screen:
 *   1. Custom tab header with title + Search/Filter
 *   2. Net worth hero card — Assets / Debt / Δ this month
 *   3. Bank Accounts section — full list of all linked accounts
 *   4. Add account dashed CTA
 *   5. Assets section — placeholder list (real assets module ships in Phase 3)
 */
export default function WalletScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    data,
    error,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useAccounts(false);

  const {
    data: assetsData,
    isLoading: assetsLoading,
    refetch: refetchAssets,
  } = useAssets(false);

  const [refreshing, setRefreshing] = useState(false);
  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchAssets()]);
    } finally {
      setRefreshing(false);
    }
  }

  const accounts = data?.accounts ?? [];
  const assets = assetsData?.items ?? [];
  const assetsTotalValue = assetsData
    ? parseFloat(assetsData.totals.totalValue.amount)
    : 0;

  // Net worth math:
  //   account balances (excluding credit/loan) + non-archived NPR asset values
  //   - credit/loan account balances
  const totals = useMemo(() => {
    let accountAssets = 0;
    let debt = 0;
    for (const a of accounts) {
      const bal = parseFloat(a.currentBalance);
      if (!Number.isFinite(bal)) continue;
      if (a.type === 'credit_card' || a.type === 'loan') {
        debt += Math.abs(bal);
      } else {
        accountAssets += bal;
      }
    }
    const totalAssets = accountAssets + assetsTotalValue;
    return { assets: totalAssets, debt, net: totalAssets - debt };
  }, [accounts, assetsTotalValue]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* ============== HEADER ============== */}
      <View
        style={{
          paddingTop: insets.top + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text variant="h2" style={{ fontSize: 22 }}>
          Accounts
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <SmallIconButton
            icon={<Search size={18} color={theme.colors.textMuted} />}
            onPress={() => haptics.tap()}
            label="Search"
          />
          <SmallIconButton
            icon={<Filter size={18} color={theme.colors.textMuted} />}
            onPress={() => haptics.tap()}
            label="Filter"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: theme.sizing.tabBarHeight + theme.spacing.huge,
          gap: theme.spacing.md,
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
        {/* ============== NET WORTH HERO ============== */}
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <Card padding="lg">
            <Text variant="labelCapsSm" color="textMuted">
              NET WORTH
            </Text>
            {isLoading ? (
              <SkeletonList count={1} />
            ) : (
              <Text
                variant="numericDisplay"
                style={{
                  fontSize: 30,
                  lineHeight: 36,
                  marginTop: theme.spacing.xs,
                }}
                numberOfLines={1}
              >
                {formatAmount(totals.net.toString(), 'NPR')}
              </Text>
            )}
            <View
              style={{
                flexDirection: 'row',
                gap: theme.spacing.lg,
                marginTop: theme.spacing.md,
              }}
            >
              <SplitStat
                label="Assets"
                value={formatAmount(totals.assets.toString(), 'NPR')}
                color={theme.colors.success}
              />
              <SplitStat
                label="Debt"
                value={formatAmount(totals.debt.toString(), 'NPR')}
                color={theme.colors.danger}
              />
              <SplitStat
                label="This month"
                value="+4.2%"
                color={theme.colors.success}
                icon={<ChevronUp size={11} color={theme.colors.success} />}
              />
            </View>
          </Card>
        </View>

        {/* ============== BANK ACCOUNTS ============== */}
        <Section title="Bank Accounts">
          {isLoading ? (
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              <SkeletonList count={3} />
            </View>
          ) : isError ? (
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              <ErrorState
                title="Couldn't load accounts"
                description={apiErrorMessage(error, 'Pull down to retry.')}
                onRetry={() => void refetch()}
              />
            </View>
          ) : accounts.length === 0 ? (
            <View
              style={{
                paddingHorizontal: theme.spacing.lg,
                paddingTop: theme.spacing.xl,
              }}
            >
              <EmptyState
                title="No accounts yet"
                description="Add a bank account, wallet, or cash to start tracking."
                actionLabel="Add account"
                onAction={() => router.push('/(app)/account-form')}
              />
            </View>
          ) : (
            <View
              style={{
                paddingHorizontal: theme.spacing.lg,
                gap: theme.spacing.sm,
              }}
            >
              {accounts.map((acct) => (
                <AccountListRow
                  key={acct.id}
                  account={acct}
                  onPress={() => router.push(`/(app)/account/${acct.id}`)}
                />
              ))}
            </View>
          )}

          {/* Add account dashed CTA */}
          <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.sm }}>
            <Pressable
              onPress={() => {
                haptics.tap();
                router.push('/(app)/account-form');
              }}
              style={({ pressed }) => ({
                paddingVertical: theme.spacing.md,
                borderRadius: theme.radius.lg,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: theme.colors.borderStrong,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.sm,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Plus size={16} color={theme.colors.textMuted} />
              <Text variant="bodySmMedium" color="textMuted">
                Link a new account
              </Text>
            </Pressable>
          </View>
        </Section>

        {/* ============== ASSETS ============== */}
        <Section
          title="Assets"
          actionLabel={assets.length > 0 ? 'Manage' : undefined}
          onAction={
            assets.length > 0
              ? () => {
                  haptics.tap();
                  router.push('/(app)/assets');
                }
              : undefined
          }
        >
          {assetsLoading ? (
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              <SkeletonList count={3} />
            </View>
          ) : assets.length === 0 ? (
            <View style={{ paddingHorizontal: theme.spacing.lg }}>
              <Pressable
                onPress={() => {
                  haptics.tap();
                  router.push('/(app)/assets');
                }}
                style={({ pressed }) => ({
                  paddingVertical: theme.spacing.lg,
                  paddingHorizontal: theme.spacing.base,
                  borderRadius: theme.radius.lg,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: theme.colors.borderStrong,
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Plus size={18} color={theme.colors.textMuted} />
                <Text variant="bodySmMedium" color="textMuted">
                  Track land, gold, vehicles, FDs…
                </Text>
                <Text variant="caption" color="textSubtle">
                  Each asset keeps its own valuation history
                </Text>
              </Pressable>
            </View>
          ) : (
            <View
              style={{
                paddingHorizontal: theme.spacing.lg,
                gap: theme.spacing.sm,
              }}
            >
              {assets.slice(0, 5).map((a) => (
                <AssetSummaryRow
                  key={a.id}
                  asset={a}
                  onPress={() => router.push('/(app)/assets')}
                />
              ))}
              {assets.length > 5 ? (
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    router.push('/(app)/assets');
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: theme.spacing.sm,
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text variant="bodySmMedium" color="primary">
                    See all {assets.length} assets
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

// ===========================================================================
// pieces

function SmallIconButton({
  icon,
  onPress,
  label,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  label: string;
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
    </Pressable>
  );
}

function SplitStat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          marginTop: 2,
        }}
      >
        {icon}
        <Text variant="numericMd" style={{ color, fontSize: 14 }} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function Section({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing.lg,
          marginTop: theme.spacing.sm,
        }}
      >
        <Text variant="bodySemiBold" style={{ fontSize: 14 }}>
          {title}
        </Text>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={6}>
            <Text variant="bodySmMedium" color="primary">
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function AccountListRow({
  account,
  onPress,
}: {
  account: Account;
  onPress: () => void;
}) {
  const theme = useTheme();
  const tint = account.colorHex ?? accountTint(account.type, theme);
  const balance = parseFloat(account.currentBalance);
  const isDebt = account.type === 'credit_card' || account.type === 'loan';

  const subtitleParts = [
    capitalize(account.type.replace(/_/g, ' ')),
    account.accountNumberLast4 ? `•• ${account.accountNumberLast4}` : null,
  ].filter(Boolean) as string[];

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.borderSubtle,
        opacity: pressed ? 0.85 : 1,
      })}
      accessibilityRole="button"
      accessibilityLabel={account.name}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radius.md,
          backgroundColor: `${tint}1F`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {account.icon ? (
          <IconFor iconKey={account.icon} size={20} color={tint} />
        ) : account.type === 'credit_card' ? (
          <CreditCard size={20} color={tint} />
        ) : account.type === 'cash' || account.type === 'wallet' ? (
          <WalletIcon size={20} color={tint} />
        ) : (
          <Landmark size={20} color={tint} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodySemiBold" numberOfLines={1}>
          {account.name}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {subtitleParts.join(' · ') || account.bankName || ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text
          variant="numericMd"
          style={{
            color: isDebt ? theme.colors.danger : theme.colors.text,
          }}
          numberOfLines={1}
        >
          {formatAmount(
            isDebt ? Math.abs(balance).toString() : balance.toString(),
            account.currency as CurrencyCode,
          )}
        </Text>
        <Text variant="caption" color="textSubtle">
          {account.currency}
        </Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Asset row — summary view inside the Wallet tab. Tapping routes to the
// dedicated /assets management screen.

function AssetSummaryRow({
  asset,
  onPress,
}: {
  asset: Asset;
  onPress: () => void;
}) {
  const theme = useTheme();
  const tint = assetTypeTint(asset.type, theme);
  const Icon = assetTypeIcon(asset.type);
  const isUp = asset.change.direction === 'up';
  const isDown = asset.change.direction === 'down';
  const deltaPct = asset.change.deltaPercent;

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.borderSubtle,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: theme.radius.md,
          backgroundColor: `${tint}1F`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={18} color={tint} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodySemiBold" numberOfLines={1}>
          {asset.name}
        </Text>
        <Text variant="caption" color="textMuted">
          {ASSET_TYPE_LABEL[asset.type]}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="numericMd" style={{ fontSize: 14 }} numberOfLines={1}>
          {compactAmount(parseFloat(asset.currentValue))}
        </Text>
        {deltaPct !== null ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
              marginTop: 2,
            }}
          >
            <ChevronUp
              size={10}
              color={
                isUp
                  ? theme.colors.success
                  : isDown
                    ? theme.colors.danger
                    : theme.colors.textMuted
              }
              style={{ transform: [{ rotate: isDown ? '180deg' : '0deg' }] }}
            />
            <Text
              variant="caption"
              style={{
                color: isUp
                  ? theme.colors.success
                  : isDown
                    ? theme.colors.danger
                    : theme.colors.textMuted,
                fontWeight: '600',
              }}
            >
              {Math.abs(deltaPct * 100).toFixed(1)}%
            </Text>
          </View>
        ) : (
          <Text variant="caption" color="textSubtle">
            New
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// ===========================================================================
// helpers

const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  cash: 'Cash',
  bank_balance: 'Bank balance',
  stock_portfolio: 'Stocks',
  fixed_deposit: 'Fixed deposit',
  gold: 'Gold',
  vehicle: 'Vehicle',
  property: 'Property',
  electronics: 'Electronics',
  crypto: 'Crypto',
  other: 'Other',
};

function assetTypeIcon(t: AssetType) {
  switch (t) {
    case 'cash': return Banknote;
    case 'bank_balance': return Landmark;
    case 'stock_portfolio': return TrendingUp;
    case 'fixed_deposit': return Shield;
    case 'gold': return Coins;
    case 'vehicle': return Car;
    case 'property': return HomeIcon;
    case 'electronics': return Cpu;
    case 'crypto': return Sparkles;
    case 'other':
    default: return Tag;
  }
}

function assetTypeTint(
  t: AssetType,
  theme: ReturnType<typeof useTheme>,
): string {
  switch (t) {
    case 'cash': return theme.colors.success;
    case 'bank_balance':
    case 'fixed_deposit':
      return theme.colors.primary;
    case 'stock_portfolio':
    case 'crypto':
      return theme.colors.info;
    case 'gold':
    case 'vehicle':
      return theme.colors.warning;
    case 'property':
      return theme.colors.asset;
    case 'electronics':
      return theme.colors.accent;
    case 'other':
    default:
      return theme.colors.textMuted;
  }
}

function accountTint(type: string, theme: ReturnType<typeof useTheme>): string {
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

function compactAmount(n: number): string {
  if (n >= 100000) {
    return `Rs ${(n / 1000).toFixed(n >= 1000000 ? 1 : 0)}k`;
  }
  return formatAmount(n.toString(), 'NPR');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
