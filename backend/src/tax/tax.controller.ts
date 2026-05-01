import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaxService } from './tax.service';

@Controller('tax')
@UseGuards(AuthGuard('jwt'))
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get('report')
  async report(
    @Req() req: any,
    @Query('year') year?: string,
    @Query('method') method?: string,
  ) {
    return this.taxService.calculateTax(
      req.user.id,
      Number(year) || new Date().getFullYear() - 1,
      (method as 'FIFO' | 'LIFO') || 'FIFO',
    );
  }
}