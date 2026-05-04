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
  import { TransactionsService } from './transactions.service';
  import {
    CreateTransactionDto,
    TransactionFiltersDto,
    UpdateTransactionDto,
  } from './dto/transaction.dto';
  import { CurrentUser, JwtAuthGuard } from '../auth/auth.guard';
  import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
  
  @ApiTags('transactions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('transactions')
  export class TransactionsController {
    constructor(private readonly transactions: TransactionsService) {}
  
    @Get()
    @ApiOperation({ summary: 'List transactions (cursor-paginated, filterable)' })
    list(@CurrentUser() user: AuthenticatedUser, @Query() filters: TransactionFiltersDto) {
      return this.transactions.list(user.id, filters);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a single transaction with full hydration' })
    findOne(
      @CurrentUser() user: AuthenticatedUser,
      @Param('id', new ParseUUIDPipe()) id: string,
    ) {
      return this.transactions.findOne(user.id, id);
    }
  
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a transaction (income/expense/transfer/etc)' })
    create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTransactionDto) {
      return this.transactions.create(user.id, dto);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Update a transaction' })
    update(
      @CurrentUser() user: AuthenticatedUser,
      @Param('id', new ParseUUIDPipe()) id: string,
      @Body() dto: UpdateTransactionDto,
    ) {
      return this.transactions.update(user.id, id, dto);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Soft-delete a transaction' })
    async remove(
      @CurrentUser() user: AuthenticatedUser,
      @Param('id', new ParseUUIDPipe()) id: string,
    ): Promise<void> {
      await this.transactions.remove(user.id, id);
    }
  }