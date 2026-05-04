import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Plus, Trash2 } from 'lucide-react-native';
import {
  Button,
  ColorPicker,
  EmptyState,
  ErrorState,
  IconFor,
  IconPicker,
  ScreenHeader,
  SegmentedControl,
  Sheet,
  SkeletonList,
  Stack,
  Text,
} from '@/components/ui';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/useCategories';
import { useTheme } from '@/theme/ThemeProvider';
import { apiErrorMessage } from '@/api/queryClient';
import { haptics } from '@/lib/haptics';
import type { Category, CategoryType } from '@finance-os/contracts';

/**
 * Categories — manage user categories.
 *
 * Layout:
 *   - Atmospheric brand glow at top
 *   - Header with title + "Add" CTA
 *   - SegmentedControl: Expense | Income
 *   - List of categories grouped by type (selected via segmented control)
 *   - Tap a row → edit sheet (name, color, icon)
 *   - System categories (isSystem=true) can't be deleted, only hidden via archive
 *   - Add new category via sheet (Plus button)
 */
export default function CategoriesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeType, setActiveType] = useState<CategoryType>('expense');
  const [editing, setEditing] = useState<Category | null>(null);
  const [adding, setAdding] = useState(false);

  const { data: categories = [], isLoading, isError, error, refetch } =
    useCategories({});

  const filtered = useMemo(
    () => categories.filter((c) => c.type === activeType && !c.archived),
    [categories, activeType],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <LinearGradient
        colors={theme.gradients.glow}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 320,
        }}
        pointerEvents="none"
      />

      <ScreenHeader
        title="Categories"
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
            accessibilityLabel="Add category"
          >
            <Plus size={18} color={theme.colors.accent} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.xl,
          paddingTop: theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.huge,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedControl<CategoryType>
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
          value={activeType}
          onChange={setActiveType}
          style={{ marginBottom: theme.spacing.lg }}
        />

        {isLoading ? (
          <SkeletonList count={6} />
        ) : isError ? (
          <ErrorState
            title="Couldn't load categories"
            description={apiErrorMessage(error, 'Pull down to retry.')}
            onRetry={() => void refetch()}
          />
        ) : filtered.length === 0 ? (
          <View style={{ paddingTop: theme.spacing.huge }}>
            <EmptyState
              title={`No ${activeType} categories yet`}
              description="Categories help you organize transactions for budgeting and reporting."
              actionLabel="Add category"
              onAction={() => setAdding(true)}
            />
          </View>
        ) : (
          <Stack gap="sm">
            {filtered.map((c) => (
              <CategoryRow
                key={c.id}
                category={c}
                onPress={() => setEditing(c)}
              />
            ))}
          </Stack>
        )}
      </ScrollView>

      {/* Add sheet */}
      <CategoryEditorSheet
        visible={adding}
        mode="create"
        defaultType={activeType}
        onDismiss={() => setAdding(false)}
      />

      {/* Edit sheet */}
      <CategoryEditorSheet
        visible={!!editing}
        mode="edit"
        category={editing}
        onDismiss={() => setEditing(null)}
      />
    </View>
  );
}

// ===========================================================================

function CategoryRow({
  category,
  onPress,
}: {
  category: Category;
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.base,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.radius.xl,
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
          backgroundColor: `${category.colorHex}22`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconFor iconKey={category.icon} size={20} color={category.colorHex} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="bodySemiBold" numberOfLines={1}>
          {category.name}
        </Text>
        {category.isSystem ? (
          <Text variant="caption" color="textSubtle">
            System default
          </Text>
        ) : null}
      </View>
      <ChevronRight size={18} color={theme.colors.textSubtle} />
    </Pressable>
  );
}

// ===========================================================================

const DEFAULT_COLOR = '#4F46E5';
const DEFAULT_ICON = 'tag';

function CategoryEditorSheet({
  visible,
  mode,
  category,
  defaultType,
  onDismiss,
}: {
  visible: boolean;
  mode: 'create' | 'edit';
  category?: Category | null;
  defaultType?: CategoryType;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [colorHex, setColorHex] = useState(DEFAULT_COLOR);
  const [type, setType] = useState<CategoryType>(defaultType ?? 'expense');
  const [error, setError] = useState<string | null>(null);

  // Hydrate when opening for edit
  useMemo(() => {
    if (mode === 'edit' && category) {
      setName(category.name);
      setIcon(category.icon);
      setColorHex(category.colorHex);
      setType(category.type);
      setError(null);
    } else if (mode === 'create') {
      setName('');
      setIcon(DEFAULT_ICON);
      setColorHex(DEFAULT_COLOR);
      setType(defaultType ?? 'expense');
      setError(null);
    }
  }, [mode, category, defaultType]);

  const isValid = name.trim().length > 0;
  const isPending = createMutation.isPending || updateMutation.isPending;
  const canDelete = mode === 'edit' && category && !category.isSystem;

  async function onSave() {
    setError(null);
    if (!isValid) return;
    try {
      if (mode === 'edit' && category) {
        await updateMutation.mutateAsync({
          id: category.id,
          payload: { name: name.trim(), icon, colorHex, type },
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          icon,
          colorHex,
          type,
        });
      }
      haptics.success();
      onDismiss();
    } catch (e) {
      haptics.error();
      setError(apiErrorMessage(e, 'Could not save category'));
    }
  }

  function onDelete() {
    if (!category) return;
    Alert.alert(
      `Delete ${category.name}?`,
      'Transactions tagged with this category will lose the link, but won\'t be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(category.id);
              haptics.success();
              onDismiss();
            } catch (e) {
              haptics.error();
              setError(apiErrorMessage(e, 'Could not delete category'));
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
      title={mode === 'edit' ? 'Edit category' : 'New category'}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Stack gap="lg">
          {/* Live preview */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              paddingHorizontal: theme.spacing.base,
              paddingVertical: theme.spacing.md,
              borderRadius: theme.radius.xl,
              backgroundColor: `${colorHex}11`,
              borderWidth: 1,
              borderColor: `${colorHex}44`,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: theme.radius.md,
                backgroundColor: `${colorHex}22`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconFor iconKey={icon} size={20} color={colorHex} />
            </View>
            <Text variant="bodySemiBold" numberOfLines={1} style={{ flex: 1 }}>
              {name.trim() || 'Category name'}
            </Text>
          </View>

          {/* Type — only when creating */}
          {mode === 'create' ? (
            <View>
              <Text
                variant="labelCapsSm"
                color="textMuted"
                style={{ marginBottom: theme.spacing.sm }}
              >
                TYPE
              </Text>
              <SegmentedControl<CategoryType>
                options={[
                  { value: 'expense', label: 'Expense' },
                  { value: 'income', label: 'Income' },
                ]}
                value={type}
                onChange={setType}
              />
            </View>
          ) : null}

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
              placeholder="Groceries, Salary, Petrol..."
              placeholderTextColor={theme.colors.textSubtle}
              maxLength={60}
              style={{
                height: theme.sizing.inputHeight,
                paddingHorizontal: theme.spacing.base,
                borderRadius: theme.radius.lg,
                borderWidth: 1.5,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceSunken,
                color: theme.colors.text,
                ...theme.typography.body,
              }}
            />
          </View>

          {/* Color */}
          <ColorPicker label="COLOR" value={colorHex} onChange={setColorHex} />

          {/* Icon */}
          <IconPicker
            label="ICON"
            value={icon}
            onChange={setIcon}
            accentColor={colorHex}
          />

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
            {canDelete ? (
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
                accessibilityLabel="Delete category"
              >
                <Trash2 size={20} color={theme.colors.danger} />
              </Pressable>
            ) : null}
            <Button
              label={mode === 'edit' ? 'Save changes' : 'Create category'}
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
    </Sheet>
  );
}
