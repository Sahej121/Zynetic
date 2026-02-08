import {
  IsString,
  IsNumber,
  IsDateString,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

/**
 * Meter Telemetry DTO
 *
 * Grid-side energy consumption data from smart meters.
 * Presence of `meterId` discriminates this from vehicle telemetry.
 */
export class MeterTelemetryDto {
  @IsString()
  @IsNotEmpty()
  meterId: string;

  @IsNumber()
  @Min(0)
  kwhConsumedAc: number;

  @IsNumber()
  @Min(0)
  @Max(500) // Typical voltage range safety
  voltage: number;

  @IsDateString()
  timestamp: string;
}
