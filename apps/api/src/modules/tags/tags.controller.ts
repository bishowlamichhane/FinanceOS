import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    UseGuards,
  } from '@nestjs/common';
  import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
  import { createZodDto } from 'nestjs-zod';
  import { TagsService } from './tags.service';
  import { createTagSchema } from '@finance-os/contracts';
  import { CurrentUser, JwtAuthGuard } from '../auth/auth.guard';
  import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
  
  class CreateTagDto extends createZodDto(createTagSchema) {}
  
  @ApiTags('tags')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('tags')
  export class TagsController {
    constructor(private readonly tags: TagsService) {}
  
    @Get()
    list(@CurrentUser() user: AuthenticatedUser) {
      return this.tags.list(user.id);
    }
  
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create or fetch a tag by name' })
    create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTagDto) {
      return this.tags.create(user.id, dto);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(
      @CurrentUser() user: AuthenticatedUser,
      @Param('id', new ParseUUIDPipe()) id: string,
    ): Promise<void> {
      await this.tags.remove(user.id, id);
    }
  }