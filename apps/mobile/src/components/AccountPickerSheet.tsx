import { Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useActiveAccounts } from '@/hooks/useAccounts';
import { Sheet, Text, IconFor, EmptyState, Divider } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { formatAmount } from '@finance-os/utils';
import type { Account } from '@finance-os/contracts';

export type AccountPickerSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  selectedId?: string | null;
  /** Filter — exclude this account ID (for transfer destination pickers) */
  excludeId?: string | null;
  onSelect: (account: Account) => void;
  title?: string;
};

export function AccountPickerSheet({
  visible,
  onDismiss,
  selectedId,
  excludeId,
  onSelect,
  title = 'Choose account',
}: AccountPickerSheetProps) {
  const theme = useTheme();
  const accounts = useActiveAccounts();
  const filtered = excludeId ? accounts.filter((a) => a.id !== excludeId) : accounts;

  return (
    <Sheet visible={visible} onDismiss={onDismiss} title={title}>
      {filtered.length === 0 ? (
        <EmptyState
          compact
          title="No accounts yet"
          description="Add an account first to assign transactions to it."
        />
      ) : (
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          {filtered.map((acct, i) => {
            const selected = acct.id === selectedId;
            return (
              <View key={acct.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    onSelect(acct);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.xs,
                    gap: theme.spacing.md,
                    opacity: pressed ? 0.7 : 1,
                  })}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: theme.radius.pill,
                      backgroundColor: acct.colorHex
                        ? `${acct.colorHex}22`
                        : theme.colors.surfaceSunken,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconFor
                      iconKey={acct.icon}
                      size={20}
                      color={acct.colorHex ?? theme.colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyMedium" numberOfLines={1}>
                      {acct.name}
                    </Text>
                    <Text variant="bodySm" color="textMuted" numberOfLines={1}>
                      {[
                        acct.bankName,
                        acct.accountNumberLast4
                          ? `•••• ${acct.accountNumberLast4}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || prettyType(acct.type)}
                    </Text>
                  </View>
                  <Text variant="numericMd" color={selected ? 'primary' : 'text'}>
                    {formatAmount(acct.currentBalance, acct.currency)}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Sheet>
  );
}

function prettyType(t: Account['type']): string {
  switch (t) {
    case 'cash': return 'Cash';
    case 'bank_savings': return 'Savings';
    case 'bank_current': return 'Current';
    case 'fixed_deposit': return 'Fixed deposit';
    case 'wallet': return 'Wallet';
    case 'credit_card': return 'Credit card';
    case 'loan': return 'Loan';
    case 'investment': return 'Investment';
    default: return 'Other';
  }
}