import {
    Pressable,
    ScrollView,
    View,
    type ViewStyle,
    type StyleProp,
  } from 'react-native';
  import {
    Banknote,
    Briefcase,
    Building2,
    Bus,
    Car,
    Coffee,
    CreditCard,
    Film,
    Gamepad2,
    Gift,
    GraduationCap,
    HeartPulse,
    Home,
    Landmark,
    Laptop,
    type LucideIcon,
    Percent,
    PiggyBank,
    Plane,
    Pizza,
    ShoppingBag,
    ShoppingCart,
    Smartphone,
    Sparkles,
    Tag,
    TrendingUp,
    Tv,
    Utensils,
    Wallet,
    Zap,
  } from 'lucide-react-native';
  import { useTheme } from '@/theme/ThemeProvider';
  import { haptics } from '@/lib/haptics';
  import { Text } from './Text';
  
  /**
   * IconPicker — curated set of lucide icons.
   *
   * Each icon is registered by a stable string key so it can be persisted
   * in the database. Same key + IconFor() to render anywhere.
   */
  
  export const ICON_REGISTRY: Record<string, LucideIcon> = {
    // Money / accounts
    wallet: Wallet,
    banknote: Banknote,
    'piggy-bank': PiggyBank,
    'credit-card': CreditCard,
    building: Building2,
    landmark: Landmark,
    smartphone: Smartphone,
    // Income
    briefcase: Briefcase,
    laptop: Laptop,
    'trending-up': TrendingUp,
    percent: Percent,
    gift: Gift,
    // Daily expense
    'shopping-cart': ShoppingCart,
    'shopping-bag': ShoppingBag,
    utensils: Utensils,
    pizza: Pizza,
    coffee: Coffee,
    car: Car,
    bus: Bus,
    plane: Plane,
    home: Home,
    zap: Zap,
    'heart-pulse': HeartPulse,
    // Lifestyle
    film: Film,
    tv: Tv,
    'gamepad-2': Gamepad2,
    'graduation-cap': GraduationCap,
    // Generic
    sparkles: Sparkles,
    tag: Tag,
  };
  
  export const ICON_KEYS = Object.keys(ICON_REGISTRY);
  
  /**
   * Render an icon by its registered key.
   * Falls back to a generic tag icon if unrecognized.
   */
  export function IconFor({
    iconKey,
    size = 20,
    color,
  }: {
    iconKey: string;
    size?: number;
    color: string;
  }): JSX.Element {
    const Icon = ICON_REGISTRY[iconKey] ?? Tag;
    return <Icon size={size} color={color} />;
  }
  
  export type IconPickerProps = {
    label?: string;
    value: string;
    onChange: (key: string) => void;
    /** Tints the selected icon background. Default: theme.primary. */
    accentColor?: string;
    style?: StyleProp<ViewStyle>;
  };
  
  export function IconPicker({
    label,
    value,
    onChange,
    accentColor,
    style,
  }: IconPickerProps) {
    const theme = useTheme();
    const tint = accentColor ?? theme.colors.primary;
  
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
          }}
        >
          {ICON_KEYS.map((key) => {
            const selected = key === value;
            const Icon = ICON_REGISTRY[key]!;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  haptics.selection();
                  onChange(key);
                }}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: theme.radius.lg,
                  backgroundColor: selected ? `${tint}22` : theme.colors.surfaceSunken,
                  borderWidth: selected ? 1.5 : 0,
                  borderColor: tint,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
                accessibilityLabel={`${key} icon`}
                accessibilityState={{ selected }}
              >
                <Icon size={20} color={selected ? tint : theme.colors.textMuted} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }