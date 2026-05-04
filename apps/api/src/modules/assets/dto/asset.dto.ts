import { createZodDto } from 'nestjs-zod';
import {
  createAssetSchema,
  recordAssetValueSchema,
  updateAssetSchema,
} from '@finance-os/contracts';

export class CreateAssetDto extends createZodDto(createAssetSchema) {}
export class UpdateAssetDto extends createZodDto(updateAssetSchema) {}
export class RecordAssetValueDto extends createZodDto(recordAssetValueSchema) {}
