import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeft, MailCheck } from 'lucide-react-native';
import { Button, Input, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { authApi } from '@/api/auth';
import { apiErrorMessage } from '@/api/queryClient';
import { haptics } from '@/lib/haptics';

type Form = { email: string };

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ defaultValues: { email: '' }, mode: 'onBlur' });

  async function onSubmit(values: Form) {
    setSubmitting(true);
    setTopError(null);
    try {
      await authApi.forgotPassword(values.email);
      haptics.success();
      setDone(true);
    } catch (err) {
      haptics.error();
      setTopError(apiErrorMessage(err, "We couldn't send the reset link."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: Math.max(insets.bottom, theme.spacing.xl),
          paddingHorizontal: theme.spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: theme.spacing.xl,
          }}
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </Pressable>

        {done ? (
          <View style={{ alignItems: 'center', paddingTop: theme.spacing.huge, gap: theme.spacing.md }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.successMuted,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <MailCheck size={32} color={theme.colors.success} />
            </View>
            <Text variant="h2" align="center" style={{ marginTop: theme.spacing.md }}>
              Check your inbox
            </Text>
            <Text variant="body" color="textMuted" align="center" style={{ maxWidth: 320 }}>
              If that email is on our system, we've sent a link to reset your password. The link expires
              in one hour.
            </Text>
            <Button
              label="Back to sign in"
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: theme.spacing.xl }}
              onPress={() => router.replace('/(auth)/login')}
            />
          </View>
        ) : (
          <>
            <View style={{ marginBottom: theme.spacing.xxl }}>
              <Text variant="h1">Reset your password</Text>
              <Text variant="bodyLg" color="textMuted" style={{ marginTop: theme.spacing.xs }}>
                Enter the email associated with your account.
              </Text>
            </View>

            {topError ? (
              <View
                style={{
                  padding: theme.spacing.base,
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.dangerMuted,
                  marginBottom: theme.spacing.lg,
                }}
              >
                <Text variant="bodySm" color="danger">
                  {topError}
                </Text>
              </View>
            ) : null}

            <Controller
              control={control}
              name="email"
              rules={{
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email',
                },
              }}
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.email?.message}
                />
              )}
            />

            <View style={{ flex: 1 }} />

            <Button
              label="Send reset link"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              onPress={handleSubmit(onSubmit)}
              style={{ marginTop: theme.spacing.xxl }}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
