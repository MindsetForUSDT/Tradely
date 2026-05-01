import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TradesService } from './trades.service';

@Controller('trades')
@UseGuards(AuthGuard('jwt'))
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Get()
  findAll(@Req() req: any, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.tradesService.findAll(req.user.id, Number(limit) || 50, Number(offset) || 0);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.tradesService.getStats(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.tradesService.findOne(req.user.id, id);
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.tradesService.create(req.user.id, body);
  }

  @Post('import-csv')
  importCSV(@Req() req: any, @Body() body: { rows: any[] }) {
    return this.tradesService.importCSV(req.user.id, body.rows);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.tradesService.update(req.user.id, id, body);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.tradesService.remove(req.user.id, id);
  }
}