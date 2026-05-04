import { useState } from 'react';
import { Modal, Pressable, View, type ViewStyle, type StyleProp } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';
import { Text } from './Text';
import { Button } from './Button';

export type DateFieldProps = {
  label?: string;
  value: Date;
  onChange: (d: Date) => void;
  /** Maximum selectable date. Defaults to today. */
  maxDate?: Date;
  style?: StyleProp<ViewStyle>;
};

/**
 * DateField — tap to open a sheet with quick chips + 28-day grid.
 *
 * Self-contained: no external date picker library. The Modal-based sheet
 * keeps things native-feeling without pulling in a native module that
 * would complicate Expo Go.
 */
export function DateField({ label, value, onChange, maxDate, style }: DateFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const max = maxDate ?? new Date();
  const display = formatDate(value);

  return (
    <View style={style}>
      {label ? (
        <Text
          variant="bodySmMedium"
          color="textMuted"
          style={{ marginBottom: theme.spacing.xs }}
        >
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={() => {
          haptics.tap();
          setOpen(true);
        }}
        style={{
          height: theme.sizing.inputHeight,
          paddingHorizontal: theme.spacing.base,
          borderRadius: theme.radius.lg,
          borderWidth: 1.5,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceSunken,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
        accessibilityRole="button"
        accessibilityLabel={`Date: ${display}`}
      >
        <Calendar size={18} color={theme.colors.textMuted} />
        <Text variant="body" style={{ flex: 1 }}>
          {display}
        </Text>
      </Pressable>

      <DatePickerSheet
        visible={open}
        value={value}
        onClose={() => setOpen(false)}
        onSelect={(d) => {
          onChange(d);
          setOpen(false);
        }}
        maxDate={max}
      />
    </View>
  );
}

function DatePickerSheet({
  visible,
  value,
  onClose,
  onSelect,
  maxDate,
}: {
  visible: boolean;
  value: Date;
  onClose: () => void;
  onSelect: (d: Date) => void;
  maxDate: Date;
}) {
  const theme = useTheme();
  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);
  const grid: Date[] = Array.from({ length: 28 }, (_, i) => addDays(today, -i));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.overlay,
          justifyContent: 'flex-end',
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: theme.colors.bgElevated,
            borderTopLeftRadius: theme.radius.xxl,
            borderTopRightRadius: theme.radius.xxl,
            padding: theme.spacing.xl,
            paddingBottom: theme.spacing.huge,
            ...theme.elevation.xl,
          }}
        >
          <Text variant="h4" align="center" style={{ marginBottom: theme.spacing.lg }}>
            Pick a date
          </Text>

          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing.sm,
              marginBottom: theme.spacing.lg,
            }}
          >
            <DateChip
              label="Today"
              active={isSameDay(value, today)}
              onPress={() => onSelect(today)}
            />
            <DateChip
              label="Yesterday"
              active={isSameDay(value, yesterday)}
              onPress={() => onSelect(yesterday)}
            />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
            {grid.map((d) => {
              const active = isSameDay(value, d);
              const disabled = d > maxDate;
              return (
                <Pressable
                  key={d.toISOString()}
                  onPress={() => {
                    if (!disabled) {
                      haptics.tap();
                      onSelect(d);
                    }
                  }}
                  disabled={disabled}
                  style={({ pressed }) => ({
                    width: '23%',
                    paddingVertical: theme.spacing.sm,
                    borderRadius: theme.radius.md,
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : disabled ? 0.3 : 1,
                  })}
                >
                  <Text
                    variant="bodySm"
                    style={{
                      color: active ? theme.colors.textOnPrimary : theme.colors.textMuted,
                    }}
                  >
                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text
                    variant="numericMd"
                    style={{
                      color: active ? theme.colors.textOnPrimary : theme.colors.text,
                      marginTop: 2,
                    }}
                  >
                    {d.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Button
            label="Cancel"
            variant="ghost"
            onPress={onClose}
            style={{ marginTop: theme.spacing.lg }}
          />
        </View>
      </View>
    </Modal>
  );
}

function DateChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.lg,
        backgroundColor: active ? theme.colors.primaryMuted : theme.colors.surface,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : 'transparent',
        alignItems: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        variant="bodySmMedium"
        style={{ color: active ? theme.colors.primary : theme.colors.text }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function startOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}
function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function formatDate(d: Date): string {
  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);
  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}