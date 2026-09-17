import { Injectable, ConflictException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { slugify } from '../common/utils/slugify.js';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}
  async create(userId: string, dto: CreateStoreDto) {
    const slug = slugify(dto.name);
    const existingStore = await this.prisma.store.findUnique({
      where: { slug },
    });
    if (existingStore) {
      throw new ConflictException('Store with this name already exists');
    }
    return this.prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
        },
      });
      await tx.storeMember.create({
        data: {
          userId,
          storeId: store.id,
          role: 'OWNER',
        },
      });
      return store;
    });
  }
}
