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
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';
import { CurrentUser, JwtAuthGuard } from '../auth/auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Get()
  @ApiOperation({ summary: 'List budgets with hydrated current-period actuals + totals' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.budgets.list(user.id, includeArchived === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single budget' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.budgets.findOne(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a budget (overall or per-category)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBudgetDto) {
    return this.budgets.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget — amount / thresholds / archived' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgets.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a budget' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.budgets.remove(user.id, id);
  }
}
