import { z } from 'zod';
import { idSchema, isoDateTimeSchema } from './common';

/**
 * Auth contracts.
 *
 * Password rules: 10+ chars, at least one number. We don't enforce special
 * characters — that's security theatre. Length matters more.
 */

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .regex(/\d/, 'Password must contain at least one number');

export const emailSchema = z.string().email().toLowerCase().max(255);

// --- Register

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(100),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

// --- Login

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  /** Device fingerprint, optional but recommended. Used for session naming. */
  deviceName: z.string().max(100).optional(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

// --- Tokens

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  /** UNIX seconds */
  accessTokenExpiresAt: z.number(),
  refreshTokenExpiresAt: z.number(),
});

export type AuthTokens = z.infer<typeof authTokensSchema>;

// --- User profile in auth response

export const authUserSchema = z.object({
  id: idSchema,
  email: emailSchema,
  name: z.string(),
  emailVerifiedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});

export type AuthUser = z.infer<typeof authUserSchema>;

// --- Login / register response

export const authResponseSchema = z.object({
  user: authUserSchema,
  tokens: authTokensSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// --- Refresh

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

// --- Forgot / reset password

export const forgotPasswordRequestSchema = z.object({
  email: emailSchema,
});

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

// --- Sessions

export const sessionSchema = z.object({
  id: idSchema,
  deviceName: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  current: z.boolean(),
  createdAt: isoDateTimeSchema,
  lastSeenAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
});

export type Session = z.infer<typeof sessionSchema>;
