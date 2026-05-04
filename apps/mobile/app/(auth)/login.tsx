import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { Button, Input, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/state/auth';
import { apiErrorMessage } from '@/api/queryClient';
import { haptics } from '@/lib/haptics';
import { loginRequestSchema } from '@finance-os/contracts';
import type { z } from 'zod';

type LoginForm = z.infer<typeof loginRequestSchema>;

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signIn = useAuthStore((s) => s.signIn);

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  async function onSubmit(values: LoginForm) {
    setSubmitting(true);
    setTopError(null);
    try {
      // Validate before sending — gives nicer per-field errors
      const parsed = loginRequestSchema.parse(values);
      await signIn({ email: parsed.email, password: parsed.password });
      haptics.success();
      router.replace('/(app)');
    } catch (err) {
      haptics.error();
      setTopError(apiErrorMessage(err, 'Sign in failed. Please try again.'));
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

        <View style={{ marginBottom: theme.spacing.xxl }}>
          <Text variant="h1">Welcome back</Text>
          <Text variant="bodyLg" color="textMuted" style={{ marginTop: theme.spacing.xs }}>
            Sign in to continue managing your money.
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

        <View style={{ gap: theme.spacing.lg }}>
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
                textContentType="emailAddress"
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={{ required: 'Password is required' }}
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Password"
                placeholder="Your password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                error={errors.password?.message}
                rightIcon={
                  showPassword ? (
                    <EyeOff size={20} color={theme.colors.textMuted} />
                  ) : (
                    <Eye size={20} color={theme.colors.textMuted} />
                  )
                }
                onRightIconPress={() => setShowPassword((s) => !s)}
              />
            )}
          />

          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            hitSlop={8}
            style={{ alignSelf: 'flex-end' }}
          >
            <Text variant="bodySmMedium" color="primary">
              Forgot password?
            </Text>
          </Pressable>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xxl }}>
          <Button
            label="Sign in"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            onPress={handleSubmit(onSubmit)}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            <Text variant="bodySm" color="textMuted">
              New here?
            </Text>
            <Pressable onPress={() => router.replace('/(auth)/register')} hitSlop={8}>
              <Text variant="bodySmMedium" color="primary">
                Create an account
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
