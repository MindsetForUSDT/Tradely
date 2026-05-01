import { Controller, Get, Res, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExportService } from './export.service';
import { Response } from 'express';

@Controller('export')
@UseGuards(AuthGuard('jwt'))
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('csv')
  async csv(@Req() req: any, @Res() res: Response) {
    const csv = await this.exportService.exportCSV(req.user.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=trades.csv');
    res.send(csv);
  }

  @Get('json')
  async json(@Req() req: any) {
    return this.exportService.exportJSON(req.user.id);
  }
}