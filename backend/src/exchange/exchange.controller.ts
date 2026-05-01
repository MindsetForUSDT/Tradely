import { Controller, Get, Post, Query, Body, UseGuards, Req, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExchangeService } from './exchange.service';

@Controller('exchange')
@UseGuards(AuthGuard('jwt'))
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Get('supported')
  supported() {
    return this.exchangeService.getSupportedExchanges();
  }

  @Post('connect')
  connect(@Req() req: any, @Body() body: { exchange: string; apiKey: string; secret: string }) {
    return this.exchangeService.connectExchange(req.user.id, body.exchange, body.apiKey, body.secret);
  }

  @Post(':id/sync')
  sync(@Req() req: any, @Param('id') id: string) {
    return this.exchangeService.syncTrades(req.user.id, id);
  }
}