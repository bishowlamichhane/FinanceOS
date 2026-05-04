import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import {
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  IconFor,
  ScreenHeader,
  Section,
  Sheet,
  SkeletonList,
  Stack,
  Text,
  TransactionItem,
} from '@/components/ui';
import {
  useAccount,
  useDeleteAccount,
} from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useTheme } from '@/theme/ThemeProvider';
import { apiErrorMessage } from '@/api/queryClient';
import { haptics } from '@/lib/haptics';
import { formatAmount, type CurrencyCode } from '@finance-os/utils';
import {
  transactionDirection,
  type TransactionType,
} from '@finance-os/contracts';

/**
 * Account detail.
 *
 * Hero: full-bleed gradient header (account's color), large balance.
 * Content: filtered recent transactions for this account.
 * Actions: edit / delete via more-menu sheet.
 */
export default function AccountDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  const {
    data: account,
    error,
    isLoading,
    isError,
    refetch,
  } = useAccount(id);
  const { data: txData, refetch: refetchTx } = useTransactions({ accountId: id, limit: 20 });

  const transactions = useMemo(
    () => txData?.pages.flatMap((p) => p.items) ?? [],
    [txData],
  );

  const [refreshing, setRefreshing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const deleteMutation = useDeleteAccount();

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchTx()]);
    } finally {
      setRefreshing(false);
    }
  }

  async function onDelete() {
    if (!account) return;
    setMoreOpen(false);

    Alert.alert(
      `Delete ${account.name}?`,
      'This account has no transactions, so it can be removed permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(account.id);
              haptics.success();
              router.back();
            } catch (e) {
              haptics.error();
              Alert.alert('Could not delete', apiErrorMessage(e, ''));
            }
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <ScreenHeader title="" onBack={() => router.back()} />
        <View style={{ paddingHorizontal: theme.spacing.xl }}>
          <SkeletonList count={4} />
        </View>
      </View>
    );
  }

  if (isError || !account) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <ScreenHeader title="" onBack={() => router.back()} />
        <View style={{ flex: 1, padding: theme.spacing.xl }}>
          <ErrorState
            title="Couldn't load account"
            description={apiErrorMessage(error, 'Try again later.')}
            onRetry={() => void refetch()}
          />
        </View>
      </View>
    );
  }

  const tint = account.colorHex ?? theme.colors.primary;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScreenHeader
        title={account.name}
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={() => {
              haptics.tap();
              setMoreOpen(true);
            }}
            hitSlop={8}
            style={{
              width: 40,
              height: 40,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityLabel="More options"
          >
            <MoreHorizontal size={18} color={theme.colors.textMuted} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + theme.spacing.huge,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Hero header */}
        <View
          style={{
            marginHorizontal: theme.spacing.xl,
            padding: theme.spacing.xl,
            borderRadius: theme.radius.xxl,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: `${tint}33`,
            gap: theme.spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: theme.radius.pill,
                backgroundColor: `${tint}22`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconFor iconKey={account.icon} size={16} color={tint} />
            </View>
            <Text variant="bodySm" color="textMuted">
              {[
                account.bankName,
                account.accountNumberLast4 ? `•••• ${account.accountNumberLast4}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || prettyType(account.type)}
            </Text>
          </View>

          <Text variant="labelCaps" color="textMuted">
            BALANCE
          </Text>
          <Text variant="numericDisplay" style={{ fontSize: 36, lineHeight: 40 }}>
            {formatAmount(account.currentBalance, account.currency as CurrencyCode)}
          </Text>

          <View style={{ flexDirection: 'row', gap: theme.spacing.lg, marginTop: theme.spacing.xs }}>
            <View>
              <Text variant="caption" color="textMuted">
                Opening
              </Text>
              <Text variant="numericMd">
                {formatAmount(account.openingBalance, account.currency as CurrencyCode)}
              </Text>
            </View>
            <View>
              <Text variant="caption" color="textMuted">
                Currency
              </Text>
              <Text variant="numericMd">{account.currency}</Text>
            </View>
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: theme.spacing.xl,
            marginTop: theme.spacing.lg,
          }}
        >
          <Button
            label="Add transaction"
            variant="ghost"
            size="md"
            fullWidth
            onPress={() => router.push(`/(app)/transaction-form?accountId=${account.id}`)}
          />
        </View>

        <Section title="RECENT ACTIVITY" topGap="xl" style={{ paddingHorizontal: theme.spacing.xl }}>
          {transactions.length === 0 ? (
            <Card padding="lg" variant="outlined">
              <EmptyState
                compact
                title="No activity yet"
                description="Transactions on this account will show up here."
              />
            </Card>
          ) : (
            <Card padding="none">
              {transactions.slice(0, 10).map((tx, i) => {
                const dir = transactionDirection(tx.type as TransactionType);
                const directionForAccount =
                  tx.type === 'transfer' && tx.counterAccountId === account.id ? 'income' : dir;
                return (
                  <View key={tx.id}>
                    <TransactionItem
                      description={tx.description}
                      amount={tx.amount}
                      currency={tx.currency as CurrencyCode}
                      direction={directionForAccount}
                      categoryName={tx.category?.name ?? null}
                      categoryIcon={tx.category?.icon ?? 'tag'}
                      categoryColor={tx.category?.colorHex}
                      meta={new Date(tx.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                      onPress={() =>
                        router.push(`/(app)/transaction-form?id=${tx.id}`)
                      }
                    />
                    {i < Math.min(transactions.length, 10) - 1 ? (
                      <Divider insetStart={theme.spacing.base + 36 + theme.spacing.md} />
                    ) : null}
                  </View>
                );
              })}
            </Card>
          )}

          {transactions.length > 10 ? (
            <Button
              label="See all activity"
              variant="ghost"
              size="sm"
              onPress={() =>
                router.push(`/(app)/transactions?accountId=${account.id}`)
              }
              style={{ marginTop: theme.spacing.md }}
            />
          ) : null}
        </Section>
      </ScrollView>

      {/* More-menu sheet */}
      <Sheet visible={moreOpen} onDismiss={() => setMoreOpen(false)} title="Account options">
        <Stack gap="none">
          <Pressable
            onPress={() => {
              setMoreOpen(false);
              haptics.tap();
              router.push(`/(app)/account-form?id=${account.id}`);
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              paddingVertical: theme.spacing.md,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Pencil size={20} color={theme.colors.text} />
            <Text variant="bodyMedium">Edit</Text>
          </Pressable>
          <Divider />
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              paddingVertical: theme.spacing.md,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Trash2 size={20} color={theme.colors.danger} />
            <Text variant="bodyMedium" color="danger">
              Delete account
            </Text>
          </Pressable>
        </Stack>
      </Sheet>
    </View>
  );
}

function prettyType(t: string): string {
  switch (t) {
    case 'cash': return 'Cash';
    case 'bank_savings': return 'Savings';
    case 'bank_current': return 'Current';
    case 'fixed_deposit': return 'Fixed deposit';
    case 'wallet': return 'Wallet';
    case 'credit_card': return 'Credit card';
    case 'loan': return 'Loan';
    case 'investment': return 'Investment';
    default: return 'Account';
  }
}