import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import {
  CreateAssetDto,
  RecordAssetValueDto,
  UpdateAssetDto,
} from './dto/asset.dto';
import { CurrentUser, JwtAuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'List assets with hydrated MoM change + totals' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.assets.list(user.id, includeArchived === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single asset' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.assets.findOne(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an asset (also writes initial valuation)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAssetDto) {
    return this.assets.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update asset fields (name / type / acquired / archived)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assets.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an asset' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.assets.remove(user.id, id);
  }

  @Get(':id/values')
  @ApiOperation({ summary: 'Get valuation history for an asset (newest first)' })
  valueHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.assets.valueHistory(user.id, id);
  }

  @Post(':id/values')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record a new valuation snapshot. Updates currentValue.',
  })
  recordValue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RecordAssetValueDto,
  ) {
    return this.assets.recordValue(user.id, id, dto);
  }
}
