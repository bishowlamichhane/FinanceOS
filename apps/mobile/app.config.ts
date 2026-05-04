import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Finance OS',
  slug: 'finance-os',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'financeos',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,

  updates: {
    url: 'https://u.expo.dev/0c93a157-deaf-4d9e-b1f5-996992867d23',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },

  splash: {

    resizeMode: 'contain',
    backgroundColor: '#0F1822', // matches dark theme bg
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.financeos.nepal',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSFaceIDUsageDescription:
        'Finance OS uses Face ID to quickly unlock the app while keeping your data private.',
    },
  },
  android: {
    package: 'com.financeos.nepal',
 
    softwareKeyboardLayoutMode: 'pan',
  },
  web: {
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    [
      'expo-local-authentication',
      {
        faceIDPermission:
          'Finance OS uses Face ID to quickly unlock the app while keeping your data private.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '0c93a157-deaf-4d9e-b1f5-996992867d23',
    },
  },
};

export default config;
