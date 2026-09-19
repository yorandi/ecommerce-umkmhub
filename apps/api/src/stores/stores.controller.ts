import {
  Get,
  Body,
  Controller,
  Post,
  Param,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';

import { StoresService } from './stores.service.js';
import { CreateStoreDto } from './dto/create-store.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtUser } from '../auth/types/jwt-user.type.js';
import { UpdateStoreDto } from './dto/update-store.dto.js';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateStoreDto) {
    return this.storesService.create(user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findMyStores(@CurrentUser() user: JwtUser) {
    return this.storesService.findMyStores(user.userId);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.storesService.findBySlug(slug);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.storesService.remove(user.userId, id);
  }
}
