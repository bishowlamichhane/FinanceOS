import { Pressable, View, type ViewStyle, type StyleProp } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { haptics } from '@/lib/haptics';
import { Text } from './Text';

const PALETTE: Array<{ key: string; hex: string }> = [
  { key: 'indigo', hex: '#4F46E5' },
  { key: 'blue', hex: '#3B6FE0' },
  { key: 'sky', hex: '#0EA5E9' },
  { key: 'teal', hex: '#14B8A6' },
  { key: 'emerald', hex: '#10B981' },
  { key: 'lime', hex: '#84CC16' },
  { key: 'amber', hex: '#F59E0B' },
  { key: 'orange', hex: '#E27744' },
  { key: 'rose', hex: '#F43F5E' },
  { key: 'pink', hex: '#EC4899' },
  { key: 'violet', hex: '#8B5CF6' },
  { key: 'slate', hex: '#94A3B8' },
];

export type ColorPickerProps = {
  label?: string;
  value: string | null;
  onChange: (hex: string) => void;
  style?: StyleProp<ViewStyle>;
};

export function ColorPicker({ label, value, onChange, style }: ColorPickerProps) {
  const theme = useTheme();

  return (
    <View style={style}>
      {label ? (
        <Text
          variant="bodySmMedium"
          color="textMuted"
          style={{ marginBottom: theme.spacing.sm }}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
        }}
      >
        {PALETTE.map((c) => {
          const selected = value?.toLowerCase() === c.hex.toLowerCase();
          return (
            <Pressable
              key={c.key}
              onPress={() => {
                haptics.selection();
                onChange(c.hex);
              }}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: theme.radius.pill,
                backgroundColor: c.hex,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: selected ? 3 : 0,
                borderColor: theme.colors.bg,
                opacity: pressed ? 0.7 : 1,
                ...(selected ? theme.elevation.md : {}),
              })}
              accessibilityLabel={`${c.key} color`}
              accessibilityState={{ selected }}
            >
              {selected ? <Check size={16} color="#FFFFFF" /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const COLOR_PRESETS = PALETTE;