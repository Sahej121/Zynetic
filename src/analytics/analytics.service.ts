import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MeterReadingHistory,
  VehicleReadingHistory,
} from '../database/entities';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';

interface MeterRawResult {
  totalAc: number | string | null;
}

interface VehicleRawResult {
  totalDc: number | string | null;
  avgTemp: number | string | null;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(MeterReadingHistory)
    private readonly meterRepo: Repository<MeterReadingHistory>,
    @InjectRepository(VehicleReadingHistory)
    private readonly vehicleRepo: Repository<VehicleReadingHistory>,
  ) { }

  /**
   * Calculate 24-hour performance summary for a vehicle.
   *
   * Query Strategy:
   * 1. Use composite indexes (meter_id, timestamp) and (vehicle_id, timestamp)
   * 2. strictly time-bound queries to avoid full table scans.
   * 3. Assume vehicle_id == meter_id for correlation in this challenge.
   */
  async getPerformance(vehicleId: string): Promise<AnalyticsResponseDto> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Query Meter History (AC Energy) - FLEET LEVEL AGGREGATION
    // Aggregating all meters in the last 24 hours to compare against specific vehicle DC.
    // This allows efficiency calculation without direct meter-vehicle mapping.
    const acResult = await this.meterRepo
      .createQueryBuilder('meter')
      .select('SUM(meter.kwhConsumedAc)', 'totalAc')
      .where('meter.timestamp >= :since', { since })
      .getRawOne<MeterRawResult>();

    // Query Vehicle History (DC Energy and Avg Temp)
    const vehicleResult = await this.vehicleRepo
      .createQueryBuilder('vehicle')
      .select('SUM(vehicle.kwhDeliveredDc)', 'totalDc')
      .addSelect('AVG(vehicle.batteryTemp)', 'avgTemp')
      .where('vehicle.vehicleId = :vehicleId', { vehicleId })
      .andWhere('vehicle.timestamp >= :since', { since })
      .getRawOne<VehicleRawResult>();

    // Parse results safely
    const totalAcVal = acResult?.totalAc;
    const totalDcVal = vehicleResult?.totalDc;
    const avgTempVal = vehicleResult?.avgTemp;

    const totalAc = parseFloat(
      totalAcVal !== null && totalAcVal !== undefined
        ? String(totalAcVal)
        : '0',
    );
    const totalDc = parseFloat(
      totalDcVal !== null && totalDcVal !== undefined
        ? String(totalDcVal)
        : '0',
    );
    const avgTemp = parseFloat(
      avgTempVal !== null && avgTempVal !== undefined
        ? String(avgTempVal)
        : '0',
    );

    // Calculate Efficiency (DC / AC)
    // Avoid divide-by-zero
    const efficiency = totalAc > 0 ? (totalDc / totalAc) * 100 : 0;

    return {
      vehicleId,
      totalAcKwh: parseFloat(totalAc.toFixed(4)),
      totalDcKwh: parseFloat(totalDc.toFixed(4)),
      efficiency: parseFloat(efficiency.toFixed(2)),
      avgBatteryTemp: parseFloat(avgTemp.toFixed(2)),
    };
  }
}
