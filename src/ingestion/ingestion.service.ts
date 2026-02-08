import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
    MeterReadingHistory,
    VehicleReadingHistory,
    MeterLatestState,
    VehicleLatestState,
} from '../database/entities';
import { MeterTelemetryDto, VehicleTelemetryDto } from './dto';

/**
 * Telemetry Type Discriminator
 *
 * Runtime detection of telemetry type based on payload shape.
 */
type TelemetryType = 'meter' | 'vehicle';

interface IngestionResult {
    type: TelemetryType;
    deviceId: string;
    timestamp: Date;
}

@Injectable()
export class IngestionService {
    constructor(
        @InjectRepository(MeterReadingHistory)
        private readonly meterHistoryRepo: Repository<MeterReadingHistory>,
        @InjectRepository(VehicleReadingHistory)
        private readonly vehicleHistoryRepo: Repository<VehicleReadingHistory>,
        @InjectRepository(MeterLatestState)
        private readonly meterLatestRepo: Repository<MeterLatestState>,
        @InjectRepository(VehicleLatestState)
        private readonly vehicleLatestRepo: Repository<VehicleLatestState>,
        private readonly dataSource: DataSource,
    ) { }

    /**
     * Ingest telemetry data with polymorphic validation and transactional dual-write.
     *
     * Design:
     * 1. Discriminate payload type by presence of meterId vs vehicleId
     * 2. Validate against appropriate DTO
     * 3. Execute transactional dual-write (history INSERT + latest UPSERT)
     */
    async ingest(payload: Record<string, unknown>): Promise<IngestionResult> {
        const type = this.discriminateType(payload);

        if (type === 'meter') {
            return this.ingestMeter(payload);
        } else {
            return this.ingestVehicle(payload);
        }
    }

    /**
     * Discriminate telemetry type based on payload shape.
     * Throws if ambiguous or invalid.
     */
    private discriminateType(payload: Record<string, unknown>): TelemetryType {
        const hasMeterId = 'meterId' in payload;
        const hasVehicleId = 'vehicleId' in payload;

        if (hasMeterId && hasVehicleId) {
            throw new BadRequestException(
                'Ambiguous payload: contains both meterId and vehicleId',
            );
        }

        if (hasMeterId) {
            return 'meter';
        }

        if (hasVehicleId) {
            return 'vehicle';
        }

        throw new BadRequestException(
            'Invalid payload: must contain either meterId or vehicleId',
        );
    }

    /**
     * Ingest meter telemetry with transactional dual-write.
     */
    private async ingestMeter(
        payload: Record<string, unknown>,
    ): Promise<IngestionResult> {
        const dto = plainToInstance(MeterTelemetryDto, payload);
        const errors = await validate(dto);

        if (errors.length > 0) {
            const messages = errors
                .map((e) => Object.values(e.constraints || {}).join(', '))
                .join('; ');
            throw new BadRequestException(`Validation failed: ${messages}`);
        }

        const timestamp = new Date(dto.timestamp);

        // Transactional dual-write: ensures consistency between hot and cold tables
        await this.dataSource.transaction(async (manager) => {
            // COLD: INSERT into history (append-only)
            const historyRecord = manager.create(MeterReadingHistory, {
                meterId: dto.meterId,
                kwhConsumedAc: dto.kwhConsumedAc,
                voltage: dto.voltage,
                timestamp,
            });
            await manager.save(historyRecord);

            // HOT: UPSERT into latest state
            await manager
                .createQueryBuilder()
                .insert()
                .into(MeterLatestState)
                .values({
                    meterId: dto.meterId,
                    kwhConsumedAc: dto.kwhConsumedAc,
                    voltage: dto.voltage,
                    lastSeenAt: timestamp,
                })
                .orUpdate(['kwh_consumed_ac', 'voltage', 'last_seen_at'], ['meter_id'])
                .execute();
        });

        return {
            type: 'meter',
            deviceId: dto.meterId,
            timestamp,
        };
    }

    /**
     * Ingest vehicle telemetry with transactional dual-write.
     */
    private async ingestVehicle(
        payload: Record<string, unknown>,
    ): Promise<IngestionResult> {
        const dto = plainToInstance(VehicleTelemetryDto, payload);
        const errors = await validate(dto);

        if (errors.length > 0) {
            const messages = errors
                .map((e) => Object.values(e.constraints || {}).join(', '))
                .join('; ');
            throw new BadRequestException(`Validation failed: ${messages}`);
        }

        const timestamp = new Date(dto.timestamp);

        // Transactional dual-write: ensures consistency between hot and cold tables
        await this.dataSource.transaction(async (manager) => {
            // COLD: INSERT into history (append-only)
            const historyRecord = manager.create(VehicleReadingHistory, {
                vehicleId: dto.vehicleId,
                soc: dto.soc,
                kwhDeliveredDc: dto.kwhDeliveredDc,
                batteryTemp: dto.batteryTemp,
                timestamp,
            });
            await manager.save(historyRecord);

            // HOT: UPSERT into latest state
            await manager
                .createQueryBuilder()
                .insert()
                .into(VehicleLatestState)
                .values({
                    vehicleId: dto.vehicleId,
                    soc: dto.soc,
                    kwhDeliveredDc: dto.kwhDeliveredDc,
                    batteryTemp: dto.batteryTemp,
                    lastSeenAt: timestamp,
                })
                .orUpdate(
                    ['soc', 'kwh_delivered_dc', 'battery_temp', 'last_seen_at'],
                    ['vehicle_id'],
                )
                .execute();
        });

        return {
            type: 'vehicle',
            deviceId: dto.vehicleId,
            timestamp,
        };
    }
}
