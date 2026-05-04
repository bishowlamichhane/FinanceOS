import { z } from 'zod';
import { idSchema, isoDateTimeSchema } from './common';

export const tagSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(40),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  createdAt: isoDateTimeSchema,
});

export type Tag = z.infer<typeof tagSchema>;

export const createTagSchema = z.object({
  name: z.string().min(1).max(40),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export type CreateTagRequest = z.infer<typeof createTagSchema>;