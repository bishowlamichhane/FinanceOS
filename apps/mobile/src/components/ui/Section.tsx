import { View, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import type { ReactNode } from 'react';

export type SectionProps = {
  /** Caps label rendered above the content. e.g. "RECENT ACTIVITY" */
  title?: string;
  /** Optional element rendered to the right of the title (e.g. "See all" link) */
  trailing?: ReactNode;
  /** Optional helper sentence shown under the title */
  description?: string;
  /** Vertical gap above the section. Defaults to 'xl' (24px). */
  topGap?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const GAP_MAP = { none: 0, sm: 8, md: 12, lg: 20, xl: 24, xxl: 32 } as const;

/**
 * Section — top-level grouping on a screen.
 *
 *   <Section title="ACCOUNTS" trailing={<Link>See all</Link>}>
 *     <Stack gap="md">
 *       <AccountCard ... />
 *       <AccountCard ... />
 *     </Stack>
 *   </Section>
 *
 * Spacing rules built in:
 *   - Title gets a 12px gap before content
 *   - Each Section has 24px (xl) gap above by default
 *   - Title is rendered in `labelCaps` color `textMuted` for consistent voice
 */
export function Section({
  title,
  trailing,
  description,
  topGap = 'xl',
  children,
  style,
}: SectionProps) {
  const theme = useTheme();

  return (
    <View style={[{ marginTop: GAP_MAP[topGap] }, style]}>
      {title || trailing ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.md,
          }}
        >
          {title ? (
            <Text variant="labelCaps" color="textMuted">
              {title.toUpperCase()}
            </Text>
          ) : (
            <View />
          )}
          {trailing}
        </View>
      ) : null}

      {description ? (
        <Text
          variant="bodySm"
          color="textMuted"
          style={{ marginBottom: theme.spacing.md }}
        >
          {description}
        </Text>
      ) : null}

      {children}
    </View>
  );
}