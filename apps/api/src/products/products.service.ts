import {
  BadRequestException,
  NotFoundException,
  Injectable,
} from '@nestjs/common';

import { StoreRole } from '../generated/prisma/enums.js';

import { PrismaService } from '../prisma/prisma.service.js';
import { StoreAccessService } from '../stores/store-access/store-access.service.js';
import { ProductQueryDto } from './dto/product-query.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { slugify } from '../common/utils/slugify.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeAccess: StoreAccessService,
  ) {}

  async create(userId: string, storeId: string, dto: CreateProductDto) {
    await this.storeAccess.requireRole(userId, storeId, [
      StoreRole.OWNER,
      StoreRole.ADMIN,
      StoreRole.STAFF,
    ]);

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          storeId,
        },
      });

      if (!category) {
        throw new BadRequestException('Category does not belong to this store');
      }
    }

    const baseSlug = slugify(dto.name);

    const existingProduct = await this.prisma.product.findUnique({
      where: {
        storeId_slug: {
          storeId,
          slug: baseSlug,
        },
      },
    });

    const slug = existingProduct ? `${baseSlug}-${Date.now()}` : baseSlug;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          price: dto.price,
          categoryId: dto.categoryId,
          storeId,
        },
      });

      await tx.inventory.create({
        data: {
          productId: product.id,
          quantity: dto.initialStock,
        },
      });

      return tx.product.findUnique({
        where: {
          id: product.id,
        },

        include: {
          category: true,
          inventory: true,
        },
      });
    });
  }
  async findAll(storeId: string, query: ProductQueryDto) {
    const { search, categoryId, page, limit } = query;

    const skip = (page - 1) * limit;

    const where = {
      storeId,
      isActive: true,

      ...(categoryId && {
        categoryId,
      }),

      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }),
    };

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,

        include: {
          category: true,
          inventory: true,
        },

        orderBy: {
          createdAt: 'desc',
        },

        skip,
        take: limit,
      }),

      this.prisma.product.count({
        where,
      }),
    ]);

    return {
      data: products,

      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(storeId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        storeId,
        isActive: true,
      },

      include: {
        category: true,
        inventory: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    userId: string,
    storeId: string,
    productId: string,
    dto: UpdateProductDto,
  ) {
    await this.storeAccess.requireRole(userId, storeId, [
      StoreRole.OWNER,
      StoreRole.ADMIN,
      StoreRole.STAFF,
    ]);

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        storeId,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          storeId,
        },
      });

      if (!category) {
        throw new BadRequestException('Category does not belong to this store');
      }
    }

    return this.prisma.product.update({
      where: {
        id: productId,
      },

      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        categoryId: dto.categoryId,
      },

      include: {
        category: true,
        inventory: true,
      },
    });
  }

  async remove(userId: string, storeId: string, productId: string) {
    await this.storeAccess.requireRole(userId, storeId, [
      StoreRole.OWNER,
      StoreRole.ADMIN,
    ]);

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        storeId,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.update({
      where: {
        id: productId,
      },

      data: {
        isActive: false,
      },
    });

    return {
      message: 'Product deleted successfully',
    };
  }
}
