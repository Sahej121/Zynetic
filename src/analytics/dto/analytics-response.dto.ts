/**
 * Performance Analytics Response DTO
 */
export class AnalyticsResponseDto {
  vehicleId: string;
  totalAcKwh: number;
  totalDcKwh: number;
  efficiency: number;
  avgBatteryTemp: number;
}
