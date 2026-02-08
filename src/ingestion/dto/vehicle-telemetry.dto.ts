import {
  IsString,
  IsNumber,
  IsDateString,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

/**
 * Vehicle Telemetry DTO
 *
 * Vehicle-side DC energy delivery data.
 * Presence of `vehicleId` discriminates this from meter telemetry.
 */
export class VehicleTelemetryDto {
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsNumber()
  @Min(0)
  @Max(100) // SOC is 0-100%
  soc: number;

  @IsNumber()
  @Min(0)
  kwhDeliveredDc: number;

  @IsNumber()
  @Min(-50) // Can be cold
  @Max(100) // Safety upper bound
  batteryTemp: number;

  @IsDateString()
  timestamp: string;
}
