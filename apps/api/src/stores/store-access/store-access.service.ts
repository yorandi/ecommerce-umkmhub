import { ForbiddenException, Injectable } from '@nestjs/common';
import type { StoreRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class StoreAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getMembership(userId: string, storeId: string) {
    const membership = await this.prisma.storeMember.findUnique({
      where: {
        userId_storeId: {
          userId,
          storeId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this store');
    }

    return membership;
  }

  async requireRole(userId: string, storeId: string, roles: StoreRole[]) {
    const membership = await this.getMembership(userId, storeId);

    if (!roles.includes(membership.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return membership;
  }
}
