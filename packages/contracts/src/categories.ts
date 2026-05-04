import { z } from 'zod';
import { idSchema, isoDateTimeSchema } from './common';

/**
 * Category contracts.
 *
 * Categories are user-scoped. System-seeded ones (default Salary, Food, etc.)
 * have isSystem=true and can be hidden but not deleted.
 */

export const categoryTypeSchema = z.enum(['income', 'expense', 'transfer']);
export type CategoryType = z.infer<typeof categoryTypeSchema>;

export const categorySchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(60),
  /** Lucide icon key, e.g. "utensils", "shopping-cart" */
  icon: z.string().max(40),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  type: categoryTypeSchema,
  /** Parent category for hierarchy. Null for top-level. Phase 5 surfaces this. */
  parentId: idSchema.nullable(),
  /** True for system-seeded defaults; users can hide but not delete. */
  isSystem: z.boolean(),
  archived: z.boolean(),
  createdAt: isoDateTimeSchema,
});

export type Category = z.infer<typeof categorySchema>;

// --- Create

export const createCategorySchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().min(1).max(40),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  type: categoryTypeSchema,
  parentId: idSchema.nullable().optional(),
});

export type CreateCategoryRequest = z.infer<typeof createCategorySchema>;

// --- Update

export const updateCategorySchema = createCategorySchema.partial().extend({
  archived: z.boolean().optional(),
});

export type UpdateCategoryRequest = z.infer<typeof updateCategorySchema>;

// --- Filters

export const categoryFiltersSchema = z.object({
  type: categoryTypeSchema.optional(),
  includeArchived: z.coerce.boolean().default(false),
});

export type CategoryFilters = z.infer<typeof categoryFiltersSchema>;