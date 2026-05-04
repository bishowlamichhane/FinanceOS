import { View, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from './Card';
import { Text } from './Text';
import { Skeleton } from './Skeleton';

export type StatCardProps = {
  /** Caps label above the value, e.g. "MONTHLY SAVINGS" */
  label: string;
  /** Pre-formatted value, e.g. "Rs 1,24,500" — formatting happens upstream */
  value: string;
  /** Optional delta string, e.g. "+12.4%" */
  delta?: string;
  /** delta semantic intent — drives color */
  deltaTrend?: 'up' | 'down' | 'flat';
  /** Optional secondary text under the value */
  caption?: string;
  loading?: boolean;
  /** Visual prominence — `hero` is the big net-worth card */
  size?: 'hero' | 'default';
  style?: StyleProp<ViewStyle>;
};

/**
 * StatCard.
 *
 * The dashboard's primary data unit. Keep these dense and scannable —
 * resist the urge to add icons unless the label needs disambiguation.
 */
export function StatCard({
  label,
  value,
  delta,
  deltaTrend,
  caption,
  loading,
  size = 'default',
  style,
}: StatCardProps) {
  const theme = useTheme();
  const isHero = size === 'hero';

  const deltaColor =
    deltaTrend === 'up'
      ? theme.colors.success
      : deltaTrend === 'down'
        ? theme.colors.danger
        : theme.colors.textMuted;

  return (
    <Card
      style={[
        {
          minHeight: isHero ? 140 : 96,
          gap: theme.spacing.xs,
        },
        style,
      ]}
      padding={isHero ? 'lg' : 'base'}
    >
      <Text variant="labelCapsSm" color="textMuted">
        {label}
      </Text>

      {loading ? (
        <Skeleton height={isHero ? 36 : 24} width="60%" />
      ) : (
        <Text variant={isHero ? 'numericXl' : 'numericLg'}>{value}</Text>
      )}

      {(delta || caption) && !loading ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            marginTop: theme.spacing.xxs,
          }}
        >
          {delta ? (
            <Text variant="bodySmMedium" style={{ color: deltaColor }}>
              {delta}
            </Text>
          ) : null}
          {caption ? (
            <Text variant="bodySm" color="textMuted">
              {caption}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
