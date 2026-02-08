import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from '../src/ingestion/ingestion.service';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
    MeterReadingHistory,
    VehicleReadingHistory,
    MeterLatestState,
    VehicleLatestState,
} from '../src/database/entities';
import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { MeterTelemetryDto, VehicleTelemetryDto } from '../src/ingestion/dto';

describe('QA System Verification', () => {
    let ingestionService: IngestionService;
    let analyticsService: AnalyticsService;
    let dataSourceMock: any;
    let entityManagerMock: any;
    let mockQueryBuilder: any;

    beforeEach(async () => {
        // Mock QueryBuilder for Analytics & Ingestion
        mockQueryBuilder = {
            insert: jest.fn().mockReturnThis(),
            into: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            orUpdate: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({}),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawOne: jest.fn(),
        };

        // Mock EntityManager for Transactions
        entityManagerMock = {
            create: jest.fn().mockImplementation((entity, data) => data),
            save: jest.fn().mockResolvedValue({}),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        };

        // Mock DataSource w/ Transaction support
        dataSourceMock = {
            transaction: jest.fn().mockImplementation(async (cb) => {
                return await cb(entityManagerMock);
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IngestionService,
                AnalyticsService,
                {
                    provide: getRepositoryToken(MeterReadingHistory),
                    useValue: { createQueryBuilder: jest.fn(() => mockQueryBuilder) },
                },
                {
                    provide: getRepositoryToken(VehicleReadingHistory),
                    useValue: { createQueryBuilder: jest.fn(() => mockQueryBuilder) },
                },
                {
                    provide: getRepositoryToken(MeterLatestState),
                    useValue: {},
                },
                {
                    provide: getRepositoryToken(VehicleLatestState),
                    useValue: {},
                },
                {
                    provide: DataSource,
                    useValue: dataSourceMock,
                },
            ],
        }).compile();

        ingestionService = module.get<IngestionService>(IngestionService);
        analyticsService = module.get<AnalyticsService>(AnalyticsService);
    });

    describe('1. Polymorphic Ingestion Validation', () => {
        it('✅ Should accept valid Meter payload', async () => {
            const payload = {
                meterId: 'M-QA-01',
                kwhConsumedAc: 50.5,
                voltage: 230.0,
                timestamp: new Date().toISOString(),
            };
            await expect(ingestionService.ingest(payload)).resolves.not.toThrow();
        });

        it('✅ Should accept valid Vehicle payload', async () => {
            const payload = {
                vehicleId: 'V-QA-01',
                soc: 80.0,
                kwhDeliveredDc: 45.0,
                batteryTemp: 35.0,
                timestamp: new Date().toISOString(),
            };
            await expect(ingestionService.ingest(payload)).resolves.not.toThrow();
        });

        it('✅ Should reject payload with BOTH meterId and vehicleId (Ambiguous)', async () => {
            const payload = {
                meterId: 'M-QA-01',
                vehicleId: 'V-QA-01',
                timestamp: new Date().toISOString(),
            };
            await expect(ingestionService.ingest(payload)).rejects.toThrow(BadRequestException);
        });

        it('✅ Should reject payload with MISSING discriminated ID', async () => {
            const payload = {
                timestamp: new Date().toISOString(),
            };
            await expect(ingestionService.ingest(payload)).rejects.toThrow(BadRequestException);
        });

        it('✅ Should validate data types (Runtime Validation)', async () => {
            // We need to verify that DTO validation actually catches this
            // Since we are calling service.ingest with a plain object, the service MUST transform and validate it.
            const payload = {
                meterId: 'M-QA-01',
                kwhConsumedAc: "NOT_A_NUMBER", // Invalid type
                voltage: 230.0,
                timestamp: new Date().toISOString(),
            };
            await expect(ingestionService.ingest(payload)).rejects.toThrow(BadRequestException);
        });
    });

    describe('2. Persistence Semantics & Transactional Integrity', () => {
        it('✅ Should perform INSERT to History and UPSERT to Latest in ONE transaction', async () => {
            const payload = {
                meterId: 'M-QA-TRANS',
                kwhConsumedAc: 100,
                voltage: 220,
                timestamp: new Date().toISOString(),
            };

            await ingestionService.ingest(payload);

            // Verify transaction usage
            expect(dataSourceMock.transaction).toHaveBeenCalledTimes(1);

            // Verify COLD storage INSERT (append-only)
            expect(entityManagerMock.save).toHaveBeenCalledTimes(1);
            const savedEntity = entityManagerMock.save.mock.calls[0][0];
            expect(savedEntity.meterId).toBe('M-QA-TRANS');

            // Verify HOT storage UPSERT
            expect(entityManagerMock.createQueryBuilder).toHaveBeenCalled();
            expect(mockQueryBuilder.insert).toHaveBeenCalled();
            expect(mockQueryBuilder.into).toHaveBeenCalledWith(MeterLatestState);
            expect(mockQueryBuilder.orUpdate).toHaveBeenCalledWith(
                ['kwh_consumed_ac', 'voltage', 'last_seen_at'], // Update columns
                ['meter_id'] // Conflict target
            );
        });
    });

    describe('5 & 6. Analytics Correctness & Time-Bounded Queries', () => {
        it('✅ Should enforce 24-hour time boundary in queries', async () => {
            mockQueryBuilder.getRawOne.mockResolvedValue({});

            const vehicleId = 'V-QA-ANALYTICS';
            await analyticsService.getPerformance(vehicleId);

            // Verify WHERE clause structure
            const calls = mockQueryBuilder.andWhere.mock.calls;
            const timeConstraintParam = calls.find(call => call[0].includes('timestamp >= :since'));

            expect(timeConstraintParam).toBeDefined();
            // Verify "since" is approx 24h ago
            const sinceDate = timeConstraintParam[1].since;
            const now = Date.now();
            const twentyFourHours = 24 * 60 * 60 * 1000;
            expect(now - sinceDate.getTime()).toBeLessThan(twentyFourHours + 5000); // 5s buffer
            expect(now - sinceDate.getTime()).toBeGreaterThan(twentyFourHours - 5000);
        });

        it('✅ Should handle Zero AC case (No division by zero)', async () => {
            mockQueryBuilder.getRawOne
                .mockResolvedValueOnce({ totalAc: '0' })
                .mockResolvedValueOnce({ totalDc: '50', avgTemp: '30' });

            const result = await analyticsService.getPerformance('V-ZERO-AC');

            expect(result.efficiency).toBe(0); // Should be 0, not Infinity or Na
            expect(result.totalAcKwh).toBe(0);
            expect(result.totalDcKwh).toBe(50);
        });
    });
});
