import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { slugify } from '../common/utils/slugify.js';
import { UpdateStoreDto } from './dto/update-store.dto.js';

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

  findMyStores(userId: string) {
    return this.prisma.store.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },

      include: {
        members: {
          where: {
            userId,
          },

          select: {
            role: true,
          },
        },

        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findBySlug(slug: string) {
    const store = await this.prisma.store.findUnique({
      where: {
        slug,
      },

      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,

        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  private async getMembership(userId: string, storeId: string) {
    const membership = await this.prisma.storeMember.findUnique({
      where: {
        userId_storeId: {
          userId,
          storeId,
        },
      },
    });
    if (!membership) {
      throw new ForbiddenException("You don't have access to this store");
    }
    return membership;
  }

  async update(userId: string, storeId: string, dto: UpdateStoreDto) {
    const membership = await this.getMembership(userId, storeId);

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new ForbiddenException('You are not allowed to update this store');
    }

    return this.prisma.store.update({
      where: {
        id: storeId,
      },

      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async remove(userId: string, storeId: string) {
    const membership = await this.getMembership(userId, storeId);

    if (membership.role !== 'OWNER') {
      throw new ForbiddenException(
        'Only the store owner can delete this store',
      );
    }

    await this.prisma.store.delete({
      where: {
        id: storeId,
      },
    });

    return {
      message: 'Store deleted successfully',
    };
  }
}
