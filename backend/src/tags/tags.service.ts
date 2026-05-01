import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.tag.findMany({
      where: { user_id: userId },
      orderBy: { usage_count: 'desc' },
    });
  }

  async create(userId: string, dto: { name: string; color?: string; category?: string }) {
    return this.prisma.tag.create({
      data: {
        user_id: userId,
        name: dto.name,
        color: dto.color || '#00FFA3',
        category: (dto.category as any) || 'custom',
      },
    });
  }

  async remove(userId: string, tagId: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.user_id !== userId || tag.is_system) throw new NotFoundException();
    return this.prisma.tag.delete({ where: { id: tagId } });
  }

  async attachToTrade(userId: string, tradeId: string, tagId: string) {
    return this.prisma.tradeTag.create({
      data: { trade_id: tradeId, tag_id: tagId },
    });
  }

  async detachFromTrade(userId: string, tradeId: string, tagId: string) {
    return this.prisma.tradeTag.delete({
      where: { trade_id_tag_id: { trade_id: tradeId, tag_id: tagId } },
    });
  }
}