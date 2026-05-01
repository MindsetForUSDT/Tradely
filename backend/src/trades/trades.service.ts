import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, limit = 50, offset = 0) {
    return this.prisma.trade.findMany({
      where: { user_id: userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: { tags: { include: { tag: true } } },
    });
  }

  async findOne(userId: string, tradeId: string) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: { tags: { include: { tag: true } } },
    });
    if (!trade || trade.user_id !== userId) throw new NotFoundException();
    return trade;
  }

  async create(userId: string, dto: any) {
    const count = await this.prisma.trade.count({ where: { user_id: userId } });
    if (count >= 500) {
      const profile = await this.prisma.profile.findUnique({ where: { id: userId } });
      if (profile?.subscription_tier === 'free') {
        throw new ForbiddenException('Free limit: 500 trades/month');
      }
    }

    return this.prisma.trade.create({
      data: {
        user_id: userId,
        symbol: dto.symbol,
        side: dto.side,
        amount: dto.amount,
        price: dto.price,
        value_usd: dto.value_usd || dto.amount * dto.price,
        fee: dto.fee || 0,
        status: dto.status || 'closed',
        leverage: dto.leverage || 1,
        notes: dto.notes,
        exchange: dto.exchange,
        timestamp: dto.timestamp || new Date().toISOString(),
      },
    });
  }

  async update(userId: string, tradeId: string, dto: any) {
    const trade = await this.findOne(userId, tradeId);
    return this.prisma.trade.update({
      where: { id: trade.id },
      data: {
        notes: dto.notes,
        status: dto.status,
      },
    });
  }

  async remove(userId: string, tradeId: string) {
    const trade = await this.findOne(userId, tradeId);
    return this.prisma.trade.delete({ where: { id: trade.id } });
  }

  async importCSV(userId: string, rows: any[]) {
    let imported = 0;
    for (const row of rows) {
      try {
        await this.create(userId, {
          symbol: row.symbol,
          side: row.side?.toLowerCase(),
          amount: parseFloat(row.amount),
          price: parseFloat(row.price),
          timestamp: row.timestamp || row.date,
          exchange: row.exchange,
        });
        imported++;
      } catch (e) {
        // skip bad rows
      }
    }
    return { imported, total: rows.length };
  }

  async getStats(userId: string) {
    const trades = await this.prisma.trade.findMany({
      where: { user_id: userId, status: 'closed' },
    });

    const winning = trades.filter((t) => (t.pnl_realized || 0) > 0);
    const losing = trades.filter((t) => (t.pnl_realized || 0) < 0);

    return {
      totalTrades: trades.length,
      winRate: trades.length ? (winning.length / trades.length) * 100 : 0,
      totalPnl: trades.reduce((s, t) => s + (t.pnl_realized || 0), 0),
      avgWin: winning.length ? winning.reduce((s, t) => s + (t.pnl_realized || 0), 0) / winning.length : 0,
      avgLoss: losing.length ? Math.abs(losing.reduce((s, t) => s + (t.pnl_realized || 0), 0)) / losing.length : 0,
      bestTrade: Math.max(...trades.map((t) => t.pnl_realized || 0)),
      worstTrade: Math.min(...trades.map((t) => t.pnl_realized || 0)),
    };
  }
}