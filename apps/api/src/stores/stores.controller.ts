import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { StoresService } from './stores.service.js';
import { CreateStoreDto } from './dto/create-store.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtUser } from '../auth/types/jwt-user.type.js';

@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateStoreDto) {
    return this.storesService.create(user.userId, dto);
  }
}
