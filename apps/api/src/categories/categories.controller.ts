import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtUser } from '../auth/types/jwt-user.type.js';

@Controller('stores/:storeId/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('storeId') storeId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(user.userId, storeId, dto);
  }

  @Get()
  findAll(@Param('storeId') storeId: string) {
    return this.categoriesService.findAll(storeId);
  }
}
