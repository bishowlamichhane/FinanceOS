import { createZodDto } from 'nestjs-zod';
import {
  createTransactionFlatSchema,
  updateTransactionSchema,
  transactionFiltersSchema,
} from '@finance-os/contracts';

export class CreateTransactionDto extends createZodDto(createTransactionFlatSchema) {}
export class UpdateTransactionDto extends createZodDto(updateTransactionSchema) {}
export class TransactionFiltersDto extends createZodDto(transactionFiltersSchema) {}