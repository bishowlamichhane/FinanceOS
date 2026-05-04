import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, Text } from '@/components/ui';
import type { ReactNode } from 'react';

export type PhasePlaceholderProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  phase: 'Phase 2' | 'Phase 3' | 'Phase 4' | 'Phase 5';
  features: string[];
};

/**
 * Phase placeholder.
 *
 * Used by tabs that aren't yet implemented. Shows what's coming in design
 * language consistent with the rest of the app — never a wall of text or
 * a basic spinner.
 */
export function PhasePlaceholder({ title, subtitle, icon, phase, features }: PhasePlaceholderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.lg,
        paddingHorizontal: theme.spacing.xl,
        paddingBottom: theme.sizing.tabBarHeight + theme.spacing.huge,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.xl,
        }}
      >
        <Text variant="h2">{title}</Text>
        <Badge label={phase} intent="primary" />
      </View>

      <Card padding="lg" style={{ gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: theme.radius.xl,
            backgroundColor: theme.colors.primaryMuted,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {icon}
        </View>
        <Text variant="h3">Coming next</Text>
        <Text variant="body" color="textMuted">
          {subtitle}
        </Text>
      </Card>

      <Text
        variant="labelCaps"
        color="textMuted"
        style={{ marginBottom: theme.spacing.md, marginTop: theme.spacing.sm }}
      >
        WHAT YOU'LL GET
      </Text>

      <Card padding="none" style={{ paddingVertical: theme.spacing.xs }}>
        {features.map((f, i) => (
          <View key={f}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.base,
                gap: theme.spacing.md,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.primary,
                }}
              />
              <Text variant="body" style={{ flex: 1 }}>
                {f}
              </Text>
            </View>
            {i < features.length - 1 ? (
              <View
                style={{
                  height: 1,
                  marginLeft: theme.spacing.base + 6 + theme.spacing.md,
                  backgroundColor: theme.colors.borderSubtle,
                }}
              />
            ) : null}
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
