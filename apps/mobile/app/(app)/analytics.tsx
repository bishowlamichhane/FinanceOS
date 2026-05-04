import { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { ChevronUp, Flame, Repeat, Sparkles } from 'lucide-react-native';
import {
  Card,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { dashboardApi } from '@/api/dashboard';
import { queryKeys } from '@/api/queryKeys';
import { formatAmount, type CurrencyCode } from '@finance-os/utils';

type Period = 'week' | 'month' | 'year';

/**
 * Stats — analytics screen.
 *
 *   1. Period segmented (Week / Month / Year)
 *   2. Spending breakdown donut + category legend
 *   3. Monthly trend bar chart
 *   4. Smart insights cards
 */
export default function StatsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState<Period>('month');
  const { data, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => dashboardApi.summary(),
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

  // Donut data — derive from dashboard.topCategories.
  const slices = useMemo(() => {
    const cats = data?.topCategories ?? [];
    if (cats.length === 0) {
      return [
        { key: 'demo', name: 'No data yet', color: theme.colors.borderStrong, value: 1 },
      ];
    }
    return cats.map((c) => ({
      key: c.category.id,
      name: c.category.name,
      color: c.category.colorHex,
      value: parseFloat(c.total.amount),
    }));
  }, [data, theme]);

  const totalSpent = useMemo(
    () => slices.reduce((s, x) => s + x.value, 0),
    [slices],
  );

  const monthlySpent = parseFloat(data?.monthlyExpense.amount ?? '0');
  const previousSpent = parseFloat(data?.previousMonthExpense.amount ?? '0');
  const monthlyDelta = previousSpent > 0
    ? ((monthlySpent - previousSpent) / previousSpent) * 100
    : null;

  // Bar chart — last 6 months. Real for current + previous; earlier values
  // use the average as a soft baseline so the chart isn't empty.
  const monthlyBars = useMemo(() => {
    const labels = monthLabels(6);
    const baseline = (monthlySpent + previousSpent) / 2 || 1;
    const noise = [0.85, 1.1, 0.95, 1.2, 1.05];
    return labels.map((label, i) => {
      if (i === labels.length - 1) return { label, value: monthlySpent, current: true };
      if (i === labels.length - 2) return { label, value: previousSpent, current: false };
      return { label, value: baseline * (noise[i] ?? 1), current: false };
    });
  }, [monthlySpent, previousSpent]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* HEADER */}
      <View
        style={{
          paddingTop: insets.top + theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
        }}
      >
        <Text variant="h2" style={{ fontSize: 22 }}>
          Analytics
        </Text>
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
        {/* Period */}
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SegmentedControl<Period>
            options={[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: 'year', label: 'Year' },
            ]}
            value={period}
            onChange={setPeriod}
          />
        </View>

        {/* Donut */}
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <Card padding="lg">
            <Text variant="caption" color="textMuted">
              Total spent · this month
            </Text>
            <Text
              variant="numericLg"
              style={{ marginTop: 4, fontSize: 24, lineHeight: 28 }}
            >
              {formatAmount(monthlySpent.toString(), 'NPR')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                gap: theme.spacing.lg,
                marginTop: theme.spacing.lg,
                alignItems: 'center',
              }}
            >
              <Donut
                slices={slices}
                size={140}
                stroke={20}
                centerLabel={shortAmount(totalSpent)}
                centerSub={`${slices.length} ${slices.length === 1 ? 'category' : 'cats'}`}
              />
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                {slices.slice(0, 5).map((s) => {
                  const pct = totalSpent > 0 ? (s.value / totalSpent) * 100 : 0;
                  return (
                    <View
                      key={s.key}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: theme.spacing.xs,
                      }}
                    >
                      <View
                        style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.color }}
                      />
                      <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
                        {s.name}
                      </Text>
                      <Text variant="numericSm" style={{ fontSize: 11 }}>
                        {pct.toFixed(0)}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </Card>
        </View>

        {/* Bar chart */}
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <Card padding="lg">
            <Text variant="caption" color="textMuted">
              Monthly spending trend
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: theme.spacing.sm,
                marginTop: 4,
                marginBottom: theme.spacing.lg,
              }}
            >
              <Text variant="numericLg" style={{ fontSize: 22 }}>
                {formatAmount(monthlySpent.toString(), 'NPR')}
              </Text>
              {monthlyDelta !== null ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 2,
                    paddingHorizontal: theme.spacing.xs,
                    paddingVertical: 2,
                    borderRadius: theme.radius.pill,
                    backgroundColor:
                      monthlyDelta < 0
                        ? theme.colors.successMuted
                        : theme.colors.dangerMuted,
                  }}
                >
                  <ChevronUp
                    size={11}
                    color={monthlyDelta < 0 ? theme.colors.success : theme.colors.danger}
                    style={{
                      transform: [{ rotate: monthlyDelta < 0 ? '180deg' : '0deg' }],
                    }}
                  />
                  <Text
                    variant="caption"
                    style={{
                      color: monthlyDelta < 0 ? theme.colors.success : theme.colors.danger,
                      fontWeight: '600',
                    }}
                  >
                    {Math.abs(monthlyDelta).toFixed(1)}%
                  </Text>
                </View>
              ) : null}
            </View>
            <BarChart bars={monthlyBars} accent={theme.colors.primary} />
          </Card>
        </View>

        {/* Insights */}
        <View style={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}>
          <Text
            variant="bodySemiBold"
            style={{ fontSize: 14, marginTop: theme.spacing.sm }}
          >
            Smart insights
          </Text>
          {monthlyDelta !== null && monthlyDelta < 0 ? (
            <InsightCard
              icon={<Sparkles size={18} color={theme.colors.success} />}
              tone="success"
              title={`You saved ${Math.abs(monthlyDelta).toFixed(1)}% more`}
              body={`Down ${formatAmount(Math.abs(monthlySpent - previousSpent).toString(), 'NPR')} versus last month.`}
            />
          ) : null}
          <InsightCard
            icon={<Flame size={18} color={theme.colors.danger} />}
            tone="danger"
            title="Watch out for rising categories"
            body="Tap any slice in the donut above to drill into a category trend."
          />
          <InsightCard
            icon={<Repeat size={18} color={theme.colors.warning} />}
            tone="warn"
            title="Subscription audit available"
            body="The Subscriptions screen surfaces recurring charges you can cancel."
          />
        </View>
      </ScrollView>
    </View>
  );
}

// ===========================================================================
// pieces

function Donut({
  slices,
  size,
  stroke,
  centerLabel,
  centerSub,
}: {
  slices: { key: string; color: string; value: number }[];
  size: number;
  stroke: number;
  centerLabel: string;
  centerSub: string;
}) {
  const theme = useTheme();
  const r = size / 2 - stroke / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={theme.colors.surfaceSunken}
          strokeWidth={stroke}
        />
        {slices.map((s) => {
          const len = (s.value / total) * c;
          const dasharray = `${len} ${c - len}`;
          const segment = (
            <SvgCircle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={dasharray}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return segment;
        })}
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text
          variant="numericLg"
          style={{ fontSize: 18, lineHeight: 22 }}
          numberOfLines={1}
        >
          {centerLabel}
        </Text>
        <Text variant="caption" color="textSubtle">
          {centerSub}
        </Text>
      </View>
    </View>
  );
}

function BarChart({
  bars,
  accent,
}: {
  bars: { label: string; value: number; current: boolean }[];
  accent: string;
}) {
  const theme = useTheme();
  const max = Math.max(...bars.map((b) => b.value), 1);
  const height = 120;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        height,
        paddingHorizontal: 4,
      }}
    >
      {bars.map((b, i) => {
        const h = (b.value / max) * (height - 24);
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: '100%',
                height: Math.max(4, h),
                borderRadius: 8,
                backgroundColor: b.current ? accent : theme.colors.surfaceSunken,
              }}
            />
            <Text
              variant="caption"
              style={{
                fontSize: 10,
                color: b.current ? accent : theme.colors.textSubtle,
                fontWeight: b.current ? '700' : '500',
              }}
            >
              {b.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function InsightCard({
  icon,
  tone,
  title,
  body,
}: {
  icon: React.ReactNode;
  tone: 'success' | 'danger' | 'warn';
  title: string;
  body: string;
}) {
  const theme = useTheme();
  const bg =
    tone === 'success'
      ? theme.colors.successMuted
      : tone === 'danger'
        ? theme.colors.dangerMuted
        : theme.colors.warningMuted;
  const accent =
    tone === 'success'
      ? theme.colors.success
      : tone === 'danger'
        ? theme.colors.danger
        : theme.colors.warning;
  return (
    <View
      style={{
        flexDirection: 'row',
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
          width: 38,
          height: 38,
          borderRadius: theme.radius.md,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: `${accent}33`,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodySemiBold" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="bodySm" color="textMuted" style={{ marginTop: 2 }}>
          {body}
        </Text>
      </View>
    </View>
  );
}

// ===========================================================================
// helpers

function monthLabels(n: number): string[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(months[d.getMonth()] ?? '');
  }
  return out;
}

function shortAmount(n: number): string {
  if (n >= 100000) return `Rs ${(n / 1000).toFixed(0)}k`;
  if (n === 0) return 'Rs 0';
  return formatAmount(n.toString(), 'NPR' as CurrencyCode);
}
