import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Trash2,
  Wallet as WalletIcon,
} from 'lucide-react-native';
import {
  Button,
  IconFor,
  ScreenHeader,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { AccountPickerSheet } from '@/components/AccountPickerSheet';
import { CategoryPickerSheet } from '@/components/CategoryPickerSheet';
import { useTheme } from '@/theme/ThemeProvider';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransaction,
  useUpdateTransaction,
} from '@/hooks/useTransactions';
import { apiErrorMessage } from '@/api/queryClient';
import { haptics } from '@/lib/haptics';
import type {
  CategoryType,
  CreateTransactionRequest,
  UpdateTransactionRequest,
} from '@finance-os/contracts';

type Direction = 'expense' | 'income' | 'transfer';

const SYMBOLS: Record<string, string> = {
  NPR: 'Rs',
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const DIRECTION_LABEL: Record<Direction, string> = {
  expense: 'expense',
  income: 'income',
  transfer: 'transfer',
};

/**
 * Add Transaction — system-keyboard rewrite (2026-05-04, session 2).
 *
 * Why this rewrite:
 *
 *   1. The custom numpad was a bad fit for this screen. transaction-form is
 *      registered as a TAB (not a stack/modal) in (app)/_layout.tsx, so the
 *      bottom tab bar is always visible underneath. The numpad collided
 *      with the tab bar — bottom rows getting clipped, the FAB sitting on
 *      top of digit keys. It also created a custom amount-input pattern
 *      that didn't exist anywhere else in the app, so every layout bug had
 *      to be debugged from scratch.
 *
 *   2. Using `keyboardType="decimal-pad"` is the same pattern that
 *      account-form.tsx already uses successfully. KeyboardAvoidingView
 *      handles the lift; the user already knows how this feels because
 *      it's how every other form in the app works.
 *
 *   3. The metadata rows now use the array-form Pressable style
 *      (`style={({ pressed }) => [{...}]}`) — the same form ListRow uses.
 *      The previous version used the object-form returning a plain object,
 *      which was somehow rendering as a column instead of a row on
 *      this RN version. Using ListRow's exact pattern eliminates that bug.
 *
 * Layout (top → bottom):
 *
 *   Header           — Close · "New transaction" · (Trash, edit mode only)
 *   Direction        — segmented Expense / Income / Transfer
 *   Amount card      — direction-tinted card with currency prefix + big
 *                      formatted number; tapping focuses the hidden
 *                      TextInput which brings up the system decimal-pad.
 *   Metadata group   — Category | Account(s) | Date — one Card with
 *                      hairline dividers between rows.
 *   Note input       — single-line system-keyboard input.
 *   Save button      — full-width, follows the rest of the app's form
 *                      pattern. KeyboardAvoidingView lifts it above the
 *                      keyboard when typing the note.
 */
export default function TransactionFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    direction?: string;
    accountId?: string;
  }>();

  const editingId = typeof params.id === 'string' ? params.id : undefined;
  const isEditing = !!editingId;

  const accounts = useActiveAccounts();
  const { data: existing } = useTransaction(editingId);
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  const defaultDirection = (params.direction as Direction) || 'expense';
  const [direction, setDirection] = useState<Direction>(defaultDirection);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(() => new Date());

  const initialAccountId =
    typeof params.accountId === 'string'
      ? params.accountId
      : accounts[0]?.id ?? null;
  const [accountId, setAccountId] = useState<string | null>(initialAccountId);
  const [counterAccountId, setCounterAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const categoryType: CategoryType =
    direction === 'income' ? 'income' : 'expense';
  const { data: categoriesAll = [] } = useCategories({});
  const directionalCategories = useMemo(
    () => categoriesAll.filter((c) => c.type === categoryType && !c.archived),
    [categoriesAll, categoryType],
  );
  const selectedCategory = useMemo(
    () => directionalCategories.find((c) => c.id === categoryId) ?? null,
    [directionalCategories, categoryId],
  );

  const amountRef = useRef<TextInput>(null);

  // Auto-focus the amount field on mount when creating. The 280ms delay is
  // intentional — focusing during the navigation transition gets dropped
  // on Android (per CLAUDE.md note in the previous transaction-form
  // rewrite). Skipped in edit mode (would steal focus from the hydrated
  // amount).
  useEffect(() => {
    if (isEditing) return;
    const t = setTimeout(() => amountRef.current?.focus(), 280);
    return () => clearTimeout(t);
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing && !accountId && accounts[0]) setAccountId(accounts[0].id);
  }, [isEditing, accounts, accountId]);

  useEffect(() => {
    if (isEditing) return;
    setCategoryId(null);
    if (direction !== 'transfer') setCounterAccountId(null);
  }, [direction, isEditing]);

  // Hydrate state from existing transaction when editing
  useEffect(() => {
    if (!existing) return;
    const dir: Direction =
      existing.type === 'transfer'
        ? 'transfer'
        : existing.type === 'income' || existing.type === 'dividend'
          ? 'income'
          : 'expense';
    setDirection(dir);
    setAmount(existing.amount);
    setDescription(existing.description);
    setDate(new Date(existing.date));
    setAccountId(existing.accountId);
    setCounterAccountId(existing.counterAccountId);
    setCategoryId(existing.categoryId);
  }, [existing]);

  const [accountSheetTarget, setAccountSheetTarget] = useState<
    'from' | 'to' | null
  >(null);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const account = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? null,
    [accounts, accountId],
  );
  const counterAccount = useMemo(
    () => accounts.find((a) => a.id === counterAccountId) ?? null,
    [accounts, counterAccountId],
  );

  const isValid = useMemo(() => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return false;
    if (!description.trim()) return false;
    if (!accountId) return false;
    if (direction === 'transfer' && !counterAccountId) return false;
    if (direction === 'transfer' && counterAccountId === accountId) return false;
    return true;
  }, [amount, description, accountId, counterAccountId, direction]);

  async function onSubmit() {
    setError(null);
    if (!isValid || !accountId) return;

    try {
      if (isEditing && editingId) {
        const updatePayload: UpdateTransactionRequest = {
          date: date.toISOString().slice(0, 10),
          amount,
          description: description.trim(),
          accountId,
          categoryId:
            direction === 'transfer' ? undefined : (categoryId ?? null),
          counterAccountId:
            direction === 'transfer' && counterAccountId
              ? counterAccountId
              : undefined,
        };
        await updateMutation.mutateAsync({
          id: editingId,
          payload: updatePayload,
        });
      } else {
        let payload: CreateTransactionRequest;
        if (direction === 'transfer') {
          payload = {
            type: 'transfer',
            date: date.toISOString().slice(0, 10),
            amount,
            currency: account?.currency ?? 'NPR',
            description: description.trim(),
            accountId,
            counterAccountId: counterAccountId!,
          };
        } else {
          payload = {
            type: direction,
            date: date.toISOString().slice(0, 10),
            amount,
            currency: account?.currency ?? 'NPR',
            description: description.trim(),
            accountId,
            categoryId: categoryId ?? undefined,
          };
        }
        await createMutation.mutateAsync(payload);
      }
      haptics.success();
      router.back();
    } catch (e) {
      haptics.error();
      setError(
        apiErrorMessage(
          e,
          isEditing
            ? 'Could not update transaction'
            : 'Could not save transaction',
        ),
      );
    }
  }

  function onDelete() {
    if (!editingId) return;
    Alert.alert(
      'Delete this transaction?',
      'This is permanent. Account balances will update accordingly.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(editingId);
              haptics.success();
              router.back();
            } catch (e) {
              haptics.error();
              setError(apiErrorMessage(e, 'Could not delete transaction'));
            }
          },
        },
      ],
    );
  }

  const accentColor =
    direction === 'income'
      ? theme.colors.success
      : direction === 'expense'
        ? theme.colors.danger
        : theme.colors.info;

  const currency = account?.currency ?? 'NPR';
  const symbol = SYMBOLS[currency] ?? currency;

  const saveLabel = isEditing
    ? 'Save changes'
    : direction === 'transfer'
      ? 'Make transfer'
      : `Add ${DIRECTION_LABEL[direction]}`;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={isEditing ? 'Edit transaction' : 'New transaction'}
        left="close"
        onBack={() => router.back()}
        right={
          isEditing ? (
            <Pressable
              onPress={onDelete}
              hitSlop={8}
              style={{
                width: 36,
                height: 36,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.dangerMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel="Delete transaction"
            >
              <Trash2 size={16} color={theme.colors.danger} />
            </Pressable>
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.xl,
          paddingTop: theme.spacing.sm,
          // Clear the tab bar (always visible because this screen is in
          // the tabs nav, not a modal) plus give the Save button room.
          paddingBottom: theme.sizing.tabBarHeight + theme.spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ============== DIRECTION ============== */}
        {!isEditing ? (
          <SegmentedControl<Direction>
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
              { value: 'transfer', label: 'Transfer' },
            ]}
            value={direction}
            onChange={(v) => setDirection(v)}
            accentColor={`${accentColor}33`}
          />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.xs,
                borderRadius: theme.radius.pill,
                backgroundColor: `${accentColor}22`,
                borderWidth: 1,
                borderColor: `${accentColor}55`,
              }}
            >
              <Text variant="labelCaps" style={{ color: accentColor }}>
                {direction.toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {/* ============== AMOUNT CARD ==============
            Direction-tinted card. Tapping anywhere on it focuses the
            hidden TextInput which brings up the device decimal-pad.
            We render a formatted Text on top of the input so the user
            sees grouped numbers ("12,500") while the underlying input
            value stays raw ("12500").
        */}
        <Pressable
          onPress={() => amountRef.current?.focus()}
          style={{
            marginTop: theme.spacing.lg,
            paddingVertical: theme.spacing.lg,
            paddingHorizontal: theme.spacing.xl,
            backgroundColor: `${accentColor}14`,
            borderRadius: theme.radius.xl,
            borderWidth: 1.5,
            borderColor: `${accentColor}55`,
            alignItems: 'center',
          }}
        >
          <Text
            variant="labelCapsSm"
            style={{ color: accentColor, marginBottom: theme.spacing.xs }}
          >
            {direction === 'expense'
              ? 'AMOUNT SPENT'
              : direction === 'income'
                ? 'AMOUNT RECEIVED'
                : 'AMOUNT TO TRANSFER'}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: theme.spacing.xs,
              minHeight: 56,
            }}
          >
            <Text
              variant="numericLg"
              style={{ color: theme.colors.textMuted, fontSize: 22 }}
            >
              {symbol}
            </Text>
            <TextInput
              ref={amountRef}
              value={amount}
              onChangeText={(v) => setAmount(sanitizeMoneyInput(v))}
              keyboardType="decimal-pad"
              returnKeyType="done"
              maxLength={12}
              placeholder="0"
              placeholderTextColor={theme.colors.textSubtle}
              selectionColor={accentColor}
              style={{
                ...theme.typography.numericDisplay,
                fontSize: 48,
                lineHeight: 56,
                color: amount ? accentColor : theme.colors.textSubtle,
                textAlign: 'center',
                minWidth: 80,
                padding: 0,
              }}
            />
          </View>

          <Text
            variant="caption"
            color="textSubtle"
            style={{ marginTop: 4, letterSpacing: 1 }}
          >
            {currency}
          </Text>
        </Pressable>

        {/* ============== METADATA GROUP ============== */}
        <View
          style={{
            marginTop: theme.spacing.lg,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.borderSubtle,
            overflow: 'hidden',
          }}
        >
          {direction !== 'transfer' ? (
            <>
              <FormRow
                icon={
                  selectedCategory ? (
                    <IconFor
                      iconKey={selectedCategory.icon}
                      size={18}
                      color={selectedCategory.colorHex}
                    />
                  ) : (
                    <CategoryDotIcon color={theme.colors.textMuted} />
                  )
                }
                tint={selectedCategory?.colorHex ?? theme.colors.textMuted}
                label="Category"
                value={selectedCategory?.name ?? 'Uncategorized'}
                valueMuted={!selectedCategory}
                onPress={() => {
                  if (directionalCategories.length === 0) {
                    router.push('/(app)/categories');
                    return;
                  }
                  setCategorySheetOpen(true);
                }}
              />
              <RowDivider />
              <FormRow
                icon={
                  account ? (
                    <IconFor
                      iconKey={account.icon ?? 'wallet'}
                      size={18}
                      color={account.colorHex ?? theme.colors.primary}
                    />
                  ) : (
                    <WalletIcon size={18} color={theme.colors.textMuted} />
                  )
                }
                tint={account?.colorHex ?? theme.colors.primary}
                label={direction === 'income' ? 'Deposit to' : 'Pay from'}
                value={account?.name ?? 'Choose account'}
                valueMuted={!account}
                onPress={() => setAccountSheetTarget('from')}
              />
            </>
          ) : (
            <>
              <FormRow
                icon={
                  account ? (
                    <IconFor
                      iconKey={account.icon ?? 'wallet'}
                      size={18}
                      color={account.colorHex ?? theme.colors.primary}
                    />
                  ) : (
                    <ArrowUpRight size={18} color={theme.colors.textMuted} />
                  )
                }
                tint={account?.colorHex ?? theme.colors.primary}
                label="From"
                value={account?.name ?? 'Choose source'}
                valueMuted={!account}
                onPress={() => setAccountSheetTarget('from')}
              />
              <RowDivider />
              <FormRow
                icon={
                  counterAccount ? (
                    <IconFor
                      iconKey={counterAccount.icon ?? 'wallet'}
                      size={18}
                      color={counterAccount.colorHex ?? theme.colors.primary}
                    />
                  ) : (
                    <ArrowDownLeft size={18} color={theme.colors.textMuted} />
                  )
                }
                tint={counterAccount?.colorHex ?? theme.colors.primary}
                label="To"
                value={counterAccount?.name ?? 'Choose destination'}
                valueMuted={!counterAccount}
                onPress={() => setAccountSheetTarget('to')}
              />
            </>
          )}

          <RowDivider />
          <FormRow
            icon={<Calendar size={18} color={theme.colors.info} />}
            tint={theme.colors.info}
            label="Date"
            value={formatDateRelative(date)}
            onPress={() => setDatePickerOpen(true)}
          />
        </View>

        {/* ============== NOTE ============== */}
        <View style={{ marginTop: theme.spacing.lg }}>
          <Text
            variant="labelCapsSm"
            color="textMuted"
            style={{ marginBottom: theme.spacing.xs }}
          >
            WHAT'S IT FOR?
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Lunch at Bhat-bhateni"
            placeholderTextColor={theme.colors.textSubtle}
            autoCapitalize="sentences"
            returnKeyType="done"
            maxLength={200}
            style={{
              height: theme.sizing.inputHeight,
              paddingHorizontal: theme.spacing.base,
              borderRadius: theme.radius.lg,
              borderWidth: 1.5,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              ...theme.typography.body,
            }}
          />
        </View>

        {error ? (
          <View
            style={{
              padding: theme.spacing.base,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.dangerMuted,
              marginTop: theme.spacing.md,
            }}
          >
            <Text variant="bodySm" color="danger">
              {error}
            </Text>
          </View>
        ) : null}

        {/* ============== SAVE ============== */}
        <Button
          label={saveLabel}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!isValid}
          loading={createMutation.isPending || updateMutation.isPending}
          onPress={onSubmit}
          style={{ marginTop: theme.spacing.xl }}
        />
      </ScrollView>

      {/* Sheets */}
      <AccountPickerSheet
        visible={accountSheetTarget !== null}
        onDismiss={() => setAccountSheetTarget(null)}
        title={
          accountSheetTarget === 'to' ? 'Choose destination' : 'Choose account'
        }
        selectedId={
          accountSheetTarget === 'to' ? counterAccountId : accountId
        }
        excludeId={accountSheetTarget === 'to' ? accountId : null}
        onSelect={(a) => {
          if (accountSheetTarget === 'to') setCounterAccountId(a.id);
          else setAccountId(a.id);
          setAccountSheetTarget(null);
        }}
      />
      <CategoryPickerSheet
        visible={categorySheetOpen}
        onDismiss={() => setCategorySheetOpen(false)}
        type={categoryType}
        selectedId={categoryId}
        onSelect={(c) => {
          setCategoryId(c.id);
          setCategorySheetOpen(false);
        }}
      />

      {datePickerOpen ? (
        <DatePickerInline
          value={date}
          onChange={(d) => {
            setDate(d);
            setDatePickerOpen(false);
          }}
          onDismiss={() => setDatePickerOpen(false)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

// ===========================================================================
// FormRow — the metadata-group row.
//
// IMPORTANT: this uses the array-form Pressable style
// (`style={({ pressed }) => [{...}]}`), which is the form ListRow uses and
// is the form known to render as flexDirection: 'row' correctly in this
// RN version. The previous PickerRow returned a plain object, which on
// the user's device was rendering the row as a column for unknown reasons.
// Match ListRow's pattern exactly to avoid that.
// ===========================================================================

function FormRow({
  icon,
  tint,
  label,
  value,
  valueMuted,
  onPress,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: string;
  valueMuted?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          paddingHorizontal: theme.spacing.base,
          paddingVertical: theme.spacing.md,
          gap: theme.spacing.md,
          minHeight: 60,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: theme.radius.md,
          backgroundColor: `${tint}22`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {label}
        </Text>
        <Text
          variant="bodySemiBold"
          color={valueMuted ? 'textMuted' : 'text'}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
      <ChevronRight size={16} color={theme.colors.textSubtle} />
    </Pressable>
  );
}

function RowDivider() {
  const theme = useTheme();
  return (
    <View
      style={{
        height: 1,
        marginLeft: theme.spacing.base + 36 + theme.spacing.md,
        backgroundColor: theme.colors.borderSubtle,
      }}
    />
  );
}

function CategoryDotIcon({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: color,
        borderStyle: 'dashed',
      }}
    />
  );
}

// ===========================================================================
// Inline date picker
// ===========================================================================

function DatePickerInline({
  value,
  onChange,
  onDismiss,
}: {
  value: Date;
  onChange: (d: Date) => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dayBefore = new Date(today);
  dayBefore.setDate(dayBefore.getDate() - 2);

  const quickChips = [
    { label: 'Today', d: today },
    { label: 'Yesterday', d: yesterday },
    {
      label: dayBefore.toLocaleDateString(undefined, { weekday: 'short' }),
      d: dayBefore,
    },
  ];

  // 28 days back → today (4 weeks × 7 days)
  const days: Date[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const selDay = value.toISOString().slice(0, 10);

  return (
    <Pressable
      onPress={onDismiss}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors.overlay,
        zIndex: 10,
        justifyContent: 'flex-end',
      }}
    >
      <Pressable
        onPress={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.colors.bgElevated,
          borderTopLeftRadius: theme.radius.xxl,
          borderTopRightRadius: theme.radius.xxl,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        }}
      >
        <Text variant="h4">When?</Text>

        <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
          {quickChips.map((c) => {
            const isSel = c.d.toISOString().slice(0, 10) === selDay;
            return (
              <Pressable
                key={c.label}
                onPress={() => onChange(c.d)}
                style={{
                  flex: 1,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.lg,
                  backgroundColor: isSel
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderWidth: 1,
                  borderColor: isSel
                    ? theme.colors.primary
                    : theme.colors.borderSubtle,
                  alignItems: 'center',
                }}
              >
                <Text
                  variant="bodySmMedium"
                  style={{
                    color: isSel
                      ? theme.colors.textOnAccent
                      : theme.colors.text,
                  }}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 4 weeks × 7 days, evenly distributed */}
        <View>
          {[0, 1, 2, 3].map((week) => (
            <View
              key={week}
              style={{
                flexDirection: 'row',
                gap: 4,
                marginTop: week === 0 ? 0 : 4,
              }}
            >
              {days.slice(week * 7, week * 7 + 7).map((d) => {
                const isSel = d.toISOString().slice(0, 10) === selDay;
                return (
                  <Pressable
                    key={d.toISOString()}
                    onPress={() => onChange(d)}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      borderRadius: theme.radius.md,
                      backgroundColor: isSel
                        ? theme.colors.primary
                        : theme.colors.surface,
                      borderWidth: 1,
                      borderColor: isSel
                        ? theme.colors.primary
                        : theme.colors.borderSubtle,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      variant="caption"
                      style={{
                        color: isSel
                          ? theme.colors.textOnAccent
                          : theme.colors.textMuted,
                        fontSize: 10,
                      }}
                    >
                      {d
                        .toLocaleDateString(undefined, { weekday: 'short' })
                        .slice(0, 1)}
                    </Text>
                    <Text
                      variant="numericMd"
                      style={{
                        color: isSel
                          ? theme.colors.textOnAccent
                          : theme.colors.text,
                        fontSize: 14,
                      }}
                    >
                      {d.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <Pressable
          onPress={onDismiss}
          style={{
            paddingVertical: theme.spacing.md,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surface,
            alignItems: 'center',
            marginTop: theme.spacing.xs,
          }}
        >
          <Text variant="bodySemiBold">Done</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

// ===========================================================================
// helpers
// ===========================================================================

/** Strip non-numeric input, allow a single dot, cap to 2 decimal places.
 *  Same logic account-form.tsx uses for opening-balance. */
function sanitizeMoneyInput(v: string): string {
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
  // Strip leading zero unless the next char is a dot ("0.5" stays valid)
  if (cleaned.length > 1 && cleaned[0] === '0' && cleaned[1] !== '.') {
    cleaned = cleaned.replace(/^0+/, '');
  }
  return cleaned;
}

function formatDateRelative(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return target.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}