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
import { registerRequestSchema } from '@finance-os/contracts';
import type { z } from 'zod';

type RegisterForm = z.infer<typeof registerRequestSchema>;

export default function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signUp = useAuthStore((s) => s.signUp);

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onBlur',
  });

  async function onSubmit(values: RegisterForm) {
    setSubmitting(true);
    setTopError(null);
    try {
      const parsed = registerRequestSchema.parse(values);
      await signUp(parsed);
      haptics.success();
      router.replace('/(auth)/create-pin');
    } catch (err) {
      haptics.error();
      setTopError(apiErrorMessage(err, 'Registration failed. Please try again.'));
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
          <Text variant="h1">Create your account</Text>
          <Text variant="bodyLg" color="textMuted" style={{ marginTop: theme.spacing.xs }}>
            All your finances, in one beautifully simple place.
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
            name="name"
            rules={{ required: 'Name is required', minLength: { value: 1, message: 'Required' } }}
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Name"
                placeholder="Your name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                textContentType="name"
                error={errors.name?.message}
              />
            )}
          />

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
            rules={{
              required: 'Password is required',
              minLength: { value: 10, message: 'At least 10 characters' },
              validate: (v) => /\d/.test(v) || 'Must contain at least one number',
            }}
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Password"
                placeholder="At least 10 characters"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry={!showPassword}
                autoComplete="password-new"
                textContentType="newPassword"
                helper={errors.password ? undefined : 'Use 10+ characters with at least one number'}
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
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.xxl }}>
          <Button
            label="Create account"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            onPress={handleSubmit(onSubmit)}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            <Text variant="bodySm" color="textMuted">
              Already have an account?
            </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
              <Text variant="bodySmMedium" color="primary">
                Sign in
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
