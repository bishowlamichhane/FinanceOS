import { createZodDto } from 'nestjs-zod';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryFiltersSchema,
} from '@finance-os/contracts';

export class CreateCategoryDto extends createZodDto(createCategorySchema) {}
export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}
export class CategoryFiltersDto extends createZodDto(categoryFiltersSchema) {}