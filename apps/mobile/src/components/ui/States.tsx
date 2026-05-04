import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';
import { Button } from './Button';
import type { ReactNode } from 'react';

export type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: ViewStyle;
  compact?: boolean;
};

/**
 * Standardized empty state. Use whenever a screen's data fetch returns nothing.
 * Always provide an action — empty without a way forward is bad UX.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
  compact,
}: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          alignItems: 'center',
          padding: compact ? theme.spacing.lg : theme.spacing.xxxl,
          gap: theme.spacing.md,
        },
        style,
      ]}
    >
      {icon ? (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: theme.spacing.xs,
          }}
        >
          {icon}
        </View>
      ) : null}
      <Text variant={compact ? 'h4' : 'h3'} align="center">
        {title}
      </Text>
      {description ? (
        <Text
          variant="body"
          color="textMuted"
          align="center"
          style={{ maxWidth: 320, marginBottom: theme.spacing.sm }}
        >
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="primary" />
      ) : null}
      {secondaryActionLabel && onSecondaryAction ? (
        <Button label={secondaryActionLabel} onPress={onSecondaryAction} variant="ghost" />
      ) : null}
    </View>
  );
}

export type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
  compact?: boolean;
};

/**
 * Error state with retry. Used in screens where a network call failed.
 * Title defaults are non-alarming — if it's a 5xx the user doesn't need
 * the technical detail; just an option to try again.
 */
export function ErrorState({
  title = "We couldn't load that",
  description = 'Check your connection and try again.',
  onRetry,
  retryLabel = 'Try again',
  style,
  compact,
}: ErrorStateProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          alignItems: 'center',
          padding: compact ? theme.spacing.lg : theme.spacing.xxxl,
          gap: theme.spacing.md,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.dangerMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="display" color="danger" style={{ fontSize: 28, lineHeight: 32 }}>
          !
        </Text>
      </View>
      <Text variant={compact ? 'h4' : 'h3'} align="center">
        {title}
      </Text>
      <Text variant="body" color="textMuted" align="center" style={{ maxWidth: 320 }}>
        {description}
      </Text>
      {onRetry ? <Button label={retryLabel} variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}
