import {
  Body,
  Controller,
  Param,
  Post,
  Query,
  Get,
  UseGuards,
  Delete,
  Patch,
} from '@nestjs/common';

import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ProductQueryDto } from './dto/product-query.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtUser } from '../auth/types/jwt-user.type.js';

@Controller('stores/:storeId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('storeId') storeId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(user.userId, storeId, dto);
  }
  @Get()
  findAll(@Param('storeId') storeId: string, @Query() query: ProductQueryDto) {
    return this.productsService.findAll(storeId, query);
  }

  @Get(':productId')
  findOne(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
  ) {
    return this.productsService.findOne(storeId, productId);
  }

  @Patch(':productId')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(user.userId, storeId, productId, dto);
  }

  @Delete(':productId')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.productsService.remove(user.userId, storeId, productId);
  }
}
