import { createZodDto } from 'nestjs-zod';
import {
  createBudgetSchema,
  updateBudgetSchema,
} from '@finance-os/contracts';

export class CreateBudgetDto extends createZodDto(createBudgetSchema) {}
export class UpdateBudgetDto extends createZodDto(updateBudgetSchema) {}
