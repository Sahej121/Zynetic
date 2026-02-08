import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
    MeterReadingHistory,
    VehicleReadingHistory,
} from '../database/entities';

describe('AnalyticsService', () => {
    let service: AnalyticsService;
    let mockQueryBuilder: any; // Explicitly verify expectations

    beforeEach(async () => {
        mockQueryBuilder = {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawOne: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticsService,
                {
                    provide: getRepositoryToken(MeterReadingHistory),
                    useValue: {
                        createQueryBuilder: jest.fn(() => mockQueryBuilder),
                    },
                },
                {
                    provide: getRepositoryToken(VehicleReadingHistory),
                    useValue: {
                        createQueryBuilder: jest.fn(() => mockQueryBuilder),
                    },
                },
            ],
        }).compile();

        service = module.get<AnalyticsService>(AnalyticsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should calculate performance metrics correctly', async () => {
        mockQueryBuilder.getRawOne
            .mockResolvedValueOnce({ totalAc: '100' }) // Meter result
            .mockResolvedValueOnce({ totalDc: '85', avgTemp: '30' }); // Vehicle result

        const result = await service.getPerformance('V123');

        expect(result.vehicleId).toBe('V123');
        expect(result.totalAcKwh).toBe(100);
        expect(result.totalDcKwh).toBe(85);
        expect(result.efficiency).toBe(85.0); // (85/100)*100
        expect(result.avgBatteryTemp).toBe(30);
    });

    it('should handle zero AC consumption safely', async () => {
        mockQueryBuilder.getRawOne
            .mockResolvedValueOnce({ totalAc: '0' })
            .mockResolvedValueOnce({ totalDc: '0', avgTemp: '0' });

        const result = await service.getPerformance('V123');

        expect(result.efficiency).toBe(0);
    });
});
