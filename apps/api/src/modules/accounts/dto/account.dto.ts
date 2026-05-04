import { createZodDto } from 'nestjs-zod';
import {
  createAccountSchema,
  updateAccountSchema,
  transferRequestSchema,
} from '@finance-os/contracts';

export class CreateAccountDto extends createZodDto(createAccountSchema) {}
export class UpdateAccountDto extends createZodDto(updateAccountSchema) {}
export class TransferDto extends createZodDto(transferRequestSchema) {}