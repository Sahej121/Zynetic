import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

/**
 * Telemetry Ingestion Controller
 *
 * Single endpoint for polymorphic telemetry ingestion.
 * Accepts either Meter or Vehicle telemetry payloads.
 */
@Controller('v1/telemetry')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * POST /v1/telemetry/ingest
   *
   * Accepts polymorphic telemetry payload:
   * - Meter: { meterId, kwhConsumedAc, voltage, timestamp }
   * - Vehicle: { vehicleId, soc, kwhDeliveredDc, batteryTemp, timestamp }
   *
   * Returns acknowledgment with ingested type and device ID.
   */
  @Post('ingest')
  @HttpCode(HttpStatus.CREATED)
  async ingest(@Body() payload: Record<string, unknown>) {
    const result = await this.ingestionService.ingest(payload);
    return {
      success: true,
      ...result,
    };
  }
}
