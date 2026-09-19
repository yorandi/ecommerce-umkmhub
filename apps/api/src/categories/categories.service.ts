import { ConflictException, Injectable } from '@nestjs/common';
import { StoreRole } from '../generated/prisma/enums.js';

import { PrismaService } from '../prisma/prisma.service.js';
import { StoreAccessService } from '../stores/store-access/store-access.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeAccess: StoreAccessService,
  ) {}

  async create(userId: string, storeId: string, dto: CreateCategoryDto) {
    await this.storeAccess.requireRole(userId, storeId, [
      StoreRole.OWNER,
      StoreRole.ADMIN,
    ]);

    const existing = await this.prisma.category.findUnique({
      where: {
        storeId_name: {
          storeId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Category already exists');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        storeId,
      },
    });
  }
  findAll(storeId: string) {
    return this.prisma.category.findMany({
      where: {
        storeId,
      },

      orderBy: {
        name: 'asc',
      },
    });
  }
}
