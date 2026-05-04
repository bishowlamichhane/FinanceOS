import { Pressable, ScrollView, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCategories } from '@/hooks/useCategories';
import { Sheet, Text, EmptyState, IconFor } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import type { Category, CategoryType } from '@finance-os/contracts';

export type CategoryPickerSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  selectedId?: string | null;
  /** Filter to a single category type ('income' | 'expense' | 'transfer') */
  type?: CategoryType;
  onSelect: (category: Category) => void;
  /** Optional: surface a "+ New category" tile that calls this */
  onCreateNew?: () => void;
  title?: string;
};

export function CategoryPickerSheet({
  visible,
  onDismiss,
  selectedId,
  type,
  onSelect,
  onCreateNew,
  title = 'Choose category',
}: CategoryPickerSheetProps) {
  const theme = useTheme();
  const { data: categories = [], isLoading } = useCategories({ type });

  const visibleCategories = categories.filter((c) => !c.archived);

  return (
    <Sheet visible={visible} onDismiss={onDismiss} title={title}>
      {isLoading ? (
        <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center' }}>
          <Text variant="bodySm" color="textMuted">
            Loading categories…
          </Text>
        </View>
      ) : visibleCategories.length === 0 ? (
        <EmptyState
          compact
          title="No categories yet"
          description={`Add a ${type ?? ''} category to track your activity.`}
          actionLabel={onCreateNew ? 'New category' : undefined}
          onAction={onCreateNew}
        />
      ) : (
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: theme.spacing.sm,
            }}
          >
            {visibleCategories.map((cat) => {
              const selected = cat.id === selectedId;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    haptics.tap();
                    onSelect(cat);
                  }}
                  style={({ pressed }) => ({
                    width: '31%',
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.xs,
                    borderRadius: theme.radius.lg,
                    backgroundColor: selected
                      ? `${cat.colorHex}22`
                      : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: selected ? cat.colorHex : theme.colors.borderSubtle,
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    opacity: pressed ? 0.7 : 1,
                  })}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: theme.radius.pill,
                      backgroundColor: cat.colorHex,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconFor iconKey={cat.icon} size={18} color="#FFFFFF" />
                  </View>
                  <Text variant="caption" align="center" numberOfLines={1}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}

            {onCreateNew ? (
              <Pressable
                onPress={() => {
                  haptics.tap();
                  onCreateNew();
                }}
                style={({ pressed }) => ({
                  width: '31%',
                  paddingVertical: theme.spacing.md,
                  paddingHorizontal: theme.spacing.xs,
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.borderSubtle,
                  borderStyle: 'dashed',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.surfaceSunken,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={18} color={theme.colors.textMuted} />
                </View>
                <Text variant="caption" color="textMuted" align="center">
                  New
                </Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      )}
    </Sheet>
  );
}