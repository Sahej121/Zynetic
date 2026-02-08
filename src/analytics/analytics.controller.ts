import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';

@Controller('v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /v1/analytics/performance/:vehicleId
   *
   * Returns a 24-hour summary of charging performance.
   */
  @Get('performance/:vehicleId')
  async getPerformance(
    @Param('vehicleId') vehicleId: string,
  ): Promise<AnalyticsResponseDto> {
    return this.analyticsService.getPerformance(vehicleId);
  }
}
