import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SectionList,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Filter, Search } from 'lucide-react-native';
import {
  Card,
  EmptyState,
  ErrorState,
  ScreenHeader,
  SegmentedControl,
  SkeletonList,
  Text,
  TransactionItem,
} from '@/components/ui';
import { useTransactions } from '@/hooks/useTransactions';
import { useTheme } from '@/theme/ThemeProvider';
import { apiErrorMessage } from '@/api/queryClient';
import {
  transactionDirection,
  type Transaction,
  type TransactionType,
} from '@finance-os/contracts';
import { formatAmount, type CurrencyCode } from '@finance-os/utils';

type Filter = 'all' | 'income' | 'expense';

/**
 * Transactions — full activity list.
 *
 *   1. Header with back chevron + "Transactions" title
 *   2. Search input (filters by description / merchant)
 *   3. Segmented filter (All / Income / Expense)
 *   4. Two-up mini summary (Income / Expense for the visible window)
 *   5. Date-grouped list (Today / Yesterday / dated) with mint "Today" tint
 *   6. Cursor-paginated infinite scroll
 */
export default function TransactionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ accountId?: string }>();

  const accountFilter =
    typeof params.accountId === 'string' ? params.accountId : undefined;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const {
    data,
    error,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useTransactions({
    accountId: accountFilter,
    type: filter === 'all' ? undefined : filter,
  });

  const [refreshing, setRefreshing] = useState(false);
  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  const flat: Transaction[] = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return flat;
    const q = search.trim().toLowerCase();
    return flat.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        (t.merchant ?? '').toLowerCase().includes(q),
    );
  }, [flat, search]);

  const sections = useMemo(
    () => groupByDate(filtered, theme.colors.success, theme.colors.textMuted),
    [filtered, theme.colors.success, theme.colors.textMuted],
  );

  // Mini summary — sum of income + expense across the visible filtered set.
  const summary = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const tx of filtered) {
      const dir = transactionDirection(tx.type as TransactionType);
      const amt = parseFloat(tx.amount);
      if (!Number.isFinite(amt)) continue;
      if (dir === 'income') inc += amt;
      else if (dir === 'expense') exp += amt;
    }
    return { income: inc, expense: exp };
  }, [filtered]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScreenHeader title="Transactions" onBack={() => router.back()} />

      {/* Search */}
      <View style={{ paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            paddingHorizontal: theme.spacing.base,
            paddingVertical: theme.spacing.sm,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surfaceSunken,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Search size={16} color={theme.colors.textSubtle} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search transactions"
            placeholderTextColor={theme.colors.textSubtle}
            style={{
              flex: 1,
              padding: 0,
              color: theme.colors.text,
              ...theme.typography.bodyMedium,
            }}
            accessibilityLabel="Search transactions"
          />
          <Pressable hitSlop={6}>
            <Filter size={16} color={theme.colors.textSubtle} />
          </Pressable>
        </View>
      </View>

      {/* Filter segmented */}
      <View style={{ paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md }}>
        <SegmentedControl<Filter>
          options={[
            { value: 'all', label: 'All' },
            { value: 'income', label: 'Income' },
            { value: 'expense', label: 'Expenses' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {/* Two-up summary */}
      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          marginBottom: theme.spacing.md,
          flexDirection: 'row',
          gap: theme.spacing.sm,
        }}
      >
        <Card padding="md" style={{ flex: 1 }}>
          <Text variant="labelCapsSm" color="textMuted">
            INCOME
          </Text>
          <Text
            variant="numericLg"
            style={{
              color: theme.colors.success,
              fontSize: 18,
              lineHeight: 22,
              marginTop: 4,
            }}
            numberOfLines={1}
          >
            +{formatAmount(summary.income.toString(), 'NPR')}
          </Text>
        </Card>
        <Card padding="md" style={{ flex: 1 }}>
          <Text variant="labelCapsSm" color="textMuted">
            EXPENSES
          </Text>
          <Text
            variant="numericLg"
            style={{
              color: theme.colors.danger,
              fontSize: 18,
              lineHeight: 22,
              marginTop: 4,
            }}
            numberOfLines={1}
          >
            −{formatAmount(summary.expense.toString(), 'NPR')}
          </Text>
        </Card>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SkeletonList count={5} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, padding: theme.spacing.lg }}>
          <ErrorState
            title="Couldn't load transactions"
            description={apiErrorMessage(error, 'Pull down to retry.')}
            onRetry={() => void refetch()}
          />
        </View>
      ) : sections.length === 0 ? (
        <View style={{ flex: 1, padding: theme.spacing.lg, paddingTop: theme.spacing.huge }}>
          <EmptyState
            title={search ? 'No matches' : 'Nothing yet'}
            description={
              search
                ? 'Try a different search term.'
                : 'Your transactions will show up here once you add them.'
            }
            actionLabel={search ? undefined : 'Add transaction'}
            onAction={
              search ? undefined : () => router.push('/(app)/transaction-form')
            }
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: insets.bottom + theme.sizing.tabBarHeight + theme.spacing.huge,
          }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isRefetching}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          renderSectionHeader={({ section }) => (
            <Text
              variant="labelCaps"
              style={{
                color: section.tint,
                marginTop: theme.spacing.lg,
                marginBottom: theme.spacing.sm,
                paddingHorizontal: theme.spacing.xs,
                letterSpacing: 1,
              }}
            >
              {section.title.toUpperCase()}
            </Text>
          )}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.xs }} />}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.lg,
                borderWidth: 1,
                borderColor: theme.colors.borderSubtle,
                overflow: 'hidden',
              }}
            >
              <TransactionItem
                description={item.description}
                amount={item.amount}
                currency={item.currency as CurrencyCode}
                direction={transactionDirection(item.type as TransactionType)}
                categoryName={item.category?.name ?? null}
                categoryIcon={item.category?.icon ?? 'tag'}
                categoryColor={item.category?.colorHex}
                methodLabel={item.account?.name ?? undefined}
                onPress={() => router.push(`/(app)/transaction-form?id=${item.id}`)}
              />
            </View>
          )}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: theme.spacing.lg }}>
                <SkeletonList count={2} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

// ===========================================================================

type Section = {
  title: string;
  data: Transaction[];
  tint: string;
};

function groupByDate(
  items: Transaction[],
  todayTint: string,
  defaultTint: string,
): Section[] {
  if (items.length === 0) return [];
  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);
  const buckets = new Map<string, Transaction[]>();
  for (const tx of items) {
    const d = new Date(tx.date);
    const key = isoDate(d);
    const existing = buckets.get(key);
    if (existing) existing.push(tx);
    else buckets.set(key, [tx]);
  }
  const sorted = Array.from(buckets.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  return sorted.map(([key, data]) => {
    const d = new Date(key);
    let title: string;
    let tint = defaultTint;
    if (isSameDay(d, today)) {
      title = 'Today';
      tint = todayTint;
    } else if (isSameDay(d, yesterday)) {
      title = 'Yesterday';
    } else {
      title = d.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    }
    return { title, data, tint };
  });
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
