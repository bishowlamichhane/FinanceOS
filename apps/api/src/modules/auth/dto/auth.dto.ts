import { createZodDto } from 'nestjs-zod';
import {
  loginRequestSchema,
  registerRequestSchema,
  refreshRequestSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
} from '@finance-os/contracts';

/**
 * NestJS DTOs from shared Zod contracts.
 *
 * These get auto-validated by ZodValidationPipe and produce the right
 * Swagger schema. Single source of truth lives in the contracts package.
 */

export class RegisterDto extends createZodDto(registerRequestSchema) {}
export class LoginDto extends createZodDto(loginRequestSchema) {}
export class RefreshDto extends createZodDto(refreshRequestSchema) {}
export class ForgotPasswordDto extends createZodDto(forgotPasswordRequestSchema) {}
export class ResetPasswordDto extends createZodDto(resetPasswordRequestSchema) {}
