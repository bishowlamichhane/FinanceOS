import { Tabs, useRouter } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart3,
  Home,
  Plus,
  User,
  Wallet,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from '@/components/ui';
import { haptics } from '@/lib/haptics';

/**
 * Main tab navigator — 5 tabs with a raised center FAB for "Add".
 *
 * Order: Home / Wallet / + (FAB) / Stats / You
 *
 * The center "Add" button is overridden via `tabBarButton` so it renders as
 * a 54px elevated teal pill that lifts above the tab bar (-16px transform)
 * and routes to /transaction-form on press. The Add screen registration
 * exists only to claim a tab slot — its component immediately bounces.
 *
 * Hidden modal/detail routes are registered with `href: null`.
 */
export default function AppLayout() {
  const theme = useTheme();
  const router = useRouter();

  const tabBarBg =
    theme.name === 'dark' ? 'rgba(19, 24, 37, 0.92)' : 'rgba(255, 255, 255, 0.92)';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          height: theme.sizing.tabBarHeight + 20,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          borderTopColor: theme.colors.border,
          borderTopWidth: 0.5,
          backgroundColor: tabBarBg,
          elevation: 0,
          // Ensure the lifted FAB isn't clipped by the tab bar bounds (Android)
          overflow: 'visible',
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              tint={theme.name === 'dark' ? 'dark' : 'light'}
              intensity={50}
              style={{ flex: 1 }}
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: theme.colors.bgElevated }} />
          ),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarLabel: ({ color, focused, children }) => (
          <Text
            variant="labelCapsSm"
            style={{
              color,
              fontSize: 10,
              marginTop: 2,
              fontWeight: focused ? '700' : '500',
            }}
          >
            {children}
          </Text>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused}>
              <Home color={color} size={size - 2} strokeWidth={focused ? 2.4 : 1.8} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused}>
              <Wallet color={color} size={size - 2} strokeWidth={focused ? 2.4 : 1.8} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="transaction-form"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarButton: () => (
            <FabAddButton
              onPress={() => {
                haptics.tap();
                router.push('/(app)/transaction-form');
              }}
              accessibilityLabel="Add transaction"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused}>
              <BarChart3 color={color} size={size - 2} strokeWidth={focused ? 2.4 : 1.8} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'You',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon focused={focused}>
              <User color={color} size={size - 2} strokeWidth={focused ? 2.4 : 1.8} />
            </TabIcon>
          ),
        }}
      />

      {/* Hidden routes — addressable but not in tab bar */}
      <Tabs.Screen name="transactions" options={{ href: null }} />
      <Tabs.Screen name="account-form" options={{ href: null }} />
      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="tags" options={{ href: null }} />
      <Tabs.Screen name="budget" options={{ href: null }} />
      <Tabs.Screen name="assets" options={{ href: null }} />
      <Tabs.Screen name="investments" options={{ href: null }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="bills" options={{ href: null }} />
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
      <Tabs.Screen name="shared" options={{ href: null }} />
      <Tabs.Screen name="account/[id]" options={{ href: null }} />
    </Tabs>
  );
}

/** Adds a small upward lift on the active tab. */
function TabIcon({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ transform: [{ translateY: focused ? -2 : 0 }] }}>{children}</View>
  );
}

/**
 * The raised center FAB-style Add button. Replaces the default tabBarButton
 * for the `transaction-form` slot. Hardcoded teal bg + white icon so it
 * stays vibrant in both light and dark modes (the theme.primary mint in
 * dark was reading too soft and the dark icon-on-mint was disappearing).
 *
 * The 56px disc is fully circular (borderRadius 28) and lifts -18px above
 * the tab bar with a soft teal glow + Android elevation so it sits above
 * the BlurView/surface backdrop reliably on both platforms.
 */
function FabAddButton({
  onPress,
  accessibilityLabel,
}: {
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  // Use a teal gradient + extra-strong shadow + explicit zIndex so the disc
  // sits clearly above the tab bar's BlurView/surface backdrop in both
  // themes. Earlier solid fills were getting visually flattened against the
  // light-mode white tab bar.
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        elevation: 100,
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => ({
          width: 60,
          height: 60,
          borderRadius: 30,
          marginTop: -22,
          alignItems: 'center',
          justifyContent: 'center',
          // Heavy black shadow for unmistakable lift on light bg
          shadowColor: '#000',
          shadowOpacity: 0.32,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 18,
          transform: [{ scale: pressed ? 0.92 : 1 }],
          overflow: 'visible',
        })}
      >
        <LinearGradient
          colors={['#14B8A6', '#0D9488', '#0F766E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={30} color="#FFFFFF" strokeWidth={3} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}
