import 'react-native-gesture-handler'; // must be first
import '../global.css';

import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useFonts } from 'expo-font';
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/state/auth';
import { queryClient } from '@/api/queryClient';
import { View } from 'react-native';

// Keep splash up while we load fonts + bootstrap auth
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore — already hidden */
});
// Set initial bg so there's no white flash before theme provider mounts
SystemUI.setBackgroundColorAsync('#0F1822').catch(() => {});

function ThemedApp() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_500Medium,
  });

  const [bootstrapped, setBootstrapped] = useState(false);

  // Bootstrap auth state once
// Bootstrap auth state once
useEffect(() => {
  let cancelled = false;
  void (async () => {
    const { storage } = await import('@/storage/mmkv');
    await storage.hydrate();
    await useAuthStore.getState().bootstrap();
    if (!cancelled) setBootstrapped(true);
  })();
  return () => {
    cancelled = true;
  };
}, []);

  // Hide splash when both ready
  useEffect(() => {
    const ready = (fontsLoaded || fontError) && bootstrapped;
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, bootstrapped]);

  if (!fontsLoaded && !fontError) return null;
  if (!bootstrapped) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ThemedApp />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
