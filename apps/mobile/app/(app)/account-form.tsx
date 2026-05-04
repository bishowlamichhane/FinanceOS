import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Landmark } from 'lucide-react-native';
import {
  Button,
  ScreenHeader,
  Stack,
  Text,
} from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import {
  useAccount,
  useCreateAccount,
  useUpdateAccount,
} from '@/hooks/useAccounts';
import { apiErrorMessage } from '@/api/queryClient';
import { haptics } from '@/lib/haptics';
import { formatAmount, type CurrencyCode } from '@finance-os/utils';
import type { CreateAccountRequest } from '@finance-os/contracts';

/**
 * Account form — minimal create/edit for a bank account.
 *
 * Simplified per UX feedback: only three user-facing fields (Bank Name,
 * Opening Balance, Hold Balance). Type / icon / color are auto-assigned —
 * type defaults to bank_savings, icon to "building", color to a default
 * teal so the card looks consistent without the user having to fiddle.
 */

const DEFAULT_COLOR = '#3B6FE0'; // Nabil-blue style — matches the Wallet card aesthetic
const DEFAULT_ICON = 'building';

export default function AccountFormScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' ? params.id : undefined;
  const isEditing = !!editingId;

  const { data: existing } = useAccount(editingId);
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();

  const [bankName, setBankName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [holdBalance, setHoldBalance] = useState('0');
  const [error, setError] = useState<string | null>(null);

  // Hydrate when editing
  useEffect(() => {
    if (!existing) return;
    setBankName(existing.bankName ?? existing.name);
    setOpeningBalance(existing.openingBalance);
    setHoldBalance(existing.holdBalance ?? '0');
  }, [existing]);

  const isValid = bankName.trim().length > 0;

  const availableBalance = useMemo(() => {
    const open = parseFloat(openingBalance) || 0;
    const hold = parseFloat(holdBalance) || 0;
    return open - hold;
  }, [openingBalance, holdBalance]);

  async function onSubmit() {
    setError(null);
    if (!isValid) return;
    try {
      const payload: CreateAccountRequest = {
        // Auto-assign — no longer user-controlled.
        name: bankName.trim(),
        type: 'bank_savings',
        bankName: bankName.trim(),
        currency: 'NPR',
        openingBalance: openingBalance || '0',
        holdBalance: holdBalance || '0',
        colorHex: DEFAULT_COLOR,
        icon: DEFAULT_ICON,
      };

      if (isEditing && editingId) {
        await updateMutation.mutateAsync({ id: editingId, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      haptics.success();
      router.back();
    } catch (e) {
      haptics.error();
      setError(apiErrorMessage(e, isEditing ? 'Could not update' : 'Could not create'));
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={isEditing ? 'Edit account' : 'New bank account'}
        left="close"
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.huge,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ============== LIVE PREVIEW ============== */}
        <View style={{ marginVertical: theme.spacing.lg }}>
          <LinearGradient
            colors={['#1E40AF', '#1E3A8A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: theme.radius.xxl,
              padding: theme.spacing.xl,
              minHeight: 160,
              ...theme.elevation.md,
              overflow: 'hidden',
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                right: -32,
                top: -32,
                width: 128,
                height: 128,
                borderRadius: 64,
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: theme.spacing.xl,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: theme.radius.md,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Landmark size={18} color="#FFFFFF" />
              </View>
              <Text
                variant="labelCapsSm"
                style={{ color: 'rgba(255,255,255,0.7)' }}
                numberOfLines={1}
              >
                {bankName.trim() || 'Your bank'}
              </Text>
            </View>
            <Text
              variant="labelCapsSm"
              style={{ color: 'rgba(255,255,255,0.7)', marginBottom: theme.spacing.xs }}
            >
              SAVINGS ACCOUNT
            </Text>
            <Text variant="numericXl" style={{ color: '#FFFFFF', fontSize: 26, lineHeight: 30 }}>
              {formatAmount(openingBalance || '0', 'NPR' as CurrencyCode)}
            </Text>
            {parseFloat(holdBalance) > 0 ? (
              <Text
                variant="caption"
                style={{ color: 'rgba(255,255,255,0.7)', marginTop: theme.spacing.xs }}
              >
                Available {formatAmount(availableBalance.toString(), 'NPR')}
              </Text>
            ) : null}
          </LinearGradient>
        </View>

        {/* ============== FIELDS ============== */}
        <Stack gap="lg">
          <FormField label="BANK NAME" required>
            <TextInput
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. Nabil Bank"
              placeholderTextColor={theme.colors.textSubtle}
              maxLength={100}
              style={inputStyle(theme)}
            />
          </FormField>

          <FormField label="OPENING BALANCE (NPR)" required>
            <TextInput
              value={openingBalance}
              onChangeText={(v) => setOpeningBalance(sanitizeMoneyInput(v))}
              placeholder="0"
              placeholderTextColor={theme.colors.textSubtle}
              keyboardType="decimal-pad"
              style={inputStyle(theme)}
            />
            <Text
              variant="caption"
              color="textSubtle"
              style={{ marginTop: theme.spacing.xs }}
            >
              The starting balance — what's in the account today.
            </Text>
          </FormField>

          <FormField label="HOLD BALANCE (NPR)">
            <TextInput
              value={holdBalance}
              onChangeText={(v) => setHoldBalance(sanitizeMoneyInput(v))}
              placeholder="0"
              placeholderTextColor={theme.colors.textSubtle}
              keyboardType="decimal-pad"
              style={inputStyle(theme)}
            />
            <Text
              variant="caption"
              color="textSubtle"
              style={{ marginTop: theme.spacing.xs }}
            >
              Funds reserved or pending — won't count toward your available
              balance. Leave 0 if nothing is on hold.
            </Text>
          </FormField>

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

          <Button
            label={isEditing ? 'Save changes' : 'Add account'}
            variant="primary"
            size="lg"
            fullWidth
            disabled={!isValid}
            loading={isPending}
            onPress={onSubmit}
            style={{
              marginTop: theme.spacing.sm,
              borderRadius: theme.radius.lg,
              shadowColor: theme.colors.primary,
              shadowOpacity: 0.3,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}
          />
        </Stack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ===========================================================================

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing.xxs,
          marginBottom: theme.spacing.xs,
        }}
      >
        <Text variant="labelCapsSm" color="textMuted">
          {label}
        </Text>
        {required ? (
          <Text variant="labelCapsSm" color="danger">
            *
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function inputStyle(theme: ReturnType<typeof useTheme>) {
  return {
    height: theme.sizing.inputHeight,
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    ...theme.typography.body,
  };
}

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
  return cleaned;
}
