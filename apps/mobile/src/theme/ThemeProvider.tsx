import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { buildTheme, type Theme, type ThemeName } from '@finance-os/design-tokens';
import { storage } from '@/storage/mmkv';

/**
 * Theme provider.
 *
 * Behaviour:
 *  - Defaults to system color scheme on first launch
 *  - Saved override persists across launches via MMKV
 *  - exposes `setThemeName('dark' | 'light' | 'system')` for Settings
 *
 * The screen evidence puts this app firmly in dark-first territory, but
 * users get a real light theme if they want one.
 */

const STORAGE_KEY = 'theme.preference';
type Preference = 'dark' | 'light' | 'system';

type ThemeContextValue = {
  theme: Theme;
  themeName: ThemeName;
  preference: Preference;
  setPreference: (p: Preference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreference(): Preference {
  const stored = storage.getString(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<Preference>(() => readPreference());

  const themeName: ThemeName = useMemo(() => {
    if (preference === 'system') {
      return systemScheme === 'light' ? 'light' : 'dark';
    }
    return preference;
  }, [preference, systemScheme]);

  const theme = useMemo(() => buildTheme(themeName), [themeName]);

  // Persist preference changes
  useEffect(() => {
    storage.set(STORAGE_KEY, preference);
  }, [preference]);

  const value: ThemeContextValue = {
    theme,
    themeName,
    preference,
    setPreference: setPreferenceState,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx.theme;
}

export function useThemeControl(): Pick<ThemeContextValue, 'preference' | 'setPreference' | 'themeName'> {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeControl must be used within ThemeProvider');
  return { preference: ctx.preference, setPreference: ctx.setPreference, themeName: ctx.themeName };
}
