import { Test, TestingModule } from '@nestjs/testing';
import { IngestionService } from './ingestion.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
    MeterReadingHistory,
    VehicleReadingHistory,
    MeterLatestState,
    VehicleLatestState,
} from '../database/entities';

describe('IngestionService', () => {
    let service: IngestionService;
    let dataSourceMock: any;
    let entityManagerMock: any;

    beforeEach(async () => {
        entityManagerMock = {
            create: jest.fn().mockReturnValue({}),
            save: jest.fn().mockResolvedValue({}),
            createQueryBuilder: jest.fn().mockReturnValue({
                insert: jest.fn().mockReturnThis(),
                into: jest.fn().mockReturnThis(),
                values: jest.fn().mockReturnThis(),
                orUpdate: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({}),
            }),
        };

        dataSourceMock = {
            transaction: jest.fn().mockImplementation((cb) => cb(entityManagerMock)),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IngestionService,
                {
                    provide: getRepositoryToken(MeterReadingHistory),
                    useValue: {},
                },
                {
                    provide: getRepositoryToken(VehicleReadingHistory),
                    useValue: {},
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

        service = module.get<IngestionService>(IngestionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should ingest meter telemetry correctly', async () => {
        const payload = {
            meterId: 'M123',
            kwhConsumedAc: 100,
            voltage: 220,
            timestamp: '2023-01-01T00:00:00Z',
        };

        const result = await service.ingest(payload);

        expect(result.type).toBe('meter');
        expect(result.deviceId).toBe('M123');
        expect(dataSourceMock.transaction).toHaveBeenCalled();
    });

    it('should ingest vehicle telemetry correctly', async () => {
        const payload = {
            vehicleId: 'V123',
            soc: 50,
            kwhDeliveredDc: 80,
            batteryTemp: 25,
            timestamp: '2023-01-01T00:00:00Z',
        };

        const result = await service.ingest(payload);

        expect(result.type).toBe('vehicle');
        expect(result.deviceId).toBe('V123');
        expect(dataSourceMock.transaction).toHaveBeenCalled();
    });

    it('should throw error for ambiguous payload', async () => {
        const payload = {
            meterId: 'M123',
            vehicleId: 'V123',
        };

        await expect(service.ingest(payload)).rejects.toThrow('Ambiguous payload');
    });

    it('should throw error for invalid payload', async () => {
        const payload = {
            otherId: 'O123',
        };

        await expect(service.ingest(payload)).rejects.toThrow('Invalid payload');
    });
});
