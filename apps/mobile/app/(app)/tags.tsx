import { useState } from 'react';
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
import { Plus, Trash2, X } from 'lucide-react-native';
import {
  Button,
  ColorPicker,
  EmptyState,
  ErrorState,
  ScreenHeader,
  Sheet,
  SkeletonList,
  Stack,
  Text,
} from '@/components/ui';
import { useCreateTag, useDeleteTag, useTags } from '@/hooks/useTags';
import { useTheme } from '@/theme/ThemeProvider';
import { apiErrorMessage } from '@/api/queryClient';
import { haptics } from '@/lib/haptics';
import type { Tag } from '@finance-os/contracts';

/**
 * Tags — manage user tags.
 *
 * Layout:
 *   - Header with title + Plus CTA
 *   - List rendered as a wrapping chip cloud (each chip has color dot + label
 *     + small × to remove)
 *   - Add via bottom sheet (name + color)
 *   - Tap × on chip → confirm delete
 */
export default function TagsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [adding, setAdding] = useState(false);

  const { data: tags = [], isLoading, isError, error, refetch } = useTags();
  const deleteMutation = useDeleteTag();

  function onDelete(tag: Tag) {
    Alert.alert(
      `Remove ${tag.name}?`,
      'Transactions tagged with this will lose the link, but won\'t be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(tag.id);
              haptics.success();
            } catch (e) {
              haptics.error();
              Alert.alert('Could not remove', apiErrorMessage(e, ''));
            }
          },
        },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <LinearGradient
        colors={theme.gradients.glow}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
        pointerEvents="none"
      />

      <ScreenHeader
        title="Tags"
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
            accessibilityLabel="Add tag"
          >
            <Plus size={18} color={theme.colors.accent} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.xl,
          paddingTop: theme.spacing.lg,
          paddingBottom: insets.bottom + theme.spacing.huge,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          variant="bodySm"
          color="textMuted"
          style={{ marginBottom: theme.spacing.lg }}
        >
          Tags are flexible labels for transactions — useful for grouping across
          categories (e.g. "Trip to Pokhara", "Tax-deductible").
        </Text>

        {isLoading ? (
          <SkeletonList count={4} />
        ) : isError ? (
          <ErrorState
            title="Couldn't load tags"
            description={apiErrorMessage(error, 'Pull down to retry.')}
            onRetry={() => void refetch()}
          />
        ) : tags.length === 0 ? (
          <View style={{ paddingTop: theme.spacing.xxxl }}>
            <EmptyState
              title="No tags yet"
              description="Add a tag the next time you log a transaction, or create one here."
              actionLabel="Add tag"
              onAction={() => setAdding(true)}
            />
          </View>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: theme.spacing.sm,
            }}
          >
            {tags.map((t) => (
              <TagChip key={t.id} tag={t} onRemove={() => onDelete(t)} />
            ))}
          </View>
        )}
      </ScrollView>

      <TagEditorSheet visible={adding} onDismiss={() => setAdding(false)} />
    </View>
  );
}

// ===========================================================================

function TagChip({ tag, onRemove }: { tag: Tag; onRemove: () => void }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingLeft: theme.spacing.md,
        paddingRight: theme.spacing.xs,
        paddingVertical: 6,
        borderRadius: theme.radius.pill,
        backgroundColor: `${tag.colorHex}1F`,
        borderWidth: 1,
        borderColor: `${tag.colorHex}55`,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: tag.colorHex,
        }}
      />
      <Text
        variant="bodySmMedium"
        style={{ color: theme.colors.text }}
      >
        {tag.name}
      </Text>
      <Pressable
        onPress={() => {
          haptics.tap();
          onRemove();
        }}
        hitSlop={6}
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${tag.name}`}
      >
        <X size={14} color={theme.colors.textMuted} />
      </Pressable>
    </View>
  );
}

// ===========================================================================

function TagEditorSheet({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const createMutation = useCreateTag();

  const [name, setName] = useState('');
  const [colorHex, setColorHex] = useState('#4F46E5');
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setError(null);
    if (!name.trim()) return;
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        colorHex,
      });
      haptics.success();
      setName('');
      setColorHex('#4F46E5');
      onDismiss();
    } catch (e) {
      haptics.error();
      setError(apiErrorMessage(e, 'Could not create tag'));
    }
  }

  return (
    <Sheet visible={visible} onDismiss={onDismiss} title="New tag">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Stack gap="lg">
          {/* Live preview */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
              alignSelf: 'flex-start',
              paddingLeft: theme.spacing.md,
              paddingRight: theme.spacing.md,
              paddingVertical: 6,
              borderRadius: theme.radius.pill,
              backgroundColor: `${colorHex}1F`,
              borderWidth: 1,
              borderColor: `${colorHex}55`,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colorHex,
              }}
            />
            <Text variant="bodySmMedium">{name.trim() || 'Tag name'}</Text>
          </View>

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
              placeholder="Trip to Pokhara, Tax-deductible..."
              placeholderTextColor={theme.colors.textSubtle}
              maxLength={40}
              autoFocus
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
            label="Create tag"
            variant="success"
            size="lg"
            fullWidth
            loading={createMutation.isPending}
            disabled={!name.trim()}
            onPress={onSave}
            style={{ borderRadius: theme.radius.xxl }}
          />
        </Stack>
      </KeyboardAvoidingView>
    </Sheet>
  );
}
