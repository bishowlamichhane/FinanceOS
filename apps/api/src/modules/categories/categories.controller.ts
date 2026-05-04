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
  import { CategoriesService } from './categories.service';
  import { CurrentUser, JwtAuthGuard } from '../auth/auth.guard';
  import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
  import {
    CategoryFiltersDto,
    CreateCategoryDto,
    UpdateCategoryDto,
  } from './dto/category.dto';
  
  @ApiTags('categories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('categories')
  export class CategoriesController {
    constructor(private readonly categories: CategoriesService) {}
  
    @Get()
    @ApiOperation({ summary: 'List categories' })
    list(@CurrentUser() user: AuthenticatedUser, @Query() filters: CategoryFiltersDto) {
      return this.categories.list(user.id, filters);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a single category' })
    findOne(
      @CurrentUser() user: AuthenticatedUser,
      @Param('id', new ParseUUIDPipe()) id: string,
    ) {
      return this.categories.findOne(user.id, id);
    }
  
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a custom category' })
    create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCategoryDto) {
      return this.categories.create(user.id, dto);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Update a category' })
    update(
      @CurrentUser() user: AuthenticatedUser,
      @Param('id', new ParseUUIDPipe()) id: string,
      @Body() dto: UpdateCategoryDto,
    ) {
      return this.categories.update(user.id, id, dto);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Soft-delete a category' })
    async remove(
      @CurrentUser() user: AuthenticatedUser,
      @Param('id', new ParseUUIDPipe()) id: string,
    ): Promise<void> {
      await this.categories.remove(user.id, id);
    }
  }