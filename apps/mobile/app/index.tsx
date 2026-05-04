import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/state/auth';

/**
 * Root index — auth gate.
 *
 * Reads status and routes:
 *   unauthenticated → /(auth)/welcome
 *   pin_locked      → /(auth)/unlock-pin
 *   authenticated   → /(app)
 */
export default function Index() {
  const status = useAuthStore((s) => s.status);

  if (status === 'bootstrapping') return null;
  if (status === 'unauthenticated') return <Redirect href="/(auth)/welcome" />;
  if (status === 'pin_locked') return <Redirect href="/(auth)/unlock-pin" />;
  return <Redirect href="/(app)" />;
}
