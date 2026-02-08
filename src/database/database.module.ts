import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MeterReadingHistory,
  VehicleReadingHistory,
  MeterLatestState,
  VehicleLatestState,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MeterReadingHistory,
      VehicleReadingHistory,
      MeterLatestState,
      VehicleLatestState,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
