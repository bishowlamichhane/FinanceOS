import { forwardRef, useState } from 'react';
import {
  TextInput as RNTextInput,
  type TextInputProps,
  View,
  Pressable,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

export type InputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
};

/**
 * Input — labeled text field with three states (idle, focused, error).
 *
 * Convention: error string ALWAYS replaces helper string. Helper text never
 * shows alongside an error.
 */
export const Input = forwardRef<RNTextInput, InputProps>(function Input(
  {
    label,
    error,
    helper,
    leftIcon,
    rightIcon,
    onRightIconPress,
    containerStyle,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.border;

  const wrapStyle: ViewStyle = {
    height: theme.sizing.inputHeight,
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor,
    backgroundColor: theme.colors.surfaceSunken,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  };

  return (
    <View style={containerStyle}>
      {label ? (
        <Text
          variant="bodySmMedium"
          color="textMuted"
          style={{ marginBottom: theme.spacing.xs }}
        >
          {label}
        </Text>
      ) : null}

      <View style={wrapStyle}>
        {leftIcon}
        <RNTextInput
          ref={ref}
          {...rest}
          placeholderTextColor={theme.colors.textSubtle}
          style={[
            {
              flex: 1,
              ...theme.typography.body,
              color: theme.colors.text,
              padding: 0, // RN TextInput has default padding we don't want
            },
          ]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {rightIcon ? (
          onRightIconPress ? (
            <Pressable onPress={onRightIconPress} hitSlop={8}>
              {rightIcon}
            </Pressable>
          ) : (
            rightIcon
          )
        ) : null}
      </View>

      {error ? (
        <Text variant="bodySm" color="danger" style={{ marginTop: theme.spacing.xs }}>
          {error}
        </Text>
      ) : helper ? (
        <Text variant="bodySm" color="textMuted" style={{ marginTop: theme.spacing.xs }}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
});
