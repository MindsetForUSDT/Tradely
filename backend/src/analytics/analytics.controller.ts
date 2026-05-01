import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PositionSizingService } from './position-sizing.service';
import { MetricsService } from './metrics.service';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  constructor(
    private readonly positionSizing: PositionSizingService,
    private readonly metrics: MetricsService,
  ) {}

  @Get('kelly')
  async kelly(@Req() req: any, @Query('days') days?: string) {
    return this.positionSizing.calculateKelly(req.user.id, Number(days) || 90);
  }

  @Get('sharpe')
  async sharpe(@Req() req: any) {
    return this.metrics.calculateSharpe(req.user.id);
  }

  @Get('drawdown')
  async drawdown(@Req() req: any) {
    return this.metrics.calculateDrawdown(req.user.id);
  }

  @Get('expectancy')
  async expectancy(@Req() req: any) {
    return this.metrics.calculateExpectancy(req.user.id);
  }

  @Get('position-size')
  async positionSize(
    @Req() req: any,
    @Query('balance') balance?: string,
    @Query('risk') risk?: string,
    @Query('method') method?: string,
    @Query('stopLoss') stopLoss?: string,
    @Query('atr') atr?: string,
  ) {
    const accountBalance = Number(balance) || 10000;
    const riskPercent = Number(risk) || 2;

    if (method === 'fixed_fractional') {
      return this.positionSizing.calculateFixedFractional(
        accountBalance,
        riskPercent,
        Number(stopLoss) || 5,
      );
    }

    if (method === 'atr_adjusted') {
      return this.positionSizing.calculateATRAdjusted(
        accountBalance,
        riskPercent,
        Number(atr) || 50,
      );
    }

    // Default: Kelly
    const kelly = await this.positionSizing.calculateKelly(req.user.id);
    const riskAmount = accountBalance * kelly.optimalFraction;
    return {
      method: 'kelly',
      kellyFraction: kelly.optimalFraction,
      positionSize: parseFloat(riskAmount.toFixed(2)),
      riskAmount: parseFloat(riskAmount.toFixed(2)),
      kellyDetails: kelly,
    };
  }

  @Get('risk-of-ruin')
  async riskOfRuin(
    @Req() req: any,
    @Query('balance') balance?: string,
    @Query('riskPerTrade') riskPerTrade?: string,
  ) {
    const trades = await this.metrics.calculateExpectancy(req.user.id);
    const kelly = await this.positionSizing.calculateKelly(req.user.id);

    return this.positionSizing.calculateRiskOfRuin(
      kelly.inputs.winRate / 100,
      kelly.inputs.avgWin,
      kelly.inputs.avgLoss,
      Number(balance) || 10000,
      Number(riskPerTrade) || 100,
    );
  }
}