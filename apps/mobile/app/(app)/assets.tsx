import { useEffect, useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import {
  Archive,
  Banknote,
  Briefcase,
  Car,
  ChevronUp,
  Coins,
  Cpu,
  Home as HomeIcon,
  Landmark,
  Plus,
  Shield,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
} from 'lucide-react-native';
import {
  Button,
  EmptyState,
  ErrorState,
  ScreenHeader,
  Sheet,
  SkeletonList,
  Stack,
  Text,
} from '@/components/ui';
import {
  useAssets,
  useCreateAsset,
  useDeleteAsset,
  useRecordAssetValue,
  useUpdateAsset,
} from '@/hooks/useAssets';
import { useTheme } from '@/theme/ThemeProvider';
import { apiErrorMessage } from '@/api/queryClient';
import { haptics } from '@/lib/haptics';
import { formatAmount, type CurrencyCode } from '@finance-os/utils';
import type { Asset, AssetType, CreateAssetRequest } from '@finance-os/contracts';

/**
 * Assets — manage non-account holdings: cash equivalents, FDs, gold,
 * vehicles, real estate, electronics, crypto, etc.
 *
 * Layout mirrors the budget screen:
 *   1. Atmospheric glow + header (back / "Assets" / +)
 *   2. Hero — Net Assets value + 3-up Cost / Gain / %
 *   3. Type filter chips
 *   4. Asset rows (tap → editor)
 *   5. Editor sheet supports create / edit / value-update modes
 */
export default function AssetsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useAssets(false);

  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<AssetType | 'all'>('all');

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  const totals = data?.totals;
  const allItems = data?.items ?? [];

  // Filter by type chip
  const items = useMemo(() => {
    if (filter === 'all') return allItems;
    return allItems.filter((a) => a.type === filter);
  }, [allItems, filter]);

  // Build the chip set: 'all' + every type that has at least one asset
  const presentTypes = useMemo(() => {
    const set = new Set<AssetType>();
    for (const a of allItems) set.add(a.type);
    return Array.from(set);
  }, [allItems]);

  const gainNum = totals ? parseFloat(totals.totalGain.amount) : 0;
  const gainColor =
    gainNum > 0
      ? theme.colors.success
      : gainNum < 0
        ? theme.colors.danger
        : theme.colors.textMuted;

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

      <ScreenHeader
        title="Assets"
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={() => {
              haptics.tap();
              setAdding(true);
            }}
            hitSlop={8}
            style={{
              width: 40,
              height: 40,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.accentMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel="Add asset"
          >
            <Plus size={18} color={theme.colors.accent} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.xl,
          paddingBottom: theme.sizing.tabBarHeight + theme.spacing.huge,
          paddingTop: theme.spacing.md,
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
          <SkeletonList count={5} />
        ) : isError ? (
          <ErrorState
            title="Couldn't load assets"
            description={apiErrorMessage(error, 'Pull down to retry.')}
            onRetry={() => void refetch()}
          />
        ) : (
          <Stack gap="lg">
            {/* Hero — Net Assets */}
            {totals ? (
              <View>
                <Text variant="labelCaps" color="textMuted">
                  NET ASSETS
                </Text>
                <Text
                  variant="numericDisplay"
                  style={{
                    fontSize: 36,
                    lineHeight: 42,
                    marginTop: theme.spacing.xs,
                  }}
                  numberOfLines={1}
                >
                  {formatAmount(totals.totalValue.amount, 'NPR')}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: theme.spacing.lg,
                    marginTop: theme.spacing.md,
                  }}
                >
                  <SplitStat
                    label="Cost basis"
                    value={formatAmount(totals.totalCost.amount, 'NPR')}
                    color={theme.colors.textMuted}
                  />
                  <SplitStat
                    label="Total gain"
                    value={
                      (gainNum >= 0 ? '+' : '−') +
                      formatAmount(Math.abs(gainNum).toString(), 'NPR')
                    }
                    color={gainColor}
                  />
                  <SplitStat
                    label="Gain %"
                    value={`${(totals.gainPercent * 100).toFixed(1)}%`}
                    color={gainColor}
                  />
                </View>
              </View>
            ) : null}

            {/* Type filter */}
            {presentTypes.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  gap: theme.spacing.xs,
                  paddingVertical: theme.spacing.xs,
                }}
              >
                <FilterChip
                  active={filter === 'all'}
                  label="All"
                  onPress={() => setFilter('all')}
                />
                {presentTypes.map((t) => (
                  <FilterChip
                    key={t}
                    active={filter === t}
                    label={ASSET_TYPE_LABEL[t]}
                    onPress={() => setFilter(t)}
                  />
                ))}
              </ScrollView>
            ) : null}

            {/* Empty state */}
            {allItems.length === 0 ? (
              <View style={{ paddingTop: theme.spacing.huge }}>
                <EmptyState
                  title="No assets yet"
                  description="Track land, gold, fixed deposits, vehicles, anything else worth money. Each entry keeps its own valuation history."
                  actionLabel="Add your first asset"
                  onAction={() => setAdding(true)}
                />
              </View>
            ) : items.length === 0 ? (
              <View style={{ paddingVertical: theme.spacing.xl }}>
                <Text variant="bodySm" color="textMuted" align="center">
                  No assets in this category.
                </Text>
              </View>
            ) : (
              <Stack gap="sm">
                {items.map((a) => (
                  <AssetRow
                    key={a.id}
                    asset={a}
                    onPress={() => setEditing(a)}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </ScrollView>

      <AssetEditorSheet
        visible={adding}
        mode="create"
        onDismiss={() => setAdding(false)}
      />
      <AssetEditorSheet
        visible={!!editing}
        mode="edit"
        asset={editing}
        onDismiss={() => setEditing(null)}
      />
    </View>
  );
}

// ===========================================================================

function SplitStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text
        variant="numericMd"
        style={{ color, fontSize: 14, marginTop: 2 }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function FilterChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
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
        paddingHorizontal: theme.spacing.base,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.radius.pill,
        backgroundColor: active ? theme.colors.accent : theme.colors.surface,
        borderWidth: 1,
        borderColor: active ? theme.colors.accent : theme.colors.borderSubtle,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        variant="bodySmMedium"
        style={{
          color: active ? theme.colors.textOnAccent : theme.colors.textMuted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AssetRow({
  asset,
  onPress,
}: {
  asset: Asset;
  onPress: () => void;
}) {
  const theme = useTheme();
  const tint = assetTint(asset.type, theme);
  const Icon = iconForType(asset.type);
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
          width: 44,
          height: 44,
          borderRadius: theme.radius.md,
          backgroundColor: `${tint}1F`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} color={tint} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodySemiBold" numberOfLines={1}>
          {asset.name}
          {asset.archived ? '  ·  archived' : ''}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {ASSET_TYPE_LABEL[asset.type]}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="numericMd" style={{ fontSize: 14 }} numberOfLines={1}>
          {formatAmount(asset.currentValue, asset.currency as CurrencyCode)}
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
              style={{
                transform: [{ rotate: isDown ? '180deg' : '0deg' }],
                opacity: isUp || isDown ? 1 : 0.5,
              }}
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
// Editor sheet — create / edit / value-update

function AssetEditorSheet({
  visible,
  mode,
  asset,
  onDismiss,
}: {
  visible: boolean;
  mode: 'create' | 'edit';
  asset?: Asset | null;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const recordValueMutation = useRecordAssetValue();
  const deleteMutation = useDeleteAsset();

  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('cash');
  const [valueText, setValueText] = useState('0');
  const [acquiredCost, setAcquiredCost] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Hydrate when opening
  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && asset) {
      setName(asset.name);
      setType(asset.type);
      setValueText(asset.currentValue);
      setAcquiredCost(asset.acquiredCost ?? '');
      setNotes(asset.notes ?? '');
      setError(null);
    } else if (mode === 'create') {
      setName('');
      setType('cash');
      setValueText('0');
      setAcquiredCost('');
      setNotes('');
      setError(null);
    }
  }, [visible, mode, asset]);

  const numericValue = parseFloat(valueText);
  const valueIsValid =
    Number.isFinite(numericValue) && numericValue >= 0 && name.trim().length > 0;
  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    recordValueMutation.isPending;

  async function onSave() {
    setError(null);
    if (!valueIsValid) return;
    try {
      if (mode === 'create') {
        const payload: CreateAssetRequest = {
          name: name.trim(),
          type,
          currentValue: valueText,
          currency: 'NPR',
          acquiredCost:
            acquiredCost.trim().length > 0 ? acquiredCost.trim() : null,
          notes: notes.trim().length > 0 ? notes.trim() : null,
        };
        await createMutation.mutateAsync(payload);
      } else if (mode === 'edit' && asset) {
        // 1) Record a new valuation snapshot if value changed
        const valueChanged =
          parseFloat(valueText) !== parseFloat(asset.currentValue);
        if (valueChanged) {
          await recordValueMutation.mutateAsync({
            id: asset.id,
            payload: { value: valueText },
          });
        }
        // 2) Update metadata fields
        await updateMutation.mutateAsync({
          id: asset.id,
          payload: {
            name: name.trim(),
            type,
            acquiredCost:
              acquiredCost.trim().length > 0 ? acquiredCost.trim() : null,
            notes: notes.trim().length > 0 ? notes.trim() : null,
          },
        });
      }
      haptics.success();
      onDismiss();
    } catch (e) {
      haptics.error();
      setError(apiErrorMessage(e, 'Could not save asset'));
    }
  }

  function onArchive() {
    if (!asset) return;
    Alert.alert(
      asset.archived ? 'Unarchive this asset?' : 'Archive this asset?',
      asset.archived
        ? 'It will appear in your active list again.'
        : 'It stays in the database but is hidden from totals and lists.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: asset.archived ? 'Unarchive' : 'Archive',
          onPress: async () => {
            try {
              await updateMutation.mutateAsync({
                id: asset.id,
                payload: { archived: !asset.archived },
              });
              haptics.success();
              onDismiss();
            } catch (e) {
              haptics.error();
              setError(apiErrorMessage(e, 'Could not archive'));
            }
          },
        },
      ],
    );
  }

  function onDelete() {
    if (!asset) return;
    Alert.alert(
      'Delete this asset?',
      'Its valuation history is removed. Linked transactions stay.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(asset.id);
              haptics.success();
              onDismiss();
            } catch (e) {
              haptics.error();
              setError(apiErrorMessage(e, 'Could not delete asset'));
            }
          },
        },
      ],
    );
  }

  return (
    <Sheet
      visible={visible}
      onDismiss={onDismiss}
      title={mode === 'edit' ? 'Edit asset' : 'New asset'}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Stack gap="lg">
          {/* Name */}
          <View>
            <Text
              variant="labelCapsSm"
              color="textMuted"
              style={{ marginBottom: theme.spacing.xs }}
            >
              NAME
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Land — Bhaktapur"
              placeholderTextColor={theme.colors.textSubtle}
              style={textInputStyle(theme)}
            />
          </View>

          {/* Type chips */}
          <View>
            <Text
              variant="labelCapsSm"
              color="textMuted"
              style={{ marginBottom: theme.spacing.xs }}
            >
              TYPE
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.spacing.xs,
              }}
            >
              {ASSET_TYPES.map((t) => {
                const active = type === t;
                const tint = assetTint(t, theme);
                const Icon = iconForType(t);
                return (
                  <Pressable
                    key={t}
                    onPress={() => {
                      haptics.tap();
                      setType(t);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.xs,
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: theme.spacing.xs,
                      borderRadius: theme.radius.pill,
                      backgroundColor: active
                        ? `${tint}1F`
                        : theme.colors.surfaceSunken,
                      borderWidth: 1,
                      borderColor: active ? tint : theme.colors.borderSubtle,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Icon size={14} color={active ? tint : theme.colors.textMuted} />
                    <Text
                      variant="bodySmMedium"
                      style={{
                        color: active ? tint : theme.colors.textMuted,
                      }}
                    >
                      {ASSET_TYPE_LABEL[t]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Current value */}
          <View>
            <Text
              variant="labelCapsSm"
              color="textMuted"
              style={{ marginBottom: theme.spacing.xs }}
            >
              {mode === 'create' ? 'CURRENT VALUE (NPR)' : 'NEW VALUATION (NPR)'}
            </Text>
            <TextInput
              value={valueText}
              onChangeText={(v) => setValueText(cleanDecimal(v))}
              placeholder="0"
              placeholderTextColor={theme.colors.textSubtle}
              keyboardType="decimal-pad"
              style={[
                textInputStyle(theme),
                { ...theme.typography.numericLg, fontSize: 22 },
              ]}
            />
            {mode === 'edit' && asset ? (
              <Text
                variant="caption"
                color="textMuted"
                style={{ marginTop: theme.spacing.xs }}
              >
                Last value: {formatAmount(asset.currentValue, 'NPR')}.
                {parseFloat(valueText) !== parseFloat(asset.currentValue)
                  ? ' Saving will record a new snapshot.'
                  : ''}
              </Text>
            ) : null}
          </View>

          {/* Acquired cost (optional) */}
          <View>
            <Text
              variant="labelCapsSm"
              color="textMuted"
              style={{ marginBottom: theme.spacing.xs }}
            >
              COST BASIS (NPR) — optional
            </Text>
            <TextInput
              value={acquiredCost}
              onChangeText={(v) => setAcquiredCost(cleanDecimal(v))}
              placeholder="What you originally paid"
              placeholderTextColor={theme.colors.textSubtle}
              keyboardType="decimal-pad"
              style={textInputStyle(theme)}
            />
          </View>

          {/* Notes (optional) */}
          <View>
            <Text
              variant="labelCapsSm"
              color="textMuted"
              style={{ marginBottom: theme.spacing.xs }}
            >
              NOTES — optional
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything you want to remember"
              placeholderTextColor={theme.colors.textSubtle}
              multiline
              style={[
                textInputStyle(theme),
                { minHeight: 70, paddingTop: theme.spacing.sm, textAlignVertical: 'top' },
              ]}
            />
          </View>

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

          {/* Action row */}
          <Stack direction="horizontal" gap="sm">
            {mode === 'edit' && asset ? (
              <>
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
                  accessibilityLabel="Delete asset"
                >
                  <Trash2 size={20} color={theme.colors.danger} />
                </Pressable>
                <Pressable
                  onPress={onArchive}
                  style={({ pressed }) => ({
                    width: 52,
                    height: 52,
                    borderRadius: theme.radius.lg,
                    backgroundColor: theme.colors.surfaceSunken,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={asset.archived ? 'Unarchive' : 'Archive'}
                >
                  <Archive size={20} color={theme.colors.textMuted} />
                </Pressable>
              </>
            ) : null}
            <Button
              label={mode === 'edit' ? 'Save changes' : 'Add asset'}
              variant="success"
              size="lg"
              fullWidth
              loading={isPending}
              disabled={!valueIsValid}
              onPress={onSave}
              style={{ flex: 1, borderRadius: theme.radius.xxl }}
            />
          </Stack>
        </Stack>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

// ===========================================================================
// helpers

function cleanDecimal(v: string): string {
  let cleaned = v.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot >= 0) {
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, '');
    if (cleaned.length > firstDot + 5) {
      cleaned = cleaned.slice(0, firstDot + 5);
    }
  }
  return cleaned;
}

function textInputStyle(theme: ReturnType<typeof useTheme>) {
  return {
    minHeight: theme.sizing.inputHeight,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSunken,
    color: theme.colors.text,
    ...theme.typography.body,
  } as const;
}

const ASSET_TYPES: AssetType[] = [
  'cash',
  'bank_balance',
  'fixed_deposit',
  'gold',
  'vehicle',
  'property',
  'electronics',
  'stock_portfolio',
  'crypto',
  'other',
];

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

function iconForType(t: AssetType) {
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
    case 'other': return Tag;
    default: return Briefcase;
  }
}

function assetTint(type: AssetType, theme: ReturnType<typeof useTheme>): string {
  switch (type) {
    case 'cash': return theme.colors.success;
    case 'bank_balance':
    case 'fixed_deposit':
      return theme.colors.primary;
    case 'stock_portfolio':
    case 'crypto':
      return theme.colors.info;
    case 'gold':
      return theme.colors.warning;
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

