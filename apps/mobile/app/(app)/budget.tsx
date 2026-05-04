import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  Check,
  Lightbulb,
  Plus,
  Sprout,
  Tag as TagIcon,
  Trash2,
  Wallet as WalletIcon,
} from 'lucide-react-native';
import {
  Button,
  EmptyState,
  ErrorState,
  IconFor,
  Sheet,
  SkeletonList,
  Stack,
  Text,
} from '@/components/ui';
import { CategoryPickerSheet } from '@/components/CategoryPickerSheet';
import {
  useBudgets,
  useCreateBudget,
  useDeleteBudget,
  useUpdateBudget,
} from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useTheme } from '@/theme/ThemeProvider';
import { apiErrorMessage } from '@/api/queryClient';
import { haptics } from '@/lib/haptics';
import { formatAmount, type CurrencyCode } from '@finance-os/utils';
import type { Budget, Category } from '@finance-os/contracts';

/**
 * Budget — monthly spending limits per category (or overall).
 *
 * Layout:
 *   1. Atmospheric brand glow at top
 *   2. Custom header: MONTHLY SUMMARY eyebrow + h1 "Budget Overview" +
 *      add (+) button on the right
 *   3. Remaining-balance hero — big green if remaining > 0, big rose if over
 *   4. Spending Categories card with per-budget progress rows
 *   5. Tip callouts (Spending Tip / Goal Progress) — derived from totals.utilization
 *   6. Sheet editor for create/edit (category picker, amount, delete)
 */
export default function BudgetScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useBudgets(false);

  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [adding, setAdding] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  const totals = data?.totals;
  const items = data?.items ?? [];
  const remainingNum = totals ? parseFloat(totals.remaining.amount) : 0;
  const isOverall = remainingNum < 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* Atmospheric glow */}
      <LinearGradient
        colors={theme.gradients.glow}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 360,
        }}
        pointerEvents="none"
      />

      {/* ============== HEADER ============== */}
      <View
        style={{
          paddingTop: insets.top + theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          paddingBottom: theme.spacing.lg,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="labelCaps" color="textMuted">
            MONTHLY SUMMARY
          </Text>
          <Text
            variant="numericDisplay"
            style={{ marginTop: theme.spacing.xxs, fontSize: 36, lineHeight: 42 }}
          >
            Budget Overview
          </Text>
        </View>
        <Pressable
          onPress={() => {
            haptics.tap();
            setAdding(true);
          }}
          hitSlop={8}
          style={{
            width: 44,
            height: 44,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.accentMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel="Add budget"
        >
          <Plus size={20} color={theme.colors.accent} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.xl,
          paddingBottom: theme.sizing.tabBarHeight + theme.spacing.huge,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
          />
        }
      >
        {isLoading ? (
          <SkeletonList count={4} />
        ) : isError ? (
          <ErrorState
            title="Couldn't load budgets"
            description={apiErrorMessage(error, 'Pull down to retry.')}
            onRetry={() => void refetch()}
          />
        ) : items.length === 0 ? (
          <View style={{ paddingTop: theme.spacing.huge }}>
            <EmptyState
              title="No budgets yet"
              description="Set spending limits per category to see them tracked here in real time."
              actionLabel="Create your first budget"
              onAction={() => setAdding(true)}
            />
          </View>
        ) : (
          <Stack gap="lg">
            {/* Remaining-balance hero */}
            {totals ? (
              <View style={{ marginBottom: theme.spacing.xs }}>
                <Text variant="bodySmMedium" color="textMuted">
                  Remaining balance
                </Text>
                <Text
                  variant="numericDisplay"
                  style={{
                    color: isOverall
                      ? theme.colors.danger
                      : theme.colors.success,
                    fontSize: 40,
                    lineHeight: 46,
                    marginTop: theme.spacing.xs,
                  }}
                  numberOfLines={1}
                >
                  {isOverall ? '−' : ''}
                  {formatAmount(
                    Math.abs(parseFloat(totals.remaining.amount)).toString(),
                    'NPR',
                  )}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    marginTop: theme.spacing.xs,
                  }}
                >
                  <Text variant="bodySm" color="textMuted">
                    {formatAmount(totals.spent.amount, 'NPR')} of{' '}
                    {formatAmount(totals.budgeted.amount, 'NPR')} spent
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Spending Categories card */}
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.xxl,
                padding: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.borderSubtle,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: theme.spacing.md,
                }}
              >
                <Text variant="h3">Spending Categories</Text>
                <Text variant="bodySmMedium" color="textMuted">
                  {items.length} active
                </Text>
              </View>
              <Stack gap="md">
                {items.map((b) => (
                  <BudgetRow key={b.id} budget={b} onPress={() => setEditing(b)} />
                ))}
              </Stack>
            </View>

            {/* Tip callouts — only show when relevant */}
            {totals && totals.utilization >= 0.8 ? (
              <Callout
                tint="warning"
                icon={<AlertTriangle size={18} color={theme.colors.warning} />}
                title="Nearing your limit"
                body={`You've used ${(totals.utilization * 100).toFixed(0)}% of this month's total budget.`}
              />
            ) : totals && totals.utilization < 0.5 ? (
              <Callout
                tint="success"
                icon={<Sprout size={18} color={theme.colors.success} />}
                title="On track"
                body="You're spending well within your monthly budget. Nice."
              />
            ) : null}

            <Callout
              tint="warm"
              icon={<Lightbulb size={18} color={theme.colors.warning} />}
              title="Spending tip"
              body="Local markets in Kathmandu Valley average 15-20% cheaper than supermarkets for groceries."
            />
          </Stack>
        )}
      </ScrollView>

      {/* Sheets */}
      <BudgetEditorSheet
        visible={adding}
        mode="create"
        onDismiss={() => setAdding(false)}
      />
      <BudgetEditorSheet
        visible={!!editing}
        mode="edit"
        budget={editing}
        onDismiss={() => setEditing(null)}
      />
    </View>
  );
}

// ===========================================================================

function BudgetRow({
  budget,
  onPress,
}: {
  budget: Budget;
  onPress: () => void;
}) {
  const theme = useTheme();
  const tintColor =
    budget.currentPeriod.state === 'over'
      ? theme.colors.danger
      : budget.currentPeriod.state === 'near_limit'
        ? theme.colors.warning
        : theme.colors.success;

  const utilizationPct = Math.min(budget.currentPeriod.utilization, 1.05);
  const labelText =
    budget.currentPeriod.state === 'over'
      ? 'Over budget'
      : `${(budget.currentPeriod.utilization * 100).toFixed(0)}% of limit`;

  const isOverall = budget.categoryId === null;
  const iconColor = budget.category?.colorHex ?? theme.colors.accent;
  const iconKey = budget.category?.icon ?? 'wallet';
  const name = budget.category?.name ?? 'Overall';

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: theme.spacing.md,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radius.md,
            backgroundColor: `${iconColor}1F`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconFor iconKey={iconKey} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text variant="bodySemiBold" numberOfLines={1}>
                {isOverall ? 'Overall budget' : name}
              </Text>
              <Text variant="caption" style={{ color: tintColor, marginTop: 2 }}>
                {labelText}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="numericMd">
                {formatAmount(budget.currentPeriod.spent.amount, 'NPR')}
              </Text>
              <Text variant="caption" color="textMuted">
                / {formatAmount(budget.amount, budget.currency as CurrencyCode)}
              </Text>
            </View>
          </View>
          {/* Progress bar */}
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: theme.colors.surfaceSunken,
              overflow: 'hidden',
              marginTop: theme.spacing.xs,
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${Math.max(2, utilizationPct * 100)}%`,
                backgroundColor: tintColor,
                borderRadius: 3,
              }}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function Callout({
  tint,
  icon,
  title,
  body,
}: {
  tint: 'warning' | 'success' | 'warm';
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const theme = useTheme();
  const bg =
    tint === 'warning'
      ? theme.colors.warningMuted
      : tint === 'success'
        ? theme.colors.surfaceSuccess
        : theme.colors.surfaceWarm;
  const borderColor =
    tint === 'warning'
      ? `${theme.colors.warning}55`
      : tint === 'success'
        ? `${theme.colors.success}55`
        : `${theme.colors.warning}33`;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.md,
        padding: theme.spacing.base,
        borderRadius: theme.radius.xl,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.bgElevated,
          alignItems: 'center',
          justifyContent: 'center',
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

// ===========================================================================
// Editor sheet

function BudgetEditorSheet({
  visible,
  mode,
  budget,
  onDismiss,
}: {
  visible: boolean;
  mode: 'create' | 'edit';
  budget?: Budget | null;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();
  const { data: categoriesAll = [] } = useCategories({ type: 'expense' });

  // Empty default so the placeholder "0" is visible on open — users
  // were leaving the literal "0" in the field and submitting it.
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const expenseCategories = useMemo(
    () => categoriesAll.filter((c) => !c.archived),
    [categoriesAll],
  );

  const selectedCategory: Category | null = useMemo(
    () => expenseCategories.find((c) => c.id === categoryId) ?? null,
    [expenseCategories, categoryId],
  );

  // Auto-focus the amount input when sheet opens (skip on edit so we don't
  // auto-clobber the existing value with the keyboard popping up).
  const amountRef = useRef<TextInput>(null);
  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && budget) {
      setAmount(budget.amount);
      setCategoryId(budget.categoryId);
      setError(null);
    } else if (mode === 'create') {
      setAmount('');
      setCategoryId(null);
      setError(null);
      const id = setTimeout(() => amountRef.current?.focus(), 320);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [visible, mode, budget]);

  const numericAmount = parseFloat(amount);
  const isValid = Number.isFinite(numericAmount) && numericAmount > 0;
  const isPending = createMutation.isPending || updateMutation.isPending;

  async function onSave() {
    setError(null);
    if (!isValid) return;
    try {
      if (mode === 'edit' && budget) {
        await updateMutation.mutateAsync({
          id: budget.id,
          payload: { amount },
        });
      } else {
        await createMutation.mutateAsync({
          categoryId: categoryId ?? null,
          amount,
          period: 'monthly',
          currency: 'NPR',
        });
      }
      haptics.success();
      onDismiss();
    } catch (e) {
      haptics.error();
      setError(apiErrorMessage(e, 'Could not save budget'));
    }
  }

  function onDelete() {
    if (!budget) return;
    Alert.alert(
      'Delete this budget?',
      'Tracked transactions stay; you just lose the spending limit.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(budget.id);
              haptics.success();
              onDismiss();
            } catch (e) {
              haptics.error();
              setError(apiErrorMessage(e, 'Could not delete budget'));
            }
          },
        },
      ],
    );
  }

  // Show top 6 expense categories as inline chips; the picker sheet has the rest.
  const visibleCategories = expenseCategories.slice(0, 6);
  const isOverallSelected =
    categoryId === null && (mode === 'create' || budget?.categoryId === null);

  return (
    <Sheet
      visible={visible}
      onDismiss={onDismiss}
      title={mode === 'edit' ? 'Edit budget' : 'New budget'}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Stack gap="lg">
          {/* Big amount block — focal point */}
          <Pressable
            onPress={() => amountRef.current?.focus()}
            style={{
              backgroundColor: theme.colors.surfaceTinted,
              borderRadius: theme.radius.xxl,
              borderWidth: 1.5,
              borderColor: `${theme.colors.accent}33`,
              paddingVertical: theme.spacing.lg,
              paddingHorizontal: theme.spacing.lg,
              alignItems: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel="Monthly limit, tap to edit"
          >
            <Text
              variant="labelCapsSm"
              style={{ color: theme.colors.accent, letterSpacing: 1.4 }}
            >
              MONTHLY LIMIT
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: theme.spacing.xs,
                marginTop: theme.spacing.sm,
                minHeight: 50,
              }}
            >
              <Text
                variant="numericMd"
                style={{
                  color: theme.colors.textMuted,
                  fontSize: 18,
                  fontWeight: '700',
                }}
              >
                Rs
              </Text>
              <TextInput
                ref={amountRef}
                value={amount}
                onChangeText={(v) => {
                  let cleaned = v.replace(/[^\d.]/g, '');
                  const firstDot = cleaned.indexOf('.');
                  if (firstDot >= 0) {
                    cleaned =
                      cleaned.slice(0, firstDot + 1) +
                      cleaned.slice(firstDot + 1).replace(/\./g, '');
                    if (cleaned.length > firstDot + 3) {
                      cleaned = cleaned.slice(0, firstDot + 3);
                    }
                  }
                  setAmount(cleaned);
                }}
                placeholder="0"
                placeholderTextColor={`${theme.colors.text}33`}
                keyboardType="decimal-pad"
                returnKeyType="done"
                style={{
                  ...theme.typography.numericDisplay,
                  fontSize: 44,
                  lineHeight: 52,
                  color: theme.colors.text,
                  minWidth: 80,
                  padding: 0,
                  textAlign: 'center',
                }}
              />
            </View>
            <Text
              variant="caption"
              color="textSubtle"
              style={{ marginTop: theme.spacing.xs }}
            >
              NPR · per month
            </Text>
          </Pressable>

          {/* Category selector — chips inline + More for full picker */}
          {mode === 'create' ? (
            <View>
              <Text
                variant="bodySemiBold"
                style={{ fontSize: 14, marginBottom: theme.spacing.sm }}
              >
                Apply to
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  gap: theme.spacing.xs,
                }}
                keyboardShouldPersistTaps="handled"
              >
                <CategoryChipBudget
                  label="Overall"
                  icon={
                    <WalletIcon
                      size={12}
                      color={
                        isOverallSelected
                          ? '#FFFFFF'
                          : theme.colors.accent
                      }
                    />
                  }
                  tint={theme.colors.accent}
                  selected={isOverallSelected}
                  onPress={() => {
                    haptics.selection();
                    setCategoryId(null);
                  }}
                />
                {visibleCategories.map((c) => (
                  <CategoryChipBudget
                    key={c.id}
                    label={shortLabel(c.name)}
                    tint={c.colorHex}
                    icon={
                      <IconFor
                        iconKey={c.icon}
                        size={12}
                        color={
                          categoryId === c.id ? '#FFFFFF' : c.colorHex
                        }
                      />
                    }
                    selected={categoryId === c.id}
                    onPress={() => {
                      haptics.selection();
                      setCategoryId(categoryId === c.id ? null : c.id);
                    }}
                  />
                ))}
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    setPickerOpen(true);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: theme.spacing.base,
                    paddingVertical: theme.spacing.sm,
                    borderRadius: theme.radius.pill,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: theme.colors.borderStrong,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <TagIcon size={14} color={theme.colors.textMuted} />
                  <Text variant="bodySmMedium" color="textMuted">
                    More
                  </Text>
                </Pressable>
              </ScrollView>
              {/* Selected summary line */}
              <Text
                variant="caption"
                color="textMuted"
                style={{ marginTop: theme.spacing.sm }}
              >
                {isOverallSelected
                  ? 'Tracks every expense across all categories.'
                  : selectedCategory
                    ? `Tracks only ${selectedCategory.name} expenses.`
                    : 'Pick a category, or stick with Overall.'}
              </Text>
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
                paddingHorizontal: theme.spacing.base,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.surfaceSunken,
              }}
            >
              <Text variant="bodySmMedium" color="textMuted">
                Tracking:
              </Text>
              <Text variant="bodySemiBold">
                {budget?.categoryId === null
                  ? 'Overall'
                  : (selectedCategory?.name ?? 'Category')}
              </Text>
            </View>
          )}

          {error ? (
            <View
              style={{
                padding: theme.spacing.base,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.dangerMuted,
              }}
            >
              <Text variant="bodySm" color="danger">
                {error}
              </Text>
            </View>
          ) : null}

          <Stack direction="horizontal" gap="sm">
            {mode === 'edit' && budget ? (
              <Pressable
                onPress={onDelete}
                style={({ pressed }) => ({
                  width: 52,
                  height: 52,
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.dangerMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
                accessibilityRole="button"
                accessibilityLabel="Delete budget"
              >
                <Trash2 size={20} color={theme.colors.danger} />
              </Pressable>
            ) : null}
            <Button
              label={
                !isValid
                  ? 'Enter a limit'
                  : mode === 'edit'
                    ? 'Save changes'
                    : 'Create budget'
              }
              variant="success"
              size="lg"
              fullWidth
              loading={isPending}
              disabled={!isValid}
              onPress={onSave}
              style={{ flex: 1, borderRadius: theme.radius.xxl }}
            />
          </Stack>
        </Stack>
      </KeyboardAvoidingView>

      {/* Category picker sheet — only when creating */}
      <CategoryPickerSheet
        visible={pickerOpen}
        onDismiss={() => setPickerOpen(false)}
        type="expense"
        selectedId={categoryId}
        onSelect={(c) => {
          setCategoryId(c.id);
          setPickerOpen(false);
        }}
      />
    </Sheet>
  );
}

function CategoryChipBudget({
  label,
  icon,
  tint,
  selected,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  tint: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.base,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.pill,
        backgroundColor: selected ? tint : theme.colors.surface,
        borderWidth: 1.5,
        borderColor: selected ? tint : theme.colors.borderSubtle,
        opacity: pressed ? 0.7 : 1,
      })}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: selected ? '#FFFFFF' : `${tint}1F`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Check size={12} color={tint} strokeWidth={3} /> : icon}
      </View>
      <Text
        variant="bodySmMedium"
        style={{
          color: selected ? '#FFFFFF' : theme.colors.text,
          fontWeight: '600',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function shortLabel(name: string): string {
  const trimmed = name.trim();
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  if (first.length <= 12) return first;
  return first.slice(0, 11) + '…';
}
