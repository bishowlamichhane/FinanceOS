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
  import { AccountsService } from './accounts.service';
  import {
    CreateAccountDto,
    TransferDto,
    UpdateAccountDto,
  } from './dto/account.dto';
  import { CurrentUser, JwtAuthGuard } from '../auth/auth.guard';
  import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
  
  @ApiTags('accounts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('accounts')
  export class AccountsController {
    constructor(private readonly accounts: AccountsService) {}
  
    @Get()
    @ApiOperation({ summary: 'List accounts with computed balances + totals' })
    list(
      @CurrentUser() user: AuthenticatedUser,
      @Query('includeArchived') includeArchived?: string,
    ) {
      return this.accounts.list(user.id, includeArchived === 'true');
    }
  
    @Post('transfer')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Transfer funds between two accounts' })
    transfer(@CurrentUser() user: AuthenticatedUser, @Body() dto: TransferDto) {
      return this.accounts.transfer(user.id, dto);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a single account with computed balance' })
    findOne(
      @CurrentUser() user: AuthenticatedUser,
      @Param('id', new ParseUUIDPipe()) id: string,
    ) {
      return this.accounts.findOne(user.id, id);
    }
  
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new account' })
    create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAccountDto) {
      return this.accounts.create(user.id, dto);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Update an account' })
    update(
      @CurrentUser() user: AuthenticatedUser,
      @Param('id', new ParseUUIDPipe()) id: string,
      @Body() dto: UpdateAccountDto,
    ) {
      return this.accounts.update(user.id, id, dto);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Soft-delete (archive) an account' })
    async remove(
      @CurrentUser() user: AuthenticatedUser,
      @Param('id', new ParseUUIDPipe()) id: string,
    ): Promise<void> {
      await this.accounts.remove(user.id, id);
    }
  }